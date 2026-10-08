import { Token } from '../models/Token.js';
import { Doctor } from '../models/Doctor.js';
import { dispatchSmartNotification } from './notificationService.js';
import { getHospitalDateString } from './timezone.js';

/**
 * Calculates honest ETA range based on doctor's moving average consultation time.
 * @param {Object} doctor Doctor document or mock object
 * @param {number} peopleAhead Number of patients ahead
 * @param {number} remainingCurrent Remaining minutes of current consultation
 */
export const calculateDoctorETA = (doctor, peopleAhead, remainingCurrent = 0) => {
  let avgDuration = doctor?.avgConsultationDuration || doctor?.averageConsultationTime || doctor?.defaultDuration || 10;
  let isFallback = true;

  if (doctor?.recentConsultations && doctor.recentConsultations.length >= 3) {
    const sum = doctor.recentConsultations.reduce((acc, curr) => {
      const val = typeof curr === 'number' ? curr : curr.durationMinutes;
      return acc + (val || 10);
    }, 0);
    avgDuration = Math.max(3, Math.round(sum / doctor.recentConsultations.length));
    isFallback = false;
  }

  const estWait = remainingCurrent + (peopleAhead * avgDuration);
  const minMinutes = Math.max(1, Math.round(estWait * 0.85));
  const maxMinutes = Math.max(2, Math.round(estWait * 1.25));

  return {
    estWait,
    minMinutes,
    maxMinutes,
    text: isFallback && peopleAhead > 0 ? `~${minMinutes}–${maxMinutes} mins (building history)` : `~${minMinutes}–${maxMinutes} mins`,
    isFallback,
    avgDuration,
  };
};

/**
 * Pure calculation function for aging priority and queue position assignment.
 * Anti-starvation score = (priorityRank * 20) - minutesWaited.
 */
export const calculateQueuePositions = (waitingTokens, avgDuration = 10, now = Date.now(), remainingCurrent = 0) => {
  const sorted = [...waitingTokens].sort((a, b) => {
    if (a.priorityRank === 1 && b.priorityRank === 1) {
      return new Date(a.joinedTime || a.queuedAt).getTime() - new Date(b.joinedTime || b.queuedAt).getTime();
    }
    if (a.priorityRank === 1) return -1;
    if (b.priorityRank === 1) return 1;

    const waitA = Math.max(0, Math.floor((now - new Date(a.joinedTime || a.queuedAt).getTime()) / 60000));
    const waitB = Math.max(0, Math.floor((now - new Date(b.joinedTime || b.queuedAt).getTime()) / 60000));

    const scoreA = (a.priorityRank || 5) * 20 - waitA;
    const scoreB = (b.priorityRank || 5) * 20 - waitB;

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return new Date(a.joinedTime || a.queuedAt).getTime() - new Date(b.joinedTime || b.queuedAt).getTime();
  });

  return sorted.map((token, i) => {
    const peopleAhead = i;
    const estWait = remainingCurrent + (peopleAhead * avgDuration);
    const estMin = Math.max(1, Math.round(estWait * 0.85));
    const estMax = Math.max(2, Math.round(estWait * 1.25));

    return {
      ...token,
      queuePosition: i + 1,
      peopleAhead,
      estimatedWaitingTimeMinutes: estWait,
      estimatedWaitMin: estMin,
      estimatedWaitMax: estMax,
      status: (peopleAhead === 0 && token.status === 'Waiting') ? 'Approaching' : token.status,
    };
  });
};

/**
 * Comprehensive database-backed queue recalculation & targeted socket dispatch.
 */
export const recalculateDoctorQueue = async (doctorId, io = null, previousPositionsMap = null) => {
  const todayStr = getHospitalDateString();
  const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
  if (!doctor) return [];

  const etaMeta = calculateDoctorETA(doctor, 0);
  const avgDuration = etaMeta.avgDuration;

  // Active tokens for this doctor today
  const allActiveTokens = await Token.find({
    doctorId,
    dateString: todayStr,
    status: { $in: ['Waiting', 'Approaching', 'Called', 'In Consultation'] },
  });

  const activeCalledOrServing = allActiveTokens.find(
    (t) => t.status === 'In Consultation' || t.status === 'Called'
  );

  const waitingTokens = allActiveTokens.filter(
    (t) => t.status === 'Waiting' || t.status === 'Approaching'
  );

  const now = Date.now();

  // Calculate remaining time of current consultation
  let remainingCurrent = 0;
  if (activeCalledOrServing) {
    if (activeCalledOrServing.status === 'In Consultation' && activeCalledOrServing.consultationStartTime) {
      const elapsed = Math.max(0, Math.floor((now - new Date(activeCalledOrServing.consultationStartTime).getTime()) / 60000));
      remainingCurrent = Math.max(1, avgDuration - elapsed);
    } else {
      remainingCurrent = avgDuration;
    }

    activeCalledOrServing.queuePosition = 0;
    activeCalledOrServing.peopleAhead = 0;
    activeCalledOrServing.estimatedWaitingTimeMinutes = 0;
    activeCalledOrServing.estimatedWaitMin = 0;
    activeCalledOrServing.estimatedWaitMax = 0;
    await activeCalledOrServing.save();
  }

  // Sort waiting tokens using fair priority aging
  waitingTokens.sort((a, b) => {
    if (a.priorityRank === 1 && b.priorityRank === 1) {
      return new Date(a.joinedTime).getTime() - new Date(b.joinedTime).getTime();
    }
    if (a.priorityRank === 1) return -1;
    if (b.priorityRank === 1) return 1;

    const waitA = Math.max(0, Math.floor((now - new Date(a.joinedTime).getTime()) / 60000));
    const waitB = Math.max(0, Math.floor((now - new Date(b.joinedTime).getTime()) / 60000));

    const scoreA = (a.priorityRank || 5) * 20 - waitA;
    const scoreB = (b.priorityRank || 5) * 20 - waitB;

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return new Date(a.joinedTime).getTime() - new Date(b.joinedTime).getTime();
  });

  const updatedWaitingList = [];

  for (let i = 0; i < waitingTokens.length; i++) {
    const token = waitingTokens[i];
    const prevPosition = previousPositionsMap ? previousPositionsMap[token._id.toString()] : null;
    const newPosition = i + 1;
    const peopleAhead = i;

    const estWait = remainingCurrent + (peopleAhead * avgDuration);
    const estMin = Math.max(1, Math.round(estWait * 0.85));
    const estMax = Math.max(2, Math.round(estWait * 1.25));

    token.queuePosition = newPosition;
    token.peopleAhead = peopleAhead;
    token.estimatedWaitingTimeMinutes = estWait;
    token.estimatedWaitMin = estMin;
    token.estimatedWaitMax = estMax;

    if (token.predictedWaitMinutes === 0) {
      token.predictedWaitMinutes = estWait;
    }

    if (peopleAhead === 0 && token.status === 'Waiting') {
      token.status = 'Approaching';
    } else if (peopleAhead > 0 && token.status === 'Approaching') {
      token.status = 'Waiting';
    }

    // Fairness transparency: if a waiting patient's position was moved down due to priority insertion
    if (prevPosition !== null && newPosition > prevPosition && token.priorityRank >= 4) {
      await dispatchSmartNotification({
        userId: token.patientId,
        tokenId: token._id,
        title: 'Queue Position Update',
        message: 'A verified medical priority patient was placed ahead of you in the queue. Your estimated wait time has been updated.',
        type: 'fairness_notice',
        peopleAhead,
        estimatedWaitMins: estWait,
        io,
        doctorName: doctor.userId?.name || 'Doctor',
        roomNumber: doctor.roomNumber || 'Room 101',
        tokenNumber: token.tokenNumber,
      });
    }

    // Step-by-step smart notifications according to patient preference
    const pref = token.notificationPreference || 'every_time';
    if (peopleAhead !== token.lastNotifiedPeopleAhead) {
      let shouldNotify = false;
      let notifTitle = '';
      let notifMsg = '';
      let notifType = 'info';

      if (pref === 'every_time') {
        if (peopleAhead === 0) {
          shouldNotify = true;
          notifTitle = 'You are Next in Line!';
          notifMsg = `You are next in line for Dr. ${doctor.userId?.name || 'your physician'}. Please be ready near ${doctor.roomNumber}.`;
          notifType = 'warning';
        } else if (peopleAhead === 1) {
          shouldNotify = true;
          notifTitle = '1 Patient Remaining';
          notifMsg = `Only 1 patient remains ahead of you in the queue for ${doctor.roomNumber}.`;
          notifType = 'warning';
        } else if (peopleAhead <= 5) {
          shouldNotify = true;
          notifTitle = `${peopleAhead} Patients Ahead`;
          notifMsg = `There are ${peopleAhead} patients ahead of you in line (Est. wait: ~${estMin}–${estMax} mins).`;
          notifType = 'info';
        }
      } else if (pref === 'when_next' && peopleAhead === 0) {
        shouldNotify = true;
        notifTitle = 'You are Next in Line!';
        notifMsg = `You are next in line for Dr. ${doctor.userId?.name || 'your physician'}. Please proceed near ${doctor.roomNumber}.`;
        notifType = 'warning';
      }

      if (shouldNotify) {
        await dispatchSmartNotification({
          userId: token.patientId,
          tokenId: token._id,
          title: notifTitle,
          message: notifMsg,
          type: notifType,
          peopleAhead,
          estimatedWaitMins: estWait,
          io,
          doctorName: doctor.userId?.name || 'Doctor',
          roomNumber: doctor.roomNumber || 'Room 101',
          tokenNumber: token.tokenNumber,
        });
        token.lastNotifiedPeopleAhead = peopleAhead;
      }
    }

    await token.save();
    updatedWaitingList.push(token);
  }

  // Targeted Socket broadcasts
  if (io) {
    const nextWaiting = updatedWaitingList.length > 0 ? updatedWaitingList[0] : null;

    // 1. Doctor Room
    io.to(`doctor_${doctorId}`).emit('doctor_queue_updated', {
      doctorId,
      currentToken: activeCalledOrServing || null,
      waitingList: updatedWaitingList,
      totalWaiting: updatedWaitingList.length,
    });

    // 2. Staff Room
    io.to('staff').emit('staff_queue_updated', {
      doctorId,
      totalWaiting: updatedWaitingList.length,
      currentTokenNumber: activeCalledOrServing?.tokenNumber || '--',
    });

    // 3. Department Room
    if (doctor.departmentId) {
      io.to(`department_${doctor.departmentId}`).emit('dept_queue_updated', {
        departmentId: doctor.departmentId,
        doctorId,
      });
    }

    // 4. Privacy-Safe Public Display Broadcast
    io.to('public_display').emit('public_display_updated', {
      doctorId,
      roomNumber: doctor.roomNumber,
      doctorName: doctor.userId?.name || 'Doctor',
      doctorStatus: doctor.status,
      nowServing: activeCalledOrServing ? activeCalledOrServing.tokenNumber : '--',
      nextToken: nextWaiting ? nextWaiting.tokenNumber : '--',
      patientsWaiting: updatedWaitingList.length,
      estimatedWaitingTimeMinutes: updatedWaitingList.length * avgDuration,
      lastUpdated: new Date().toISOString(),
    });

    // Backwards-compatible general queue update event
    io.emit('queue_updated', { doctorId });
  }

  return {
    currentToken: activeCalledOrServing || null,
    waitingList: updatedWaitingList,
  };
};
