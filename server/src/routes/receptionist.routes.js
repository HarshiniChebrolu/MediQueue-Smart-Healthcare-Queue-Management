import express from 'express';
import {
  getReceptionists,
  createReceptionist,
  toggleReceptionistStatus,
} from '../controllers/receptionistController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin'), getReceptionists);
router.post('/', protect, authorizeRoles('admin'), createReceptionist);
router.put('/:id/status', protect, authorizeRoles('admin'), toggleReceptionistStatus);

export default router;
