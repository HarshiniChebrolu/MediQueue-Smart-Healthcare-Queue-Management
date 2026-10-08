import express from 'express';
import {
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
} from '../controllers/announcementController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/active', getActiveAnnouncements);
router.post('/', protect, authorizeRoles('receptionist'), createAnnouncement);
router.put('/:id', protect, authorizeRoles('receptionist'), updateAnnouncement);

export default router;
