const express = require('express');
const router = express.Router();
const {
  getAnalyticsDashboard,
  getDashboardStats,
  getAllComplaints,
  getAdminComplaintById,
  updateComplaintStatus,
  assignDepartmentAndStaff,
  updatePriority,
  addAdminComment,
  resolveComplaint,
  reanalyzeComplaintWithAi,
  checkAndEscalateOverdueComplaints,
  linkMasterComplaint,
} = require('../controllers/adminController');

const {
  getDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  getAllStaff,
  getStaffByDepartment,
  createStaff,
  updateStaff,
  toggleStaffStatus,
} = require('../controllers/deptStaffController');

const { deleteComplaint } = require('../controllers/complaintController');

const { protect, requireAdmin } = require('../middleware/authMiddleware');

// All Admin routes require valid JWT authentication and Admin role
router.use(protect, requireAdmin);

// 1. Admin Analytics & KPI Metrics
router.get('/analytics', getAnalyticsDashboard);
router.get('/stats', getDashboardStats);

// 2. Department Management Routes
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.patch('/departments/:id/status', toggleDepartmentStatus);
router.patch('/departments/:id/toggle-status', toggleDepartmentStatus);
router.get('/departments/:departmentId/staff', getStaffByDepartment);

// 3. Staff Management Routes
router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.patch('/staff/:id/status', toggleStaffStatus);
router.patch('/staff/:id/toggle-status', toggleStaffStatus);

// 4. Complaint Management Routes
router.get('/complaints', getAllComplaints);
router.post('/complaints/check-escalations', checkAndEscalateOverdueComplaints);
router.get('/complaints/:id', getAdminComplaintById);
router.patch('/complaints/:id/status', updateComplaintStatus);
router.patch('/complaints/:id/assign', assignDepartmentAndStaff);
router.patch('/complaints/:id/priority', updatePriority);
router.post('/complaints/:id/comments', addAdminComment);
router.post('/complaints/:id/resolution', resolveComplaint);
router.post('/complaints/:id/resolve', resolveComplaint);
router.post('/complaints/:id/link-master', linkMasterComplaint);
router.post('/complaints/:id/ai-analyze', reanalyzeComplaintWithAi);
router.delete('/complaints/:id', deleteComplaint);

module.exports = router;
