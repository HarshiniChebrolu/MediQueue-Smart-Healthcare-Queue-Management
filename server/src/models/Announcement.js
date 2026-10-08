import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['General', 'Doctor Delayed', 'Doctor Unavailable', 'Emergency Notice', 'Timing Change'],
      default: 'General',
    },
    audience: {
      type: String,
      enum: ['All', 'Patients', 'Doctors', 'Public Display'],
      default: 'All',
    },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    activeStatus: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Announcement = mongoose.model('Announcement', announcementSchema);
