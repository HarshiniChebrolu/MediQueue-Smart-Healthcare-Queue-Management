import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    qualification: { type: String, required: true },
    specialization: { type: String, required: true },
    registrationNumber: { type: String, required: true, unique: true },
    experience: { type: Number, required: true, default: 5 }, // years
    roomNumber: { type: String, required: true },
    consultationDays: [{ type: String, default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }],
    startTime: { type: String, default: '09:00 AM' },
    endTime: { type: String, default: '05:00 PM' },
    breakTimings: { type: String, default: '01:00 PM - 02:00 PM' },
    consultationFee: { type: Number, default: 500 },
    defaultDuration: { type: Number, default: 10 }, // in minutes
    avgConsultationDuration: { type: Number, default: 10 }, // in minutes (updated dynamically)
    totalCompletedConsultations: { type: Number, default: 0 },
    totalConsultationTimeMinutes: { type: Number, default: 0 },
    recentConsultations: [
      {
        durationMinutes: { type: Number, required: true },
        completedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['Available', 'Calling Next Patient', 'In Consultation', 'Busy', 'On Break', 'Delayed', 'Unavailable', 'Consultation Ended'],
      default: 'Available',
    },
    biography: { type: String, default: 'Dedicated specialist committed to patient care and precise diagnosis.' },
    profileImage: { type: String, default: '' },
    activeStatus: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
