import express from 'express';
import {
  submitPriorityRequest,
  getPriorityRequests,
  reviewPriorityRequest,
} from '../controllers/priorityController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.post('/request', protect, submitPriorityRequest);
router.get('/requests', protect, authorizeRoles('receptionist', 'doctor', 'admin'), getPriorityRequests);
router.get('/list', protect, authorizeRoles('receptionist', 'doctor', 'admin'), getPriorityRequests);
router.put('/review/:id', protect, authorizeRoles('receptionist', 'admin'), reviewPriorityRequest);

export default router;
