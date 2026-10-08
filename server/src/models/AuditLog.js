import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    userName: { type: String, required: true },
    userRole: { type: String, required: true }, // patient, doctor, receptionist, system
    action: {
      type: String,
      required: true,
      enum: [
        'PRIORITY_REQUEST_SUBMITTED',
        'PRIORITY_REQUEST_APPROVED',
        'PRIORITY_REQUEST_REJECTED',
        'PATIENT_CALLED',
        'PATIENT_ATTENDED',
        'CONSULTATION_COMPLETED',
        'PATIENT_SKIPPED',
        'CALL_TIMEOUT_REQUEUED',
        'CALL_TIMEOUT_MISSED',
        'TOKEN_CANCELLED',
        'DOCTOR_STATUS_CHANGED',
        'WALKIN_REGISTERED',
        'TOKEN_ISSUED',
        'PROFILE_UPDATED',
        'DOCTOR_CREATED',
        'DOCTOR_UPDATED',
        'RECEPTIONIST_CREATED',
        'RECEPTIONIST_ACTIVATED',
        'RECEPTIONIST_DEACTIVATED',
        'PATIENT_REGISTRATION_REQUEST',
        'PATIENT_REGISTRATION_APPROVED',
        'PATIENT_REGISTRATION_REJECTED',
        'PATIENT_ACTIVATED',
        'PATIENT_DEACTIVATED',
        'APPOINTMENT_BOOKED',
        'APPOINTMENT_CANCELLED',
        'APPOINTMENT_UPDATED',
        'APPOINTMENT_COMPLETED',
        'AUTH_LOGIN',
        'AUTH_LOGOUT',
      ],
    },
    targetType: {
      type: String,
      enum: ['Token', 'PriorityRequest', 'Doctor', 'User', 'Queue', 'System', 'Appointment'],
      default: 'Token',
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: false },
    targetTokenNumber: { type: String, required: false },
    previousState: { type: String, default: null },
    newState: { type: String, default: null },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
