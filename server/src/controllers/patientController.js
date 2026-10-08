import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { Token } from '../models/Token.js';
import { generatePatientId } from './authController.js';
import { logAudit } from '../utils/auditLogger.js';

// Safe regex escaping helper to prevent ReDoS attacks
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Get All Patients (with pending approval filter and search)
export const getAllPatients = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = { role: 'patient' };

    if (status && status !== 'all') {
      filter.approvalStatus = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim().slice(0, 100);
      const regex = new RegExp(escapeRegex(cleanSearch), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { mobile: regex },
        { patientId: regex },
        { reasonForVisit: regex },
        { bloodGroup: regex },
      ];
    }

    const patients = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    const pendingCount = await User.countDocuments({ role: 'patient', approvalStatus: 'Pending' });
    const approvedCount = await User.countDocuments({ role: 'patient', approvalStatus: 'Approved' });
    const totalCount = await User.countDocuments({ role: 'patient' });

    res.json({
      patients,
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single Patient Details with Consultation & Appointment History
export const getPatientDetails = async (req, res) => {
  try {
    const patient = await User.findById(req.params.id).select('-password');
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient record not found.' });
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email mobile' },
      })
      .populate('departmentId', 'name code tokenPrefix icon')
      .sort({ appointmentDate: -1, createdAt: -1 });

    const tokens = await Token.find({ patientId: patient._id })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' },
      })
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      patient,
      appointments,
      tokens,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve Patient Registration (Receptionist / Admin)
export const approvePatientRegistration = async (req, res) => {
  try {
    const patient = await User.findById(req.params.id);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    patient.approvalStatus = 'Approved';
    patient.activeStatus = true;
    patient.rejectionReason = '';
    await patient.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PATIENT_REGISTRATION_APPROVED',
      targetType: 'User',
      targetId: patient._id,
      details: `${req.user.role === 'receptionist' ? 'Receptionist' : 'Admin'} approved registration for patient: ${patient.name} (${patient.patientId})`,
      req,
    });

    const patientPayload = {
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      mobile: patient.mobile,
      role: patient.role,
      patientId: patient.patientId,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      profileCompleted: patient.profileCompleted ?? true,
      approvalStatus: 'Approved',
      activeStatus: true,
      reasonForVisit: patient.reasonForVisit,
    };

    const io = req.app.get('socketio');
    if (io) {
      io.emit('patient_approval_updated', {
        patientId: patient._id,
        patientNumber: patient.patientId,
        status: 'Approved',
        name: patient.name,
        user: patientPayload,
      });
      io.emit(`patient_approved_${patient._id}`, {
        patientId: patient._id,
        patientNumber: patient.patientId,
        status: 'Approved',
        user: patientPayload,
      });
      io.to('staff').emit('stats_updated');
    }

    res.json({ message: 'Patient registration approved successfully.', patient: patientPayload });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject Patient Registration (Receptionist / Admin)
export const rejectPatientRegistration = async (req, res) => {
  try {
    const { reason } = req.body;
    const patient = await User.findById(req.params.id);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    patient.approvalStatus = 'Rejected';
    patient.activeStatus = false;
    patient.rejectionReason = String(reason || 'Registration request declined by Front Desk Reception.').trim();
    await patient.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PATIENT_REGISTRATION_REJECTED',
      targetType: 'User',
      targetId: patient._id,
      details: `${req.user.role === 'receptionist' ? 'Receptionist' : 'Admin'} rejected registration for patient: ${patient.name} (${patient.patientId}). Reason: ${patient.rejectionReason}`,
      req,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('patient_approval_updated', {
        patientId: patient._id,
        patientNumber: patient.patientId,
        status: 'Rejected',
        reason: patient.rejectionReason,
      });
      io.emit(`patient_rejected_${patient._id}`, {
        patientId: patient._id,
        status: 'Rejected',
        reason: patient.rejectionReason,
      });
      io.to('staff').emit('stats_updated');
    }

    res.json({ message: 'Patient registration declined.', patient });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send Priority/Urgent Message from Pending Patient to Receptionist
export const sendWaitingMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    const patient = await User.findById(id);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient account not found.' });
    }

    patient.waitingMessage = cleanMessage;
    patient.waitingMessageTime = new Date();
    await patient.save();

    const io = req.app.get('socketio');
    if (io) {
      const payload = {
        patientId: patient._id,
        patientName: patient.name,
        patientNumber: patient.patientId,
        mobile: patient.mobile,
        reasonForVisit: patient.reasonForVisit,
        message: cleanMessage,
        time: patient.waitingMessageTime,
      };
      io.emit('patient_waiting_message', payload);
      io.to('staff').emit('patient_waiting_message', payload);
    }

    res.json({
      message: 'Urgent note successfully sent to Front Desk Receptionist.',
      waitingMessage: cleanMessage,
      waitingMessageTime: patient.waitingMessageTime,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Toggle Patient Active Status
export const togglePatientActiveStatus = async (req, res) => {
  try {
    const patient = await User.findById(req.params.id);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    patient.activeStatus = !patient.activeStatus;
    await patient.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: patient.activeStatus ? 'PATIENT_ACTIVATED' : 'PATIENT_DEACTIVATED',
      targetType: 'User',
      targetId: patient._id,
      details: `Patient account ${patient.activeStatus ? 'activated' : 'deactivated'}: ${patient.name} (${patient.patientId})`,
      req,
    });

    res.json({
      message: `Patient ${patient.activeStatus ? 'activated' : 'deactivated'} successfully.`,
      patient,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchPatients = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.json([]);
    }

    const cleanQuery = query.trim().slice(0, 100);
    const escaped = escapeRegex(cleanQuery);
    const regex = new RegExp(escaped, 'i');

    const patients = await User.find({
      role: 'patient',
      $or: [{ name: regex }, { email: regex }, { mobile: regex }, { patientId: regex }],
    })
      .select('-password')
      .limit(20);

    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Register Walk-In Patient by Receptionist
export const registerWalkInPatient = async (req, res) => {
  try {
    const { name, mobile, gender, age, email, address, emergencyContact, bloodGroup, reasonForVisit } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Patient full name is mandatory.' });
    }

    const patientId = await generatePatientId();
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : `walkin.${patientId.toLowerCase()}@mediqueue.local`;
    const cleanMobile = mobile ? String(mobile).trim() : '';

    let calculatedDob = null;
    if (age && Number(age) > 0) {
      const currentYear = new Date().getFullYear();
      calculatedDob = new Date(`${currentYear - Number(age)}-01-01`);
    }

    const patient = await User.create({
      name: String(name).trim(),
      mobile: cleanMobile,
      email: cleanEmail,
      password: null,
      provider: 'walkin',
      role: 'patient',
      patientId,
      gender: gender || 'Male',
      dob: calculatedDob,
      address: address ? String(address).trim() : '',
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : '',
      bloodGroup: bloodGroup || 'Unknown',
      reasonForVisit: reasonForVisit ? String(reasonForVisit).trim() : '',
      profileCompleted: true,
      approvalStatus: 'Approved', // Walk-ins created on site by staff are pre-approved
      activeStatus: true,
    });

    await logAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Receptionist',
      userRole: req.user?.role || 'receptionist',
      action: 'WALKIN_REGISTERED',
      targetType: 'User',
      targetId: patient._id,
      details: `Walk-in patient registered: ${patient.name} (${patientId})`,
      req,
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
