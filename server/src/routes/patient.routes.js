import express from 'express';
import {
  getAllPatients,
  getPatientDetails,
  approvePatientRegistration,
  rejectPatientRegistration,
  togglePatientActiveStatus,
  searchPatients,
  registerWalkInPatient,
  sendWaitingMessage,
} from '../controllers/patientController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'receptionist'), getAllPatients);
router.get('/search', protect, authorizeRoles('receptionist', 'doctor', 'admin'), searchPatients);
router.get('/:id', protect, authorizeRoles('admin', 'receptionist', 'doctor'), getPatientDetails);
router.put('/:id/approve', protect, authorizeRoles('receptionist', 'admin'), approvePatientRegistration);
router.put('/:id/reject', protect, authorizeRoles('receptionist', 'admin'), rejectPatientRegistration);
router.put('/:id/status', protect, authorizeRoles('admin'), togglePatientActiveStatus);
router.post('/walkin', protect, authorizeRoles('receptionist', 'admin'), registerWalkInPatient);
router.post('/:id/waiting-message', sendWaitingMessage);

export default router;
