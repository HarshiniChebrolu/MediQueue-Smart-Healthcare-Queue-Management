import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    appointmentDate: { type: String, required: true }, // Format: YYYY-MM-DD
    timeSlot: { type: String, required: true }, // e.g. "09:30 AM"
    tokenNumber: { type: String, required: true }, // e.g. "CARD-001"
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },

    // Patient snapshot
    patientName: { type: String, required: true, trim: true },
    patientAge: { type: Number, default: 30 },
    patientGender: { type: String, default: 'Male' },
    patientMobile: { type: String, trim: true },
    emergencyContact: { type: String, default: '' },

    // Clinical visit reason & symptoms
    reasonForVisit: { type: String, required: true, trim: true },
    symptomsDuration: { type: String, default: '1-2 days' },
    existingConditions: { type: String, default: 'None' },

    // Priority
    priority: {
      type: String,
      enum: ['Emergency', 'Urgent', 'Pregnant', 'Disability', 'Senior', 'Pediatric', 'Normal'],
      default: 'Normal',
    },
    priorityReason: { type: String, default: '' },

    // Appointment Lifecycle:
    // Scheduled -> Checked-In / Waiting -> Called -> In Consultation -> Completed (or Cancelled / No Show)
    status: {
      type: String,
      enum: ['Scheduled', 'Checked-In', 'Waiting', 'Called', 'In Consultation', 'Completed', 'Cancelled', 'No Show'],
      default: 'Scheduled',
    },

    // Consultation records
    consultationNotes: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    prescription: { type: String, default: '' },
    vitals: {
      bp: { type: String, default: '' },
      pulse: { type: String, default: '' },
      temperature: { type: String, default: '' },
      weight: { type: String, default: '' },
    },

    // Timestamps
    checkInTime: { type: Date, default: null },
    calledTime: { type: Date, default: null },
    consultationStartTime: { type: Date, default: null },
    completedTime: { type: Date, default: null },
    bookedBy: { type: String, enum: ['patient', 'doctor', 'receptionist', 'admin', 'system'], default: 'patient' },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ departmentId: 1, appointmentDate: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
