import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, trim: true },
    password: { type: String, default: null },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'receptionist', 'admin'],
      default: 'patient',
    },
    patientId: { type: String, unique: true, sparse: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    dob: { type: Date },
    address: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'], default: 'Unknown' },
    activeStatus: { type: Boolean, default: true },

    // Google OAuth & Phone OTP & Profile Fields
    googleId: { type: String, sparse: true },
    photoURL: { type: String, default: '' },
    provider: { type: String, enum: ['local', 'google', 'phone', 'walkin'], default: 'local' },
    verifiedMobile: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: true },
    reasonForVisit: { type: String, default: '', trim: true },
    approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
    rejectionReason: { type: String, default: '', trim: true },
    waitingMessage: { type: String, default: '', trim: true },
    waitingMessageTime: { type: Date, default: null },

    // Optional Medical History / Conditions
    medicalConditions: {
      diabetes: { type: Boolean, default: false },
      hypertension: { type: Boolean, default: false },
      pregnancy: { type: Boolean, default: false },
      dialysis: { type: Boolean, default: false },
      heartDisease: { type: Boolean, default: false },
      asthma: { type: Boolean, default: false },
      allergies: { type: String, default: '' },
      currentMedication: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Password encryption before saving
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
export default User;
