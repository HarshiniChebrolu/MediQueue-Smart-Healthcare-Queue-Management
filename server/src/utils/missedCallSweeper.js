import { Token } from '../models/Token.js';
import { Doctor } from '../models/Doctor.js';
import { Notification } from '../models/Notification.js';
import { QueueHistory } from '../models/QueueHistory.js';
import { recalculateDoctorQueue } from './queueCalculations.js';
import { logAudit } from './auditLogger.js';
import { getHospitalDateString } from './timezone.js';

let sweeperInterval = null;

export const startMissedCallSweeper = (io) => {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
  }

  // Run sweeper every 10 seconds
  sweeperInterval = setInterval(async () => {
    try {
      const now = new Date();
      const expiredTokens = await Token.find({
        status: 'Called',
        calledExpiresAt: { $lte: now },
      }).populate('doctorId');

      for (const token of expiredTokens) {
        const doctor = token.doctorId;
        const currentMissedCount = (token.missedCount || 0) + 1;
        token.missedCount = currentMissedCount;
        const todayStr = token.dateString || getHospitalDateString();

        if (currentMissedCount < 2) {
          // Miss 1: Auto Re-queue to end of active waiting queue
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
          token.priorityRank = 5; // Demote to standard rank on missed call
          await token.save();

          if (doctor) {
            doctor.status = 'Available';
            await doctor.save();
          }

          const notifMsg = `You missed your turn call for Token ${token.tokenNumber} (Miss 1/2). Your token has been re-queued to the end of the line.`;
          const notif = await Notification.create({
            userId: token.patientId,
            tokenId: token._id,
            title: 'Turn Missed — Re-queued',
            message: notifMsg,
            type: 'warning',
            channel: 'in_app',
            deliveryLogs: [
              { channel: 'in_app', status: 'DELIVERED', detail: 'System Missed-Call Sweeper re-queue' },
            ],
          });

          if (io) {
            io.to(`patient_${token.patientId}`).emit('notification', notif);
          }

          await logAudit({
            userName: 'System Sweeper',
            userRole: 'system',
            action: 'CALL_TIMEOUT_REQUEUED',
            targetType: 'Token',
            targetId: token._id,
            targetTokenNumber: token.tokenNumber,
            previousState: 'Called',
            newState: 'Waiting',
            details: `Patient failed to respond within 2-minute timeout window. Miss count: ${currentMissedCount}/2. Token re-queued to end.`,
          });
        } else {
          // Miss 2: Final Missed state — requires receptionist intervention
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

          const notifMsg = `You missed your consultation call twice for Token ${token.tokenNumber}. Status is now MISSED. Please visit the Reception desk to be re-admitted.`;
          const notif = await Notification.create({
            userId: token.patientId,
            tokenId: token._id,
            title: 'Turn Missed — Action Required',
            message: notifMsg,
            type: 'warning',
            channel: 'in_app',
            deliveryLogs: [
              { channel: 'in_app', status: 'DELIVERED', detail: 'System Missed-Call Sweeper marked MISSED' },
            ],
          });

          if (io) {
            io.to(`patient_${token.patientId}`).emit('notification', notif);
            io.to('staff').emit('patient_missed_alert', {
              tokenId: token._id,
              tokenNumber: token.tokenNumber,
              patientName: token.patientName,
            });
          }

          await logAudit({
            userName: 'System Sweeper',
            userRole: 'system',
            action: 'CALL_TIMEOUT_MISSED',
            targetType: 'Token',
            targetId: token._id,
            targetTokenNumber: token.tokenNumber,
            previousState: 'Called',
            newState: 'Missed',
            details: `Patient missed turn 2 times. Token marked Missed. Receptionist intervention required.`,
          });
        }

        // Recalculate doctor queue after state transition
        await recalculateDoctorQueue(token.doctorId._id, io);
      }
    } catch (error) {
      console.error('[MissedCallSweeper Error]:', error.message);
    }
  }, 10000);

  console.log('[MediQueue] Server-Side Missed Call Sweeper initialized (10s interval).');
};

export const stopMissedCallSweeper = () => {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
    sweeperInterval = null;
  }
};
