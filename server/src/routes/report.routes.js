import express from 'express';
import {
  getDailyStats,
  getDepartmentReport,
  getDoctorReport,
  getETAAccuracyReport,
  getAuditLogs,
  exportReportPDF,
  exportReportCSV,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = express.Router();

router.get('/daily-stats', getDailyStats);
router.get('/department-report', protect, authorizeRoles('receptionist', 'admin'), getDepartmentReport);
router.get('/doctor-report', protect, authorizeRoles('receptionist', 'admin'), getDoctorReport);
router.get('/eta-accuracy', protect, authorizeRoles('receptionist', 'doctor', 'admin'), getETAAccuracyReport);
router.get('/audit-logs', protect, authorizeRoles('receptionist', 'admin'), getAuditLogs);
router.get('/export/pdf', protect, authorizeRoles('receptionist', 'admin'), exportReportPDF);
router.get('/export/csv', protect, authorizeRoles('receptionist', 'admin'), exportReportCSV);

export default router;
