import mongoose from 'mongoose';

const queueCounterSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    dateString: { type: String, required: true },
    lastSequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

queueCounterSchema.index({ doctorId: 1, dateString: 1 }, { unique: true });

export const QueueCounter = mongoose.model('QueueCounter', queueCounterSchema);
export default QueueCounter;
