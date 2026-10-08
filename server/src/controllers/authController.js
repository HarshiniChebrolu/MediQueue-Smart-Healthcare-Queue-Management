import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { Doctor } from '../models/Doctor.js';
import { logAudit } from '../utils/auditLogger.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: '7d',
  });
};

// Auto-generate Patient ID e.g., PAT-2026-0001
export const generatePatientId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `PAT-${currentYear}-`;

  const lastPatient = await User.findOne({
    patientId: new RegExp(`^PAT-${currentYear}-`),
  }).sort({ createdAt: -1, _id: -1 });

  let nextSeq = 1;
  if (lastPatient && lastPatient.patientId) {
    const match = lastPatient.patientId.match(/PAT-\d{4}-(\d+)/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  let candidateId = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  while (await User.findOne({ patientId: candidateId })) {
    nextSeq++;
    candidateId = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  return candidateId;
};

// Check if email or mobile already exists
export const checkUserExists = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email || !mobile) {
      return res.status(400).json({ message: 'Email and Mobile Number are required for verification.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).trim();

    const existingEmailUser = await User.findOne({ email: cleanEmail });
    if (existingEmailUser) {
      return res.status(400).json({ message: 'A patient account with this email address already exists.' });
    }

    const existingMobileUser = await User.findOne({ mobile: cleanMobile });
    if (existingMobileUser) {
      return res.status(400).json({ message: 'A patient account with this mobile number already exists.' });
    }

    return res.json({ available: true });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error checking user availability.' });
  }
};

// Patient Self-Registration
export const registerPatient = async (req, res) => {
  try {
    const { name, email, mobile, password, gender, dob, address, emergencyContact, bloodGroup, reasonForVisit, reason } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ message: 'Full Name, Mobile Number, Email Address, and Password are required.' });
    }

    // Password Complexity Validation: Min 8 chars, Uppercase, Lowercase, Number, Special Char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).trim();

    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    });
    if (userExists) {
      return res.status(400).json({ message: 'A patient account with this email address or mobile number already exists.' });
    }

    const patientId = await generatePatientId();
    const parsedDob = dob && typeof dob === 'string' && dob.trim() ? new Date(dob) : null;
    const cleanReason = String(reasonForVisit || reason || '').trim();

    const user = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password,
      role: 'patient', // Enforced server-side
      patientId,
      gender: gender || 'Male',
      dob: parsedDob,
      address: address ? String(address).trim() : '',
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : '',
      bloodGroup: bloodGroup || 'Unknown',
      reasonForVisit: cleanReason,
      verifiedMobile: true,
      provider: 'local',
      profileCompleted: true,
      approvalStatus: 'Pending',
      activeStatus: false,
    });

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: 'patient',
      action: 'PATIENT_REGISTRATION_REQUEST',
      targetType: 'User',
      targetId: user._id,
      details: `New patient self-registration request submitted: ${user.name} (${patientId}). Reason: ${cleanReason || 'N/A'}`,
      req,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_patient_registration', {
        _id: user._id,
        patientId: user.patientId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        reasonForVisit: user.reasonForVisit,
        createdAt: user.createdAt,
      });
      io.to('staff').emit('user_registered', { role: 'patient', userId: user._id });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      patientId: user.patientId,
      gender: user.gender,
      dob: user.dob,
      bloodGroup: user.bloodGroup,
      address: user.address,
      emergencyContact: user.emergencyContact,
      reasonForVisit: user.reasonForVisit,
      verifiedMobile: true,
      provider: user.provider,
      profileCompleted: true,
      approvalStatus: 'Pending',
      activeStatus: false,
      isPendingApproval: true,
      message: 'Registration submitted successfully! Your account is pending Hospital Admin approval.',
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('[Patient Registration Error]:', error);
    res.status(500).json({ message: error.message || 'Patient registration failed.' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, identifier, password, role } = req.body;
    const loginId = String(email || identifier || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Email or mobile number and password are required.' });
    }

    const cleanEmail = loginId.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: cleanEmail },
        { mobile: loginId }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ message: `Account exists, but assigned role is '${user.role}', not '${role}'.` });
    }

    // Check approval status for patients
    if (user.role === 'patient' && user.approvalStatus === 'Pending') {
      return res.status(403).json({
        message: 'Your registration request is currently pending Hospital Admin approval. You will receive access once approved by administration.',
        approvalStatus: 'Pending',
      });
    }

    if (user.role === 'patient' && user.approvalStatus === 'Rejected') {
      return res.status(403).json({
        message: `Your registration request was declined: ${user.rejectionReason || 'Please contact hospital reception for details.'}`,
        approvalStatus: 'Rejected',
      });
    }

    if (!user.activeStatus) {
      return res.status(403).json({ message: 'Account is deactivated. Contact hospital reception.' });
    }

    // Check if walk-in account without direct login password
    if (user.provider === 'walkin' && !user.password) {
      return res.status(403).json({
        message: 'This walk-in patient profile has not been activated for online login yet. Please claim your account or register with phone verification.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    let doctorInfo = null;
    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate({ userId: user._id }, { status: 'Available' });
      doctorInfo = await Doctor.findOne({ userId: user._id }).populate('departmentId', 'name code tokenPrefix icon');
      const io = req.app.get('socketio');
      if (io && doctorInfo) {
        io.emit('doctor_status_changed', { doctorId: doctorInfo._id, status: 'Available', roomNumber: doctorInfo.roomNumber });
      }
    }

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'AUTH_LOGIN',
      targetType: 'User',
      targetId: user._id,
      details: `User logged in successfully as ${user.role}`,
      req,
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      patientId: user.patientId,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      photoURL: user.photoURL,
      provider: user.provider,
      profileCompleted: user.profileCompleted ?? true,
      reasonForVisit: user.reasonForVisit || '',
      doctor: doctorInfo,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Google OAuth Handler for Patients Only with Cryptographic Token Verification
export const googleAuth = async (req, res) => {
  try {
    const { googleToken, credential, googleUser } = req.body;
    const isDemoMode = process.env.DEMO_MODE !== 'false';

    let email = '';
    let name = '';
    let googleId = '';
    let photoURL = '';

    const tokenToVerify = credential || googleToken;

    if (tokenToVerify && process.env.GOOGLE_CLIENT_ID) {
      // Real cryptographic verification via Google OAuth2 Client
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: tokenToVerify,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        googleId = payload.sub;
        photoURL = payload.picture || '';
      } catch (tokenErr) {
        console.warn('[Google Auth] Token verification failed:', tokenErr.message);
        if (!isDemoMode) {
          return res.status(401).json({ message: 'Invalid or forged Google token signature.' });
        }
      }
    }

    // Demo Mode fallback for interactive mock testing
    if (!email && isDemoMode && googleUser?.email) {
      email = googleUser.email;
      name = googleUser.name;
      googleId = googleUser.sub || googleUser.googleId || `google_demo_${Date.now()}`;
      photoURL = googleUser.picture || googleUser.photoURL || '';
    }

    if (!email) {
      return res.status(400).json({ message: 'Valid Google identity is required for patient authentication.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user exists
    let user = await User.findOne({
      $or: [{ googleId: googleId }, { email: cleanEmail }],
    });

    if (user) {
      // Security: Google auth is restricted to Patient accounts
      if (user.role !== 'patient') {
        return res.status(403).json({
          message: 'Google Sign-In is for Patient accounts only. Doctors and Receptionists must sign in using Email and Password credentials.',
        });
      }

      let modified = false;
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        modified = true;
      }
      if (!user.photoURL && photoURL) {
        user.photoURL = photoURL;
        modified = true;
      }
      if (modified) {
        await user.save();
      }

      const isProfileDone = Boolean(user.profileCompleted && user.mobile && user.address);

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || '',
        role: user.role,
        patientId: user.patientId,
        gender: user.gender,
        dob: user.dob,
        address: user.address,
        emergencyContact: user.emergencyContact,
        bloodGroup: user.bloodGroup,
        photoURL: user.photoURL || '',
        provider: user.provider || 'google',
        profileCompleted: isProfileDone,
        medicalConditions: user.medicalConditions,
        token: generateToken(user._id),
        message: `Welcome back, ${user.name} 👋`,
      });
    }

    // New Google Patient
    const patientId = await generatePatientId();
    user = await User.create({
      name: name || 'Patient',
      email: cleanEmail,
      googleId: googleId,
      photoURL: photoURL || '',
      provider: 'google',
      role: 'patient',
      patientId,
      profileCompleted: false,
      gender: 'Male',
      bloodGroup: 'Unknown',
    });

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: 'patient',
      action: 'AUTH_LOGIN',
      targetType: 'User',
      targetId: user._id,
      details: `First-time Google sign-in patient account created: ${patientId}`,
      req,
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: '',
      role: user.role,
      patientId: user.patientId,
      gender: user.gender,
      photoURL: user.photoURL,
      provider: 'google',
      profileCompleted: false,
      token: generateToken(user._id),
      message: "Welcome to MediQueue! Please complete your basic health profile.",
    });
  } catch (error) {
    console.error('[Google Auth Error]:', error);
    res.status(500).json({ message: error.message || 'Google authentication failed.' });
  }
};

// Complete First-Time Patient Profile
export const completePatientProfile = async (req, res) => {
  try {
    const { mobile, dob, gender, bloodGroup, address, emergencyContact, medicalConditions } = req.body;

    if (!mobile || !dob || !gender || !bloodGroup || !address || !emergencyContact) {
      return res.status(400).json({
        message: 'Mobile Number, Date of Birth, Gender, Blood Group, Residential Address, and Emergency Contact are mandatory.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Patient account not found' });
    }

    user.mobile = String(mobile).trim();
    user.dob = new Date(dob);
    user.gender = gender;
    user.bloodGroup = bloodGroup;
    user.address = String(address).trim();
    user.emergencyContact = String(emergencyContact).trim();
    user.profileCompleted = true;

    if (medicalConditions) {
      user.medicalConditions = {
        diabetes: Boolean(medicalConditions.diabetes),
        hypertension: Boolean(medicalConditions.hypertension),
        pregnancy: Boolean(medicalConditions.pregnancy),
        dialysis: Boolean(medicalConditions.dialysis),
        heartDisease: Boolean(medicalConditions.heartDisease),
        asthma: Boolean(medicalConditions.asthma),
        allergies: medicalConditions.allergies ? String(medicalConditions.allergies).trim() : '',
        currentMedication: medicalConditions.currentMedication ? String(medicalConditions.currentMedication).trim() : '',
      };
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      patientId: user.patientId,
      gender: user.gender,
      dob: user.dob,
      address: user.address,
      emergencyContact: user.emergencyContact,
      bloodGroup: user.bloodGroup,
      photoURL: user.photoURL || '',
      provider: user.provider || 'google',
      profileCompleted: true,
      medicalConditions: user.medicalConditions,
      token: generateToken(user._id),
      message: 'Health profile completed successfully!',
    });
  } catch (error) {
    console.error('[Complete Profile Error]:', error);
    res.status(500).json({ message: error.message || 'Profile completion failed.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let doctorInfo = null;
    if (user.role === 'doctor') {
      doctorInfo = await Doctor.findOne({ userId: user._id }).populate('departmentId', 'name code tokenPrefix icon');
    }
    res.json({ user, doctor: doctorInfo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = req.body.name ? String(req.body.name).trim() : user.name;
    user.mobile = req.body.mobile ? String(req.body.mobile).trim() : user.mobile;
    user.address = req.body.address ? String(req.body.address).trim() : user.address;
    user.emergencyContact = req.body.emergencyContact ? String(req.body.emergencyContact).trim() : user.emergencyContact;
    user.bloodGroup = req.body.bloodGroup || user.bloodGroup;

    if (req.body.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordRegex.test(req.body.password)) {
        return res.status(400).json({
          message: 'New password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character.',
        });
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      role: updatedUser.role,
      patientId: updatedUser.patientId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
