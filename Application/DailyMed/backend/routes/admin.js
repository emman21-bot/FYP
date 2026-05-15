const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUserStatus,
  deleteUser,
  getUserStats,
  getUserHealthData,
  getUserAppointments,
  getUserMedications,
  getUserPredictions,
  bulkUpdateUserStatus,
  bulkDeleteUsers,
  getSystemStats,
  getAuditLogs,
  broadcastNotification
} = require('../controllers/adminController');
const { protect, authorizeAdmin } = require('../middlewares/auth');

// All admin routes require authentication AND admin role

// ===== USER MANAGEMENT ROUTES =====
router.get('/users', protect, authorizeAdmin, getAllUsers);
router.get('/users/:id', protect, authorizeAdmin, getUserById);
router.post('/users', protect, authorizeAdmin, createUser);
router.put('/users/:id/status', protect, authorizeAdmin, updateUserStatus);
router.delete('/users/:id', protect, authorizeAdmin, deleteUser);

// ===== BULK OPERATIONS =====
router.put('/users/bulk-status', protect, authorizeAdmin, bulkUpdateUserStatus);
router.delete('/users/bulk-delete', protect, authorizeAdmin, bulkDeleteUsers);

// ===== USER DATA VIEWING =====
router.get('/users/:id/health-data', protect, authorizeAdmin, getUserHealthData);
router.get('/users/:id/appointments', protect, authorizeAdmin, getUserAppointments);
router.get('/users/:id/medications', protect, authorizeAdmin, getUserMedications);
router.get('/users/:id/predictions', protect, authorizeAdmin, getUserPredictions);

// ===== STATISTICS & ANALYTICS =====
router.get('/stats', protect, authorizeAdmin, getUserStats);
router.get('/system-stats', protect, authorizeAdmin, getSystemStats);

// ===== AUDIT & MONITORING =====
router.get('/audit-logs', protect, authorizeAdmin, getAuditLogs);

// ===== BROADCAST & COMMUNICATION =====
router.post('/broadcast-notification', protect, authorizeAdmin, broadcastNotification);

module.exports = router;
