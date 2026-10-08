import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    tokenPrefix: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, required: true },
    icon: { type: String, default: 'Stethoscope' },
    activeStatus: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Department = mongoose.model('Department', departmentSchema);
export default Department;
