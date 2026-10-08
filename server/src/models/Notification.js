import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'warning', 'turn_alert', 'success', 'announcement', 'fairness_notice'],
      default: 'info',
    },
    isRead: { type: Boolean, default: false },
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },
    channel: {
      type: String,
      enum: ['in_app', 'sms', 'email', 'push', 'multi_channel'],
      default: 'in_app',
    },
    deliveryLogs: [
      {
        channel: { type: String, enum: ['in_app', 'sms', 'email', 'push'] },
        status: { type: String, enum: ['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SIMULATED'], default: 'DELIVERED' },
        sentAt: { type: Date, default: Date.now },
        detail: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
