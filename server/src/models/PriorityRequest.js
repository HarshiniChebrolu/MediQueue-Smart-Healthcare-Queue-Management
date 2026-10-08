import mongoose from 'mongoose';

const priorityRequestSchema = new mongoose.Schema(
  {
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    patientName: { type: String, required: true },
    tokenNumber: { type: String, required: true },
    category: {
      type: String,
      enum: ['Emergency', 'Severe Pain', 'Pregnancy', 'Elderly', 'Disability', 'Child', 'Other'],
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    receptionistNotes: { type: String, default: '', trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

priorityRequestSchema.index({ status: 1, createdAt: -1 });
priorityRequestSchema.index({ tokenId: 1 });

export const PriorityRequest = mongoose.model('PriorityRequest', priorityRequestSchema);
export default PriorityRequest;
