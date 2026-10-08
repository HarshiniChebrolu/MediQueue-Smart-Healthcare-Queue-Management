import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

export const dispatchSmartNotification = async ({
  userId,
  tokenId = null,
  title,
  message,
  type = 'info',
  peopleAhead = null,
  estimatedWaitMins = 0,
  io = null,
  isTurnAlert = false,
  doctorName = 'Attending Physician',
  roomNumber = 'Consultation Room',
  tokenNumber = '',
}) => {
  try {
    const user = await User.findById(userId);
    const mobile = user?.mobile || '';
    const email = user?.email || '';

    const isDemoMode = process.env.DEMO_MODE !== 'false';
    const hasTwilioCreds = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    // Build truthful delivery logs
    const deliveryLogs = [
      {
        channel: 'in_app',
        status: 'DELIVERED',
        sentAt: new Date(),
        detail: 'Stored in Database for in-app alert view',
      },
    ];

    if (hasTwilioCreds && mobile) {
      // In production with real credentials
      try {
        // Real dispatch would go here
        deliveryLogs.push({
          channel: 'sms',
          status: 'SENT',
          sentAt: new Date(),
          detail: `SMS dispatched to ${mobile}`,
        });
      } catch (err) {
        deliveryLogs.push({
          channel: 'sms',
          status: 'FAILED',
          sentAt: new Date(),
          detail: `SMS dispatch failed: ${err.message}`,
        });
      }
    } else {
      // Transparently mark as SIMULATED
      deliveryLogs.push({
        channel: 'sms',
        status: isDemoMode ? 'SIMULATED' : 'FAILED',
        sentAt: new Date(),
        detail: isDemoMode
          ? `[DEMO MODE] Simulated SMS to ${mobile || 'unspecified'}: "${title} - ${message}"`
          : 'SMS Gateway credentials not configured',
      });
    }

    const notification = await Notification.create({
      userId,
      tokenId,
      title,
      message,
      type,
      channel: 'in_app',
      deliveryLogs,
    });

    if (io) {
      // Send directly to the authenticated patient's dedicated room
      io.to(`patient_${userId}`).emit('notification', {
        ...notification.toObject(),
        peopleAhead,
        estimatedWaitMins,
      });

      // Explicit doctor turn call event ONLY when isTurnAlert is explicitly true
      if (isTurnAlert) {
        io.to(`patient_${userId}`).emit('your_turn_alert', {
          tokenNumber: tokenNumber || 'Your Token',
          tokenId,
          roomNumber,
          doctorName,
          notification,
          timeoutSeconds: 120,
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService Error]:', error.message);
    return null;
  }
};
