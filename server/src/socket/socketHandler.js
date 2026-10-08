import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Doctor } from '../models/Doctor.js';

export const setupSocketHandlers = (io) => {
  // Socket.IO Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        // Allow unauthenticated sockets ONLY for public display boards
        socket.user = null;
        socket.isAnonymous = true;
        return next();
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Server configuration error: JWT_SECRET missing'));
      }

      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || !user.activeStatus) {
        return next(new Error('Authentication failed: User account invalid or deactivated'));
      }

      socket.user = user;
      socket.isAnonymous = false;

      // If doctor, find doctor profile
      if (user.role === 'doctor') {
        const doctor = await Doctor.findOne({ userId: user._id });
        socket.doctor = doctor || null;
      }

      next();
    } catch (error) {
      console.warn('[Socket Auth Warning]: Handshake auth failed, fallback to anonymous:', error.message);
      socket.user = null;
      socket.isAnonymous = true;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Automatic secure room assignment based on verified identity
    if (user) {
      if (user.role === 'patient') {
        socket.join(`patient_${user._id}`);
      } else if (user.role === 'doctor' && socket.doctor) {
        socket.join(`doctor_${socket.doctor._id}`);
        socket.join('staff');
      } else if (user.role === 'receptionist' || user.role === 'admin') {
        socket.join('staff');
      }
    }

    // Always join public display room if requested
    socket.join('public_display');

    // Secure Room Join Listeners with Verification
    socket.on('join_patient_room', (patientId) => {
      if (!user) {
        return socket.emit('error', { message: 'Authentication required to join private patient room.' });
      }

      if (user.role === 'patient' && user._id.toString() !== patientId) {
        console.warn(`[Security Alert] Patient ${user._id} attempted unauthorized access to patient_${patientId}`);
        return socket.emit('error', { message: 'Unauthorized: You cannot access other patients rooms.' });
      }

      socket.join(`patient_${patientId}`);
    });

    socket.on('join_doctor_room', (doctorId) => {
      if (!user || (user.role !== 'doctor' && user.role !== 'receptionist' && user.role !== 'admin')) {
        return socket.emit('error', { message: 'Unauthorized: Staff credentials required.' });
      }
      socket.join(`doctor_${doctorId}`);
    });

    socket.on('join_department_room', (departmentId) => {
      if (departmentId) {
        socket.join(`department_${departmentId}`);
      }
    });

    socket.on('join_public_display', () => {
      socket.join('public_display');
    });

    socket.on('disconnect', () => {});
  });
};

/**
 * Sanitizes queue tokens for zero-PII public display screens.
 * Strips all patient names, phones, conditions, and reasons for visit.
 */
export const sanitizeForPublicDisplay = (tokens = []) => {
  return tokens.map((t) => ({
    tokenId: t._id || t.tokenId,
    tokenNumber: t.tokenNumber,
    status: t.status,
    queuePosition: t.queuePosition,
    peopleAhead: t.peopleAhead,
    priorityRank: t.priorityRank,
    doctorName: t.doctorName || t.doctorId?.name || t.doctorId?.userId?.name || 'Doctor',
    roomNumber: t.roomNumber || t.doctorId?.roomNumber || 'Consultation Room',
    departmentName: t.departmentName || t.departmentId?.name || '',
    estimatedWaitMin: t.estimatedWaitMin || 0,
    estimatedWaitMax: t.estimatedWaitMax || 0,
  }));
};

export default setupSocketHandlers;
