import express from 'express';
import {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAllAppointments,
  cancelAppointment,
  checkInAppointment,
  updateClinicalNotes,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/', protect, createAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/doctor', protect, authorizeRoles('doctor', 'receptionist', 'admin'), getDoctorAppointments);
router.get('/all', protect, authorizeRoles('receptionist', 'admin'), getAllAppointments);
router.put('/:id/cancel', protect, cancelAppointment);
router.put('/:id/checkin', protect, authorizeRoles('doctor', 'receptionist', 'admin'), checkInAppointment);
router.put('/:id/clinical-notes', protect, authorizeRoles('doctor'), updateClinicalNotes);

export default router;
