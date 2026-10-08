import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: { type: String, required: true }, // e.g. GM-001, CARD-002
    sequenceNumber: { type: Number, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    patientName: { type: String, required: true, trim: true },
    patientAge: { type: Number, default: 30 },
    patientGender: { type: String, default: 'Male' },
    patientMobile: { type: String, trim: true },

    // Mandatory Illness & Symptoms details
    reasonForVisit: { type: String, required: true, trim: true },
    symptomsDuration: { type: String, default: '1-2 days' },
    existingConditions: { type: String, default: 'None' },
    emergencyContact: { type: String, default: '' },

    // Priority System
    priority: {
      type: String,
      enum: ['Emergency', 'Urgent', 'Pregnant', 'Disability', 'Senior', 'Pediatric', 'Normal'],
      default: 'Normal',
    },
    priorityRank: { type: Number, default: 5 }, // 1: Emergency, 2: Urgent/Pregnant, 3: Disability, 4: Senior/Pediatric, 5: Normal
    priorityReason: { type: String, default: '' },

    // State Machine
    status: {
      type: String,
      enum: ['Waiting', 'Approaching', 'Called', 'In Consultation', 'Completed', 'Cancelled', 'Missed'],
      default: 'Waiting',
    },
    queuePosition: { type: Number, default: 1 },
    peopleAhead: { type: Number, default: 0 },
    estimatedWaitingTimeMinutes: { type: Number, default: 0 },
    estimatedWaitMin: { type: Number, default: 0 },
    estimatedWaitMax: { type: Number, default: 0 },

    // Accuracy Analytics
    predictedWaitMinutes: { type: Number, default: 0 },
    actualWaitMinutes: { type: Number, default: null },

    // Timestamps
    joinedTime: { type: Date, default: Date.now },
    calledAt: { type: Date, default: null },
    calledExpiresAt: { type: Date, default: null },
    consultationStartTime: { type: Date, default: null },
    consultationEndTime: { type: Date, default: null },
    consultationDurationMinutes: { type: Number, default: 0 },

    // Call Timeout & Requeue
    missedCount: { type: Number, default: 0 },
    requeuedAt: { type: Date, default: null },

    // Triage Screener Flag
    isUrgentFlagged: { type: Boolean, default: false },
    // Clinical Documentation & Appointment Link
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    consultationNotes: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    prescription: { type: String, default: '' },

    // Notifications
    notificationPreference: {
      type: String,
      enum: ['every_time', 'when_next', 'tracking'],
      default: 'every_time',
    },
    lastNotifiedPeopleAhead: { type: Number, default: null },
    dateString: { type: String, required: true },
  },
  { timestamps: true }
);

tokenSchema.index({ doctorId: 1, dateString: 1, status: 1 });
tokenSchema.index({ patientId: 1, dateString: 1, status: 1 });
tokenSchema.index({ departmentId: 1, dateString: 1 });

export const Token = mongoose.model('Token', tokenSchema);
export default Token;
