import { Token } from '../models/Token.js';
import { QueueCounter } from '../models/QueueCounter.js';
import { Doctor } from '../models/Doctor.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { QueueHistory } from '../models/QueueHistory.js';
import { Appointment } from '../models/Appointment.js';
import { recalculateDoctorQueue } from '../utils/queueCalculations.js';
import { dispatchSmartNotification } from '../utils/notificationService.js';
import { detectUrgentSymptoms } from '../utils/triageDetector.js';
import { getHospitalDateString } from '../utils/timezone.js';
import { logAudit } from '../utils/auditLogger.js';

export const calculateAgeFromDOB = (dob) => {
  if (!dob) return 30;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

// Generate Digital Token (Patient or Receptionist)
export const joinQueue = async (req, res) => {
  try {
    const {
      doctorId,
      departmentId,
      reasonForVisit,
      symptomsDuration,
      existingConditions,
      patientIdOverride,
      name,
      age,
      gender,
      mobile,
      emergencyContact,
      priority,
      priorityReason,
    } = req.body;

    if (!reasonForVisit || !reasonForVisit.trim()) {
      return res.status(400).json({ message: 'Reason for visit / Illness symptoms is mandatory' });
    }

    // Security: Patient Identity Protection
    // Patients CANNOT override patientId to act on someone else's behalf
    let effectivePatientId = req.user._id;
    if ((req.user.role === 'receptionist' || req.user.role === 'admin') && patientIdOverride) {
      effectivePatientId = patientIdOverride;
    }

    const patientUser = await User.findById(effectivePatientId);
    if (!patientUser) {
      return res.status(404).json({ message: 'Patient account not found' });
    }

    // Multi-Doctor Resolution
    let selectedDoctor = null;
    if (doctorId) {
      selectedDoctor = await Doctor.findById(doctorId).populate('userId').populate('departmentId');
    } else if (departmentId) {
      selectedDoctor = await Doctor.findOne({ departmentId, activeStatus: true }).populate('userId').populate('departmentId');
    } else {
      selectedDoctor = await Doctor.findOne({ activeStatus: true }).populate('userId').populate('departmentId');
    }

    if (!selectedDoctor || !selectedDoctor.activeStatus) {
      return res.status(400).json({ message: 'Selected doctor is currently unavailable for OPD consultation.' });
    }

    const todayStr = getHospitalDateString();

    // Check duplicate active token today for this specific doctor
    const existingToken = await Token.findOne({
      patientId: effectivePatientId,
      doctorId: selectedDoctor._id,
      dateString: todayStr,
      status: { $in: ['Waiting', 'Approaching', 'Called', 'In Consultation'] },
    });

    if (existingToken) {
      return res.status(400).json({
        message: `You already have an active token (${existingToken.tokenNumber}) for Dr. ${selectedDoctor.userId?.name || 'this doctor'} today.`,
        token: existingToken,
      });
    }

    // Daily sequence counter specific to this doctor
    const counter = await QueueCounter.findOneAndUpdate(
      { doctorId: selectedDoctor._id, dateString: todayStr },
      { $inc: { lastSequence: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = counter.lastSequence;
    const prefix = selectedDoctor.departmentId?.tokenPrefix || 'T';
    const tokenNumber = `${prefix}-${seqNum.toString().padStart(3, '0')}`;

    // Security: Normal patients CANNOT self-assign priority!
    let selectedPriority = 'Normal';
    let priorityRank = 5;
    let effectivePriorityReason = '';

    if (req.user.role === 'receptionist' || req.user.role === 'admin') {
      if (priority && ['Emergency', 'Urgent', 'Pregnant', 'Disability', 'Senior', 'Pediatric', 'Normal'].includes(priority)) {
        selectedPriority = priority;
        const rankMap = { Emergency: 1, Urgent: 2, Pregnant: 2, Disability: 3, Senior: 4, Pediatric: 4, Normal: 5 };
        priorityRank = rankMap[selectedPriority] || 5;
        effectivePriorityReason = priorityReason || 'Assigned by Receptionist';
      }
    }

    const patientAgeVal = patientUser.dob
      ? calculateAgeFromDOB(patientUser.dob)
      : Number(age) || 30;

    // Optional safe triage screening
    const triageCheck = detectUrgentSymptoms(reasonForVisit);

    const newToken = await Token.create({
      tokenNumber,
      sequenceNumber: seqNum,
      patientId: effectivePatientId,
      doctorId: selectedDoctor._id,
      departmentId: selectedDoctor.departmentId?._id || selectedDoctor.departmentId,
      patientName: name ? String(name).trim() : patientUser.name,
      patientAge: patientAgeVal,
      patientGender: gender || patientUser.gender || 'Male',
      patientMobile: mobile ? String(mobile).trim() : patientUser.mobile || '',
      reasonForVisit: String(reasonForVisit).trim(),
      symptomsDuration: symptomsDuration ? String(symptomsDuration).trim() : '1-2 days',
      existingConditions: existingConditions ? String(existingConditions).trim() : 'None',
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : patientUser.emergencyContact || '',
      priority: selectedPriority,
      priorityRank,
      priorityReason: effectivePriorityReason,
      status: 'Waiting',
      joinedTime: new Date(),
      dateString: todayStr,
      isUrgentFlagged: triageCheck.isUrgentFlagged,
      triageNote: triageCheck.flagReason,
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'TOKEN_ISSUED',
      targetType: 'Token',
      targetId: newToken._id,
      targetTokenNumber: tokenNumber,
      details: `Digital token ${tokenNumber} generated for Dr. ${selectedDoctor.userId?.name || ''} (${selectedDoctor.roomNumber}). Priority: ${selectedPriority}`,
      req,
    });

    const io = req.app.get('socketio');
    await recalculateDoctorQueue(selectedDoctor._id, io);

    const updatedToken = await Token.findById(newToken._id)
      .populate('doctorId')
      .populate('departmentId');

    // Create In-App Notification
    await dispatchSmartNotification({
      userId: effectivePatientId,
      tokenId: newToken._id,
      title: 'Digital Token Issued',
      message: `Token ${tokenNumber} issued for Dr. ${selectedDoctor.userId?.name || 'Physician'} (${selectedDoctor.roomNumber}).`,
      type: 'success',
      peopleAhead: updatedToken.peopleAhead,
      estimatedWaitMins: updatedToken.estimatedWaitingTimeMinutes,
      io,
      doctorName: selectedDoctor.userId?.name || 'Doctor',
      roomNumber: selectedDoctor.roomNumber,
      tokenNumber,
    });

    res.status(201).json(updatedToken);
  } catch (error) {
    console.error('[Join Queue Error]:', error);
    res.status(500).json({ message: error.message });
  }
};

// Doctor Action: Call Next Patient (Atomic Concurrency Safe)
export const callNextPatient = async (req, res) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    } else if (req.user.role === 'receptionist' || req.user.role === 'admin') {
      doctor = await Doctor.findById(req.body.doctorId);
    }

    if (!doctor) return res.status(404).json({ message: 'Doctor record not found' });

    const doctorId = doctor._id;
    const todayStr = getHospitalDateString();
    const io = req.app.get('socketio');

    // Concurrency Lock: Prevent double active calls
    const activeInConsultation = await Token.findOne({
      doctorId,
      dateString: todayStr,
      status: { $in: ['In Consultation', 'Called'] },
    });

    if (activeInConsultation) {
      return res.status(400).json({
        message: `Patient ${activeInConsultation.tokenNumber} is already in ${activeInConsultation.status} status. Please complete or attend the active patient first.`,
      });
    }

    // Find next waiting patient ordered by fair priority & aging
    const waitingTokens = await Token.find({
      doctorId,
      dateString: todayStr,
      status: { $in: ['Waiting', 'Approaching'] },
    });

    if (waitingTokens.length === 0) {
      doctor.status = 'Available';
      await doctor.save();
      if (io) {
        io.to(`doctor_${doctor._id}`).emit('doctor_status_changed', { doctorId: doctor._id, status: doctor.status });
      }
      return res.json({ message: 'No waiting patients in queue.', calledToken: null });
    }

    // Sort by fair aging score
    const now = Date.now();
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
      if (scoreA !== scoreB) return scoreA - scoreB;
      return new Date(a.joinedTime).getTime() - new Date(b.joinedTime).getTime();
    });

    const targetToken = waitingTokens[0];

    // Atomic update from Waiting -> Called
    const calledToken = await Token.findOneAndUpdate(
      {
        _id: targetToken._id,
        status: { $in: ['Waiting', 'Approaching'] },
      },
      {
        $set: {
          status: 'Called',
          calledAt: new Date(),
          calledExpiresAt: new Date(Date.now() + 120 * 1000), // 2-minute server-side timeout
        },
      },
      { new: true }
    );

    if (!calledToken) {
      return res.status(409).json({ message: 'Conflict: Patient was already called or status changed by another request.' });
    }

    doctor.status = 'Calling Next Patient';
    await doctor.save();

    if (calledToken.appointmentId) {
      await Appointment.findByIdAndUpdate(calledToken.appointmentId, {
        status: 'Called',
        calledTime: new Date(),
      });
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PATIENT_CALLED',
      targetType: 'Token',
      targetId: calledToken._id,
      targetTokenNumber: calledToken.tokenNumber,
      previousState: 'Waiting',
      newState: 'Called',
      details: `Doctor called patient ${calledToken.tokenNumber} to ${doctor.roomNumber}. 2-minute timeout window initiated.`,
      req,
    });

    const notifMsg = `The doctor has called you! Please proceed immediately to Consultation ${doctor.roomNumber} (Token ${calledToken.tokenNumber}).`;

    await dispatchSmartNotification({
      userId: calledToken.patientId,
      tokenId: calledToken._id,
      title: 'YOUR TURN CALL',
      message: notifMsg,
      type: 'turn_alert',
      isTurnAlert: true,
      doctorName: doctor.userId?.name || 'Your Doctor',
      roomNumber: doctor.roomNumber,
      tokenNumber: calledToken.tokenNumber,
      io,
    });

    await recalculateDoctorQueue(doctorId, io);

    res.json({ message: `Patient ${calledToken.tokenNumber} called.`, calledToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Doctor Action: Confirm Patient Attended / Arrived (Step 2)
export const patientAttended = async (req, res) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    } else if (req.user.role === 'receptionist' || req.user.role === 'admin') {
      doctor = await Doctor.findById(req.body.doctorId);
    }

    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const doctorId = doctor._id;
    const todayStr = getHospitalDateString();
    const io = req.app.get('socketio');

    const calledToken = await Token.findOneAndUpdate(
      {
        doctorId,
        dateString: todayStr,
        status: 'Called',
      },
      {
        $set: {
          status: 'In Consultation',
          consultationStartTime: new Date(),
          calledExpiresAt: null, // Clear missed call timeout
        },
      },
      { new: true }
    );

    if (!calledToken) {
      return res.status(404).json({ message: 'No patient is currently in Called status' });
    }

    doctor.status = 'In Consultation';
    await doctor.save();

    if (calledToken.appointmentId) {
      await Appointment.findByIdAndUpdate(calledToken.appointmentId, {
        status: 'In Consultation',
        consultationStartTime: new Date(),
      });
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PATIENT_ATTENDED',
      targetType: 'Token',
      targetId: calledToken._id,
      targetTokenNumber: calledToken.tokenNumber,
      previousState: 'Called',
      newState: 'In Consultation',
      details: `Patient physically arrived. Consultation started.`,
      req,
    });

    await recalculateDoctorQueue(doctorId, io);

    res.json({ message: `Patient ${calledToken.tokenNumber} has physically arrived. Consultation started.`, token: calledToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Doctor Action: End Consultation & Optionally Call Next (Step 3)
export const endConsultation = async (req, res) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    } else if (req.user.role === 'receptionist' || req.user.role === 'admin') {
      doctor = await Doctor.findById(req.body.doctorId);
    }

    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const doctorId = doctor._id;
    const todayStr = getHospitalDateString();
    const io = req.app.get('socketio');

    const activeToken = await Token.findOne({
      doctorId,
      dateString: todayStr,
      status: { $in: ['In Consultation', 'Called'] },
    });

    if (!activeToken) {
      return res.status(404).json({ message: 'No active consultation token to end.' });
    }

    const endTime = new Date();
    activeToken.status = 'Completed';
    activeToken.consultationEndTime = endTime;

    const startTime = activeToken.consultationStartTime || activeToken.calledAt || activeToken.joinedTime;
    const durationMins = Math.max(1, Math.round((endTime.getTime() - new Date(startTime).getTime()) / (1000 * 60)));
    activeToken.consultationDurationMinutes = durationMins;

    const waitMins = Math.max(0, Math.round((endTime.getTime() - new Date(activeToken.joinedTime).getTime()) / (1000 * 60)));
    const { consultationNotes, diagnosis, prescription } = req.body || {};
    if (consultationNotes) activeToken.consultationNotes = consultationNotes;
    if (diagnosis) activeToken.diagnosis = diagnosis;
    if (prescription) activeToken.prescription = prescription;

    await activeToken.save();

    // Record Queue History
    await QueueHistory.create({
      tokenId: activeToken._id,
      tokenNumber: activeToken.tokenNumber,
      patientId: activeToken.patientId,
      doctorId: activeToken.doctorId,
      departmentId: activeToken.departmentId || doctor.departmentId,
      priority: activeToken.priority,
      status: 'Completed',
      joinedTime: activeToken.joinedTime,
      calledTime: activeToken.calledAt,
      completedTime: endTime,
      waitingDurationMinutes: waitMins,
      predictedWaitMinutes: activeToken.predictedWaitMinutes || 0,
      consultationDurationMinutes: durationMins,
      consultationNotes: consultationNotes || activeToken.consultationNotes || '',
      diagnosis: diagnosis || activeToken.diagnosis || '',
      prescription: prescription || activeToken.prescription || '',
      appointmentId: activeToken.appointmentId || null,
      dateString: todayStr,
    });

    if (activeToken.appointmentId) {
      await Appointment.findByIdAndUpdate(activeToken.appointmentId, {
        status: 'Completed',
        completedTime: endTime,
        consultationNotes: consultationNotes || activeToken.consultationNotes || '',
        diagnosis: diagnosis || activeToken.diagnosis || '',
        prescription: prescription || activeToken.prescription || '',
      });
    }

    // Update Doctor historical metrics
    doctor.totalCompletedConsultations += 1;
    doctor.totalConsultationTimeMinutes += durationMins;

    // Track last 20 consultations for moving average ETA
    if (!doctor.recentConsultations) doctor.recentConsultations = [];
    doctor.recentConsultations.push({ durationMinutes: durationMins, completedAt: endTime });
    if (doctor.recentConsultations.length > 20) {
      doctor.recentConsultations.shift();
    }

    const sumRecent = doctor.recentConsultations.reduce((acc, c) => acc + c.durationMinutes, 0);
    doctor.avgConsultationDuration = Math.max(3, Math.round(sumRecent / doctor.recentConsultations.length));
    doctor.status = 'Available';
    await doctor.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CONSULTATION_COMPLETED',
      targetType: 'Token',
      targetId: activeToken._id,
      targetTokenNumber: activeToken.tokenNumber,
      previousState: 'In Consultation',
      newState: 'Completed',
      details: `Consultation completed in ${durationMins} minutes. Total wait was ${waitMins} minutes.`,
      req,
    });

    const completedNotifMsg = `Your consultation for Token ${activeToken.tokenNumber} has been completed successfully. Wishing you good health!`;

    await dispatchSmartNotification({
      userId: activeToken.patientId,
      tokenId: activeToken._id,
      title: 'Consultation Completed',
      message: completedNotifMsg,
      type: 'success',
      io,
      tokenNumber: activeToken.tokenNumber,
    });

    if (io) {
      io.to(`patient_${activeToken.patientId}`).emit('consultation_completed', {
        tokenNumber: activeToken.tokenNumber,
        message: completedNotifMsg,
      });
    }

    await recalculateDoctorQueue(doctorId, io);

    const autoCall = req.body?.autoCall !== false;
    let nextCalledToken = null;

    if (autoCall) {
      // Auto call next patient
      const nextWaiting = await Token.find({
        doctorId,
        dateString: todayStr,
        status: { $in: ['Waiting', 'Approaching'] },
      });

      if (nextWaiting.length > 0) {
        // Fair sorting
        const now = Date.now();
        nextWaiting.sort((a, b) => {
          if (a.priorityRank === 1 && b.priorityRank === 1) return new Date(a.joinedTime).getTime() - new Date(b.joinedTime).getTime();
          if (a.priorityRank === 1) return -1;
          if (b.priorityRank === 1) return 1;
          const waitA = Math.max(0, Math.floor((now - new Date(a.joinedTime).getTime()) / 60000));
          const waitB = Math.max(0, Math.floor((now - new Date(b.joinedTime).getTime()) / 60000));
          const sA = (a.priorityRank || 5) * 20 - waitA;
          const sB = (b.priorityRank || 5) * 20 - waitB;
          return sA - sB;
        });

        const targetNext = nextWaiting[0];
        const calledNext = await Token.findOneAndUpdate(
          { _id: targetNext._id, status: { $in: ['Waiting', 'Approaching'] } },
          {
            $set: {
              status: 'Called',
              calledAt: new Date(),
              calledExpiresAt: new Date(Date.now() + 120 * 1000),
            },
          },
          { new: true }
        );

        if (calledNext) {
          doctor.status = 'Calling Next Patient';
          await doctor.save();
          nextCalledToken = calledNext;

          await dispatchSmartNotification({
            userId: calledNext.patientId,
            tokenId: calledNext._id,
            title: 'YOUR TURN CALL',
            message: `The doctor has called you! Please proceed immediately to Consultation ${doctor.roomNumber} (Token ${calledNext.tokenNumber}).`,
            type: 'turn_alert',
            isTurnAlert: true,
            doctorName: doctor.userId?.name || 'Your Doctor',
            roomNumber: doctor.roomNumber,
            tokenNumber: calledNext.tokenNumber,
            io,
          });

          await recalculateDoctorQueue(doctorId, io);
        }
      }
    }

    res.json({
      message: `Consultation for ${activeToken.tokenNumber} completed.`,
      completedToken: activeToken,
      nextCalledToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const finishConsultationAndCallNext = endConsultation;

// Get Doctor Queue Details (Doctor or Receptionist)
export const getDoctorQueue = async (req, res) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id }).populate('userId', 'name email mobile');
    } else if (req.query.doctorId) {
      doctor = await Doctor.findById(req.query.doctorId).populate('userId', 'name email mobile');
    } else {
      doctor = await Doctor.findOne({ activeStatus: true }).populate('userId', 'name email mobile');
    }

    if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });

    const todayStr = getHospitalDateString();

    const tokens = await Token.find({
      doctorId: doctor._id,
      dateString: todayStr,
      status: { $in: ['Waiting', 'Approaching', 'Called', 'In Consultation'] },
    });

    const currentToken = tokens.find((t) => t.status === 'In Consultation' || t.status === 'Called') || null;
    const waitingList = tokens.filter((t) => t.status === 'Waiting' || t.status === 'Approaching');

    // Fair sort waiting list
    const now = Date.now();
    waitingList.sort((a, b) => {
      if (a.priorityRank === 1 && b.priorityRank === 1) return new Date(a.joinedTime).getTime() - new Date(b.joinedTime).getTime();
      if (a.priorityRank === 1) return -1;
      if (b.priorityRank === 1) return 1;
      const waitA = Math.max(0, Math.floor((now - new Date(a.joinedTime).getTime()) / 60000));
      const waitB = Math.max(0, Math.floor((now - new Date(b.joinedTime).getTime()) / 60000));
      const sA = (a.priorityRank || 5) * 20 - waitA;
      const sB = (b.priorityRank || 5) * 20 - waitB;
      return sA - sB;
    });

    const completedToday = await Token.countDocuments({
      doctorId: doctor._id,
      dateString: todayStr,
      status: 'Completed',
    });

    res.json({
      doctor,
      currentToken,
      waitingList,
      totalWaiting: waitingList.length,
      completedToday,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Patient Active Token (with People Ahead, ETA Range & Doctor Info)
export const getPatientActiveToken = async (req, res) => {
  try {
    const todayStr = getHospitalDateString();

    const token = await Token.findOne({
      patientId: req.user._id,
      dateString: todayStr,
      status: { $in: ['Waiting', 'Approaching', 'Called', 'In Consultation'] },
    })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .populate('departmentId', 'name code tokenPrefix');

    if (!token) {
      return res.json({
        activeToken: null,
        currentTokenBeingServed: '--',
        totalWaitingPatients: 0,
        doctorStatus: 'Available',
        roomNumber: 'OPD Room',
        doctorName: 'Attending Physician',
        avgConsultationDuration: 10,
      });
    }

    const doctor = token.doctorId;

    const activeServingToken = await Token.findOne({
      doctorId: doctor?._id,
      dateString: todayStr,
      status: { $in: ['In Consultation', 'Called'] },
    });

    const totalWaitingPatients = await Token.countDocuments({
      doctorId: doctor?._id,
      dateString: todayStr,
      status: { $in: ['Waiting', 'Approaching'] },
    });

    res.json({
      activeToken: {
        ...token.toObject(),
        peopleAhead: token.peopleAhead || 0,
        queuePosition: token.queuePosition || 1,
        estimatedWaitingTimeMinutes: token.estimatedWaitingTimeMinutes || 0,
        estimatedWaitMin: token.estimatedWaitMin || Math.max(1, Math.round((token.estimatedWaitingTimeMinutes || 0) * 0.85)),
        estimatedWaitMax: token.estimatedWaitMax || Math.max(2, Math.round((token.estimatedWaitingTimeMinutes || 0) * 1.25)),
      },
      currentTokenBeingServed: activeServingToken ? activeServingToken.tokenNumber : '--',
      totalWaitingPatients,
      doctorStatus: doctor?.status || 'Available',
      roomNumber: doctor?.roomNumber || 'Room 101',
      doctorName: doctor?.userId?.name || 'Physician',
      avgConsultationDuration: doctor?.avgConsultationDuration || 10,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public Live Queue Display Data (Privacy-Safe: Zero Patient PII)
export const getPublicQueueDisplay = async (req, res) => {
  try {
    const todayStr = getHospitalDateString();
    const { doctorId } = req.query;

    let doctor = null;
    if (doctorId) {
      doctor = await Doctor.findById(doctorId).populate('userId', 'name').populate('departmentId', 'name');
    } else {
      doctor = await Doctor.findOne({ activeStatus: true }).populate('userId', 'name').populate('departmentId', 'name');
    }

    const activeTokens = await Token.find({
      doctorId: doctor?._id,
      dateString: todayStr,
      status: { $in: ['Waiting', 'Approaching', 'Called', 'In Consultation'] },
    }).select('tokenNumber status priority sequenceNumber joinedTime priorityRank');

    const current = activeTokens.find((t) => t.status === 'In Consultation' || t.status === 'Called');
    const waiting = activeTokens.filter((t) => t.status === 'Waiting' || t.status === 'Approaching');

    // Sort waiting
    const now = Date.now();
    waiting.sort((a, b) => {
      if (a.priorityRank === 1 && b.priorityRank === 1) return new Date(a.joinedTime).getTime() - new Date(b.joinedTime).getTime();
      if (a.priorityRank === 1) return -1;
      if (b.priorityRank === 1) return 1;
      const waitA = Math.max(0, Math.floor((now - new Date(a.joinedTime).getTime()) / 60000));
      const waitB = Math.max(0, Math.floor((now - new Date(b.joinedTime).getTime()) / 60000));
      const sA = (a.priorityRank || 5) * 20 - waitA;
      const sB = (b.priorityRank || 5) * 20 - waitB;
      return sA - sB;
    });

    const nextToken = waiting.length > 0 ? waiting[0] : null;
    const totalRegisteredToday = await Token.countDocuments({ doctorId: doctor?._id, dateString: todayStr });

    // Safe Public Output ONLY
    res.json({
      hospitalName: 'MediQueue Hospital',
      doctorName: doctor?.userId?.name || 'Physician',
      qualification: doctor?.qualification || 'MD',
      specialization: doctor?.specialization || 'Consultant Specialist',
      roomNumber: doctor?.roomNumber || 'Room 101',
      doctorStatus: doctor?.status || 'Available',
      avgConsultationDuration: doctor?.avgConsultationDuration || 10,
      nowServing: current ? current.tokenNumber : 'No Active Patient',
      nextToken: nextToken ? nextToken.tokenNumber : 'None',
      patientsWaiting: waiting.length,
      totalRegisteredToday,
      estimatedWaitingTimeMinutes: waiting.length * (doctor?.avgConsultationDuration || 10),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel Token
export const cancelToken = async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found.' });

    // Security: Patient can only cancel their own token. Receptionist/Admin can cancel any token.
    if (token.patientId.toString() !== req.user._id.toString() && req.user.role !== 'receptionist' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this token.' });
    }

    // Safety: Completed tokens can NEVER be cancelled!
    if (token.status === 'Completed') {
      return res.status(400).json({ message: 'A completed consultation token cannot be cancelled.' });
    }

    const previousStatus = token.status;
    token.status = 'Cancelled';
    await token.save();

    await QueueHistory.create({
      tokenId: token._id,
      tokenNumber: token.tokenNumber,
      patientId: token.patientId,
      doctorId: token.doctorId,
      departmentId: token.departmentId,
      priority: token.priority,
      status: 'Cancelled',
      joinedTime: token.joinedTime,
      completedTime: new Date(),
      dateString: token.dateString,
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'TOKEN_CANCELLED',
      targetType: 'Token',
      targetId: token._id,
      targetTokenNumber: token.tokenNumber,
      previousState: previousStatus,
      newState: 'Cancelled',
      details: `Token cancelled by ${req.user.role}`,
      req,
    });

    const io = req.app.get('socketio');
    await recalculateDoctorQueue(token.doctorId, io);

    res.json({ message: 'Token cancelled successfully.', token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientQueueHistory = async (req, res) => {
  try {
    const history = await QueueHistory.find({ patientId: req.user._id })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNotificationPreference = async (req, res) => {
  try {
    const { preference } = req.body;
    const allowed = ['every_time', 'when_next', 'tracking'];
    if (!allowed.includes(preference)) {
      return res.status(400).json({ message: 'Invalid notification preference option.' });
    }

    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Token not found.' });

    if (token.patientId.toString() !== req.user._id.toString() && req.user.role !== 'receptionist') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    token.notificationPreference = preference;
    await token.save();

    res.json({ message: 'Notification preference saved.', token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Handle Patient Call Skip / Timeout (Doctor or Receptionist Action)
export const handleMissedCallTimeout = async (req, res) => {
  try {
    const { id } = req.params;
    const token = await Token.findById(id).populate('doctorId');
    if (!token) return res.status(404).json({ message: 'Token not found.' });

    if (token.status !== 'Called') {
      return res.json({ message: 'Token is not in Called status', token });
    }

    const doctor = token.doctorId;
    const todayStr = token.dateString || getHospitalDateString();
    const currentMissed = (token.missedCount || 0) + 1;
    token.missedCount = currentMissed;

    if (currentMissed < 2) {
      const lastWaiting = await Token.findOne({
        doctorId: token.doctorId._id,
        dateString: todayStr,
        status: { $in: ['Waiting', 'Approaching'] },
      }).sort({ joinedTime: -1 });

      const newJoinedTime = lastWaiting
        ? new Date(new Date(lastWaiting.joinedTime).getTime() + 1000)
        : new Date(Date.now() + 1000);

      token.status = 'Waiting';
      token.joinedTime = newJoinedTime;
      token.requeuedAt = new Date();
      token.calledAt = null;
      token.calledExpiresAt = null;
      token.priorityRank = 5;
      await token.save();

      if (doctor) {
        doctor.status = 'Available';
        await doctor.save();
      }

      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'PATIENT_SKIPPED',
        targetType: 'Token',
        targetId: token._id,
        targetTokenNumber: token.tokenNumber,
        previousState: 'Called',
        newState: 'Waiting',
        details: `Doctor skipped/timed-out patient. Re-queued at end.`,
        req,
      });
    } else {
      token.status = 'Missed';
      token.calledAt = null;
      token.calledExpiresAt = null;
      await token.save();

      if (doctor) {
        doctor.status = 'Available';
        await doctor.save();
      }

      await QueueHistory.create({
        tokenId: token._id,
        tokenNumber: token.tokenNumber,
        patientId: token.patientId,
        doctorId: token.doctorId._id,
        departmentId: token.departmentId,
        priority: token.priority,
        status: 'Missed',
        joinedTime: token.joinedTime,
        completedTime: new Date(),
        dateString: todayStr,
      });

      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CALL_TIMEOUT_MISSED',
        targetType: 'Token',
        targetId: token._id,
        targetTokenNumber: token.tokenNumber,
        previousState: 'Called',
        newState: 'Missed',
        details: `Patient skipped twice. Marked Missed.`,
        req,
      });
    }

    const io = req.app.get('socketio');
    await recalculateDoctorQueue(token.doctorId._id, io);

    res.json({ message: 'Patient skipped and queue updated.', token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorQueueHistory = async (req, res) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    } else if (req.query.doctorId) {
      doctor = await Doctor.findById(req.query.doctorId);
    }

    const filter = {};
    if (doctor) filter.doctorId = doctor._id;

    const history = await QueueHistory.find(filter)
      .populate('patientId', 'name patientId mobile gender dob')
      .populate('departmentId', 'name code')
      .sort({ completedTime: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReceptionistQueueHistory = async (req, res) => {
  try {
    const { dateString, departmentId } = req.query;
    const filter = {};
    if (dateString) filter.dateString = dateString;
    if (departmentId) filter.departmentId = departmentId;

    const history = await QueueHistory.find(filter)
      .populate('patientId', 'name patientId mobile gender dob')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .populate('departmentId', 'name code')
      .sort({ completedTime: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
