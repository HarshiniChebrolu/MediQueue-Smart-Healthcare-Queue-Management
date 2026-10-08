import { Appointment } from '../models/Appointment.js';
import { Token } from '../models/Token.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { QueueCounter } from '../models/QueueCounter.js';
import { getHospitalDateString } from '../utils/timezone.js';
import { recalculateDoctorQueue } from '../utils/queueCalculations.js';
import { dispatchSmartNotification } from '../utils/notificationService.js';
import { logAudit } from '../utils/auditLogger.js';

// Book an appointment (Patient or Staff/Admin)
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      departmentId,
      appointmentDate,
      timeSlot,
      reasonForVisit,
      symptomsDuration,
      existingConditions,
      priority,
      priorityReason,
      patientIdOverride,
      name,
      age,
      gender,
      mobile,
      emergencyContact,
    } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor is required for appointment booking.' });
    }
    if (!reasonForVisit || !reasonForVisit.trim()) {
      return res.status(400).json({ message: 'Reason for visit / Illness symptoms is required.' });
    }

    const todayStr = getHospitalDateString();
    const effectiveDate = appointmentDate || todayStr;
    const effectiveSlot = timeSlot || '10:00 AM';

    // Patient resolution
    let effectivePatientId = req.user._id;
    if ((req.user.role === 'receptionist' || req.user.role === 'admin') && patientIdOverride) {
      effectivePatientId = patientIdOverride;
    }

    const patientUser = await User.findById(effectivePatientId);
    if (!patientUser) {
      return res.status(404).json({ message: 'Patient record not found.' });
    }

    const doctor = await Doctor.findById(doctorId).populate('userId').populate('departmentId');
    if (!doctor || !doctor.activeStatus) {
      return res.status(400).json({ message: 'Selected doctor is currently unavailable.' });
    }

    // Check duplicate appointment on same date with same doctor
    const existing = await Appointment.findOne({
      patientId: effectivePatientId,
      doctorId: doctor._id,
      appointmentDate: effectiveDate,
      status: { $in: ['Scheduled', 'Checked-In', 'Waiting', 'Called', 'In Consultation'] },
    });

    if (existing) {
      return res.status(400).json({
        message: `You already have an active appointment (${existing.tokenNumber}) with Dr. ${doctor.userId?.name || 'this doctor'} on ${effectiveDate}.`,
        appointment: existing,
      });
    }

    // Generate Sequence & Token
    const counter = await QueueCounter.findOneAndUpdate(
      { doctorId: doctor._id, dateString: effectiveDate },
      { $inc: { lastSequence: 1 } },
      { new: true, upsert: true }
    );

    const seqNum = counter.lastSequence;
    const prefix = doctor.departmentId?.tokenPrefix || 'T';
    const tokenNumber = `${prefix}-${seqNum.toString().padStart(3, '0')}`;

    let selectedPriority = 'Normal';
    let priorityRank = 5;
    if (priority && ['Emergency', 'Urgent', 'Pregnant', 'Disability', 'Senior', 'Pediatric', 'Normal'].includes(priority)) {
      if (req.user.role === 'receptionist' || req.user.role === 'admin' || priority === 'Senior' || priority === 'Pediatric') {
        selectedPriority = priority;
        const rankMap = { Emergency: 1, Urgent: 2, Pregnant: 2, Disability: 3, Senior: 4, Pediatric: 4, Normal: 5 };
        priorityRank = rankMap[selectedPriority] || 5;
      }
    }

    const isToday = effectiveDate === todayStr;
    const initialStatus = isToday ? 'Waiting' : 'Scheduled';

    const newAppointment = await Appointment.create({
      patientId: effectivePatientId,
      doctorId: doctor._id,
      departmentId: doctor.departmentId?._id || departmentId,
      appointmentDate: effectiveDate,
      timeSlot: effectiveSlot,
      tokenNumber,
      patientName: name ? String(name).trim() : patientUser.name,
      patientAge: Number(age) || 30,
      patientGender: gender || patientUser.gender || 'Male',
      patientMobile: mobile ? String(mobile).trim() : patientUser.mobile || '',
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : patientUser.emergencyContact || '',
      reasonForVisit: String(reasonForVisit).trim(),
      symptomsDuration: symptomsDuration ? String(symptomsDuration).trim() : '1-2 days',
      existingConditions: existingConditions ? String(existingConditions).trim() : 'None',
      priority: selectedPriority,
      priorityReason: priorityReason || '',
      status: initialStatus,
      checkInTime: isToday ? new Date() : null,
      bookedBy: req.user.role || 'patient',
    });

    const io = req.app.get('socketio');

    // If appointment is for today, also create the active live Token in the Doctor's queue
    if (isToday) {
      const newToken = await Token.create({
        tokenNumber,
        sequenceNumber: seqNum,
        patientId: effectivePatientId,
        doctorId: doctor._id,
        departmentId: doctor.departmentId?._id || departmentId,
        patientName: newAppointment.patientName,
        patientAge: newAppointment.patientAge,
        patientGender: newAppointment.patientGender,
        patientMobile: newAppointment.patientMobile,
        reasonForVisit: newAppointment.reasonForVisit,
        symptomsDuration: newAppointment.symptomsDuration,
        existingConditions: newAppointment.existingConditions,
        emergencyContact: newAppointment.emergencyContact,
        priority: selectedPriority,
        priorityRank,
        priorityReason: priorityReason || '',
        status: 'Waiting',
        joinedTime: new Date(),
        dateString: todayStr,
        appointmentId: newAppointment._id,
      });

      newAppointment.tokenId = newToken._id;
      await newAppointment.save();

      await recalculateDoctorQueue(doctor._id, io);

      // Notify Patient
      await dispatchSmartNotification({
        userId: effectivePatientId,
        tokenId: newToken._id,
        title: 'Appointment Confirmed & Token Issued',
        message: `Your appointment with Dr. ${doctor.userId?.name || 'Physician'} is confirmed. Your queue token is ${tokenNumber} (${doctor.roomNumber}).`,
        type: 'success',
        io,
        tokenNumber,
        doctorName: doctor.userId?.name || 'Doctor',
        roomNumber: doctor.roomNumber,
      });

      // Notify Doctor
      if (doctor.userId?._id) {
        await dispatchSmartNotification({
          userId: doctor.userId._id,
          title: 'New Patient in Queue',
          message: `${newAppointment.patientName} booked an appointment for ${effectiveSlot} (Token: ${tokenNumber}).`,
          type: 'info',
          io,
          tokenNumber,
        });
      }
    } else {
      // Future appointment notification
      await dispatchSmartNotification({
        userId: effectivePatientId,
        title: 'Appointment Scheduled',
        message: `Your appointment with Dr. ${doctor.userId?.name || 'Physician'} is scheduled for ${effectiveDate} at ${effectiveSlot}. Token: ${tokenNumber}.`,
        type: 'info',
        io,
        tokenNumber,
        doctorName: doctor.userId?.name || 'Doctor',
        roomNumber: doctor.roomNumber,
      });
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'APPOINTMENT_BOOKED',
      targetType: 'Appointment',
      targetId: newAppointment._id,
      targetTokenNumber: tokenNumber,
      details: `Appointment booked with Dr. ${doctor.userId?.name || ''} on ${effectiveDate} at ${effectiveSlot}. Token: ${tokenNumber}`,
      req,
    });

    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email mobile' } })
      .populate('departmentId', 'name code tokenPrefix icon');

    res.status(201).json(populatedAppointment);
  } catch (error) {
    console.error('[Appointment Creation Error]:', error);
    res.status(500).json({ message: error.message || 'Failed to create appointment.' });
  }
};

// Get current patient's appointments
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email mobile' },
          { path: 'departmentId', select: 'name code tokenPrefix icon' },
        ],
      })
      .populate('departmentId', 'name code tokenPrefix icon')
      .populate('tokenId')
      .sort({ appointmentDate: -1, createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Doctor's appointments (Today or selected date)
export const getDoctorAppointments = async (req, res) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ userId: req.user._id });
    } else if (req.query.doctorId) {
      doctor = await Doctor.findById(req.query.doctorId);
    }

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    const { date } = req.query;
    const filter = { doctorId: doctor._id };
    if (date) {
      filter.appointmentDate = date;
    } else {
      filter.appointmentDate = getHospitalDateString();
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name email mobile patientId gender dob')
      .populate('departmentId', 'name code tokenPrefix')
      .populate('tokenId')
      .sort({ createdAt: 1 });

    res.json({ doctor, appointments, total: appointments.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Appointments (Receptionist / Admin)
export const getAllAppointments = async (req, res) => {
  try {
    const { doctorId, departmentId, date, status, search } = req.query;
    const filter = {};

    if (doctorId) filter.doctorId = doctorId;
    if (departmentId) filter.departmentId = departmentId;
    if (date) filter.appointmentDate = date;
    if (status) filter.status = status;

    if (search && search.trim()) {
      filter.$or = [
        { patientName: { $regex: search.trim(), $options: 'i' } },
        { tokenNumber: { $regex: search.trim(), $options: 'i' } },
        { patientMobile: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const appointments = await Appointment.find(filter)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
      .populate('departmentId', 'name code tokenPrefix icon')
      .populate('patientId', 'name email mobile patientId')
      .sort({ appointmentDate: -1, createdAt: -1 })
      .limit(200);

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel an appointment
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id).populate('doctorId');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Role check: patient can only cancel their own
    if (req.user.role === 'patient' && String(appointment.patientId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized to cancel this appointment.' });
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    const io = req.app.get('socketio');

    // If linked to active token today, cancel that too
    if (appointment.tokenId) {
      await Token.findByIdAndUpdate(appointment.tokenId, { status: 'Cancelled' });
      await recalculateDoctorQueue(appointment.doctorId._id, io);
    }

    // Send notifications
    await dispatchSmartNotification({
      userId: appointment.patientId,
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${appointment.doctorId?.userId?.name || 'Physician'} (Token: ${appointment.tokenNumber}) has been cancelled.`,
      type: 'warning',
      io,
      tokenNumber: appointment.tokenNumber,
    });

    res.json({ message: 'Appointment cancelled successfully.', appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check-in appointment to Doctor's active queue
export const checkInAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id).populate('doctorId').populate('departmentId');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const todayStr = getHospitalDateString();
    appointment.status = 'Waiting';
    appointment.checkInTime = new Date();
    appointment.appointmentDate = todayStr;

    // Check if token already exists
    let token = null;
    if (appointment.tokenId) {
      token = await Token.findById(appointment.tokenId);
    }

    const io = req.app.get('socketio');

    if (!token) {
      // Create token
      token = await Token.create({
        tokenNumber: appointment.tokenNumber,
        sequenceNumber: parseInt(appointment.tokenNumber.split('-')[1] || '1', 10),
        patientId: appointment.patientId,
        doctorId: appointment.doctorId._id,
        departmentId: appointment.departmentId._id,
        patientName: appointment.patientName,
        patientAge: appointment.patientAge,
        patientGender: appointment.patientGender,
        patientMobile: appointment.patientMobile,
        reasonForVisit: appointment.reasonForVisit,
        symptomsDuration: appointment.symptomsDuration,
        existingConditions: appointment.existingConditions,
        priority: appointment.priority,
        priorityRank: appointment.priority === 'Urgent' ? 2 : 5,
        status: 'Waiting',
        joinedTime: new Date(),
        dateString: todayStr,
        appointmentId: appointment._id,
      });

      appointment.tokenId = token._id;
    } else {
      token.status = 'Waiting';
      token.joinedTime = new Date();
      token.dateString = todayStr;
      await token.save();
    }

    await appointment.save();
    await recalculateDoctorQueue(appointment.doctorId._id, io);

    await dispatchSmartNotification({
      userId: appointment.patientId,
      title: 'Check-in Confirmed',
      message: `You have successfully checked in for Token ${appointment.tokenNumber}. Please wait in the waiting lounge.`,
      type: 'success',
      io,
      tokenNumber: appointment.tokenNumber,
    });

    res.json({ message: 'Patient checked in successfully.', appointment, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Clinical Notes / Diagnosis / Prescription by Doctor
export const updateClinicalNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { consultationNotes, diagnosis, prescription, vitals } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment record not found.' });
    }

    if (consultationNotes !== undefined) appointment.consultationNotes = consultationNotes;
    if (diagnosis !== undefined) appointment.diagnosis = diagnosis;
    if (prescription !== undefined) appointment.prescription = prescription;
    if (vitals !== undefined) appointment.vitals = { ...appointment.vitals, ...vitals };

    await appointment.save();

    if (appointment.tokenId) {
      await Token.findByIdAndUpdate(appointment.tokenId, {
        consultationNotes,
        diagnosis,
        prescription,
      });
    }

    res.json({ message: 'Clinical documentation saved successfully.', appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
