import express from 'express';
import {
  joinQueue,
  callNextPatient,
  patientAttended,
  endConsultation,
  finishConsultationAndCallNext,
  cancelToken,
  getDoctorQueue,
  getPatientActiveToken,
  getPatientQueueHistory,
  getDoctorQueueHistory,
  getReceptionistQueueHistory,
  getPublicQueueDisplay,
  updateNotificationPreference,
  handleMissedCallTimeout,
} from '../controllers/queueController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/public-display', getPublicQueueDisplay);
router.post('/join', protect, joinQueue);
router.post('/call-next', protect, authorizeRoles('doctor', 'receptionist', 'admin'), callNextPatient);
router.post('/call-next/:doctorId', protect, authorizeRoles('doctor', 'receptionist', 'admin'), callNextPatient);
router.post('/patient-attended', protect, authorizeRoles('doctor', 'receptionist', 'admin'), patientAttended);
router.post('/end-consultation', protect, authorizeRoles('doctor', 'receptionist', 'admin'), endConsultation);
router.post('/finish-and-call-next', protect, authorizeRoles('doctor', 'receptionist', 'admin'), finishConsultationAndCallNext);
router.put('/cancel/:id', protect, cancelToken);
router.put('/preference/:id', protect, updateNotificationPreference);
router.put('/missed-call-timeout/:id', protect, authorizeRoles('doctor', 'receptionist', 'admin'), handleMissedCallTimeout);

router.get('/doctor-queue/single', protect, authorizeRoles('doctor', 'receptionist', 'admin'), getDoctorQueue);
router.get('/doctor-queue/:doctorId', protect, authorizeRoles('doctor', 'receptionist', 'admin'), getDoctorQueue);
router.get('/patient-active', protect, getPatientActiveToken);
router.get('/patient-history', protect, getPatientQueueHistory);
router.get('/doctor-history', protect, authorizeRoles('doctor', 'receptionist', 'admin'), getDoctorQueueHistory);
router.get('/receptionist-history', protect, authorizeRoles('receptionist', 'admin'), getReceptionistQueueHistory);

export default router;
