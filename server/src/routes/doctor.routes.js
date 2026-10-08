import express from 'express';
import {
  getDoctors,
  getDoctorById,
  updateDoctorStatus,
  createDoctor,
  updateDoctorByReceptionist,
} from '../controllers/doctorController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.put('/status', protect, authorizeRoles('doctor', 'receptionist', 'admin'), updateDoctorStatus);
router.post('/', protect, authorizeRoles('receptionist', 'admin'), createDoctor);
router.put('/:id', protect, authorizeRoles('receptionist', 'admin'), updateDoctorByReceptionist);

export default router;
