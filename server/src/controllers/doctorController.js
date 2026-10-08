import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Token } from '../models/Token.js';
import { getHospitalDateString } from '../utils/timezone.js';
import { logAudit } from '../utils/auditLogger.js';

// Safe regex escaping helper
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const getDoctors = async (req, res) => {
  try {
    const { departmentId, status, specialization, search, includeInactive } = req.query;

    const filter = {};
    if (includeInactive !== 'true') {
      filter.activeStatus = true;
    }
    if (departmentId) filter.departmentId = departmentId;
    if (status) filter.status = status;
    if (specialization) {
      filter.specialization = new RegExp(escapeRegex(specialization.trim().slice(0, 50)), 'i');
    }

    const doctors = await Doctor.find(filter)
      .populate('userId', 'name email mobile gender patientId')
      .populate('departmentId', 'name code tokenPrefix icon')
      .sort({ createdAt: 1 });

    const todayStr = getHospitalDateString();

    let result = await Promise.all(
      doctors.map(async (doc) => {
        const waitingCount = await Token.countDocuments({
          doctorId: doc._id,
          dateString: todayStr,
          status: { $in: ['Waiting', 'Approaching'] },
        });

        const inConsultationToken = await Token.findOne({
          doctorId: doc._id,
          dateString: todayStr,
          status: { $in: ['In Consultation', 'Called'] },
        }).select('tokenNumber status priority');

        return {
          ...doc.toObject(),
          waitingCount,
          currentServingToken: inConsultationToken || null,
        };
      })
    );

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim().slice(0, 50)), 'i');
      result = result.filter((doc) => searchRegex.test(doc.userId?.name || '') || searchRegex.test(doc.specialization));
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email mobile gender')
      .populate('departmentId', 'name code tokenPrefix icon');

    if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });

    const todayStr = getHospitalDateString();
    const waitingCount = await Token.countDocuments({
      doctorId: doctor._id,
      dateString: todayStr,
      status: { $in: ['Waiting', 'Approaching'] },
    });

    const activeToken = await Token.findOne({
      doctorId: doctor._id,
      dateString: todayStr,
      status: { $in: ['In Consultation', 'Called'] },
    }).select('tokenNumber status');

    res.json({ ...doctor.toObject(), waitingCount, currentServingToken: activeToken || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDoctorStatus = async (req, res) => {
  try {
    const { status, doctorId } = req.body;
    const allowedStatuses = [
      'Available',
      'Calling Next Patient',
      'In Consultation',
      'Busy',
      'On Break',
      'Delayed',
      'Unavailable',
      'Consultation Ended',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid doctor status parameter.' });
    }

    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    } else if (req.user.role === 'receptionist' || req.user.role === 'admin') {
      const targetId = doctorId || req.params.id;
      doctor = await Doctor.findById(targetId);
    }

    if (!doctor) return res.status(404).json({ message: 'Doctor record not found.' });

    const previousStatus = doctor.status;
    doctor.status = status;
    await doctor.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DOCTOR_STATUS_CHANGED',
      targetType: 'Doctor',
      targetId: doctor._id,
      previousState: previousStatus,
      newState: status,
      details: `Doctor status updated to "${status}"`,
      req,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`doctor_${doctor._id}`).emit('doctor_status_changed', {
        doctorId: doctor._id,
        status: doctor.status,
        roomNumber: doctor.roomNumber,
      });
      io.to('staff').emit('doctor_status_changed', {
        doctorId: doctor._id,
        status: doctor.status,
        roomNumber: doctor.roomNumber,
      });
      io.to('public_display').emit('doctor_status_changed', {
        doctorId: doctor._id,
        status: doctor.status,
        roomNumber: doctor.roomNumber,
      });
      io.emit('doctor_status_changed', {
        doctorId: doctor._id,
        status: doctor.status,
        roomNumber: doctor.roomNumber,
      });
    }

    res.json({ message: 'Status updated successfully.', doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create Doctor (Receptionist / Admin)
export const createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      mobile,
      gender,
      departmentId,
      qualification,
      specialization,
      registrationNumber,
      experience,
      roomNumber,
      startTime,
      endTime,
      breakTimings,
      consultationFee,
      defaultDuration,
      biography,
    } = req.body;

    const cleanEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user account with this email address already exists.' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      mobile: mobile ? String(mobile).trim() : '',
      password: password || 'Doctor123!',
      role: 'doctor',
      gender: gender || 'Male',
    });

    const doctor = await Doctor.create({
      userId: user._id,
      departmentId,
      qualification: qualification || 'MBBS, MD',
      specialization: specialization || 'Consultant Specialist',
      registrationNumber: registrationNumber || `REG-${Date.now()}`,
      experience: Number(experience) || 5,
      roomNumber: roomNumber || 'Room 101',
      startTime: startTime || '09:00 AM',
      endTime: endTime || '05:00 PM',
      breakTimings: breakTimings || '01:00 PM - 02:00 PM',
      consultationFee: Number(consultationFee) || 500,
      defaultDuration: Number(defaultDuration) || 10,
      avgConsultationDuration: Number(defaultDuration) || 10,
      biography: biography || 'Dedicated specialist committed to patient care.',
      status: 'Available',
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DOCTOR_CREATED',
      targetType: 'Doctor',
      targetId: doctor._id,
      details: `Created doctor profile: Dr. ${user.name} (${specialization})`,
      req,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to('staff').emit('stats_updated');
    }

    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Doctor by Receptionist
export const updateDoctorByReceptionist = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor record not found.' });

    if (req.body.name) {
      await User.findByIdAndUpdate(doctor.userId, { name: String(req.body.name).trim(), mobile: req.body.mobile });
    }

    doctor.departmentId = req.body.departmentId || doctor.departmentId;
    doctor.qualification = req.body.qualification || doctor.qualification;
    doctor.specialization = req.body.specialization || doctor.specialization;
    doctor.roomNumber = req.body.roomNumber || doctor.roomNumber;
    doctor.experience = req.body.experience !== undefined ? Number(req.body.experience) : doctor.experience;
    doctor.startTime = req.body.startTime || doctor.startTime;
    doctor.endTime = req.body.endTime || doctor.endTime;
    doctor.defaultDuration = req.body.defaultDuration ? Number(req.body.defaultDuration) : doctor.defaultDuration;
    doctor.biography = req.body.biography || doctor.biography;

    if (typeof req.body.activeStatus === 'boolean') {
      doctor.activeStatus = req.body.activeStatus;
      await User.findByIdAndUpdate(doctor.userId, { activeStatus: req.body.activeStatus });
    }

    const updated = await doctor.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DOCTOR_UPDATED',
      targetType: 'Doctor',
      targetId: doctor._id,
      details: `Receptionist updated doctor profile for ${doctor.roomNumber}`,
      req,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
