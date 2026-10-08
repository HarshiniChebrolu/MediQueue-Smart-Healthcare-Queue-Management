import mongoose from 'mongoose';

const queueHistorySchema = new mongoose.Schema(
  {
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },
    tokenNumber: { type: String, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false },
    priority: { type: String, default: 'Normal' },
    status: { type: String, required: true }, // Completed, Cancelled, Missed
    joinedTime: { type: Date },
    calledTime: { type: Date },
    completedTime: { type: Date, default: Date.now },
    waitingDurationMinutes: { type: Number, default: 0 },
    predictedWaitMinutes: { type: Number, default: 0 },
    consultationDurationMinutes: { type: Number, default: 0 },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    consultationNotes: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    prescription: { type: String, default: '' },
    dateString: { type: String, required: true },
  },
  { timestamps: true }
);

queueHistorySchema.index({ dateString: 1, doctorId: 1 });
queueHistorySchema.index({ patientId: 1, createdAt: -1 });

export const QueueHistory = mongoose.model('QueueHistory', queueHistorySchema);
export default QueueHistory;
