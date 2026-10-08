import express from 'express';
import { registerPatient, loginUser, googleAuth, completePatientProfile, checkUserExists, getMe, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/check-exists', checkUserExists);
router.post('/register', registerPatient);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/complete-profile', protect, completePatientProfile);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
