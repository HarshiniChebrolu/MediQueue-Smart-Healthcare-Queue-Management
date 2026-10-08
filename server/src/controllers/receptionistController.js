import { User } from '../models/User.js';
import { logAudit } from '../utils/auditLogger.js';

// Get All Receptionists
export const getReceptionists = async (req, res) => {
  try {
    const receptionists = await User.find({ role: 'receptionist' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(receptionists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create New Receptionist Staff (Admin only)
export const createReceptionist = async (req, res) => {
  try {
    const { name, email, password, mobile, gender, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are mandatory.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = mobile ? String(mobile).trim() : '';

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user account with this email address already exists.' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password,
      role: 'receptionist',
      gender: gender || 'Female',
      address: address ? String(address).trim() : '',
      activeStatus: true,
      profileCompleted: true,
      approvalStatus: 'Approved',
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RECEPTIONIST_CREATED',
      targetType: 'User',
      targetId: user._id,
      details: `Admin created receptionist account: ${user.name} (${cleanEmail})`,
      req,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to('staff').emit('stats_updated');
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      gender: user.gender,
      activeStatus: user.activeStatus,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle Receptionist Active Status
export const toggleReceptionistStatus = async (req, res) => {
  try {
    const receptionist = await User.findById(req.params.id);
    if (!receptionist || receptionist.role !== 'receptionist') {
      return res.status(404).json({ message: 'Receptionist record not found.' });
    }

    receptionist.activeStatus = !receptionist.activeStatus;
    await receptionist.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: receptionist.activeStatus ? 'RECEPTIONIST_ACTIVATED' : 'RECEPTIONIST_DEACTIVATED',
      targetType: 'User',
      targetId: receptionist._id,
      details: `Receptionist account ${receptionist.activeStatus ? 'activated' : 'deactivated'}: ${receptionist.name}`,
      req,
    });

    res.json({
      message: `Receptionist ${receptionist.activeStatus ? 'activated' : 'deactivated'} successfully.`,
      receptionist: {
        _id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        mobile: receptionist.mobile,
        activeStatus: receptionist.activeStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
