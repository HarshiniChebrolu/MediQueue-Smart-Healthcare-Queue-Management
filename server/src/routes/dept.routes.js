import express from 'express';
import { getDepartments, createDepartment, updateDepartment } from '../controllers/deptController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/', getDepartments);
router.post('/', protect, authorizeRoles('receptionist'), createDepartment);
router.put('/:id', protect, authorizeRoles('receptionist'), updateDepartment);

export default router;
