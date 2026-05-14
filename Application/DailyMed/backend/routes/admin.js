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
const { protect } = require('../middlewares/auth');

// Note: In production, add admin role check middleware
// For now, just using protect middleware

// ===== USER MANAGEMENT ROUTES =====
router.get('/users', protect, getAllUsers);
router.get('/users/:id', protect, getUserById);
router.post('/users', protect, createUser);
router.put('/users/:id/status', protect, updateUserStatus);
router.delete('/users/:id', protect, deleteUser);

// ===== BULK OPERATIONS =====
router.put('/users/bulk-status', protect, bulkUpdateUserStatus);
router.delete('/users/bulk-delete', protect, bulkDeleteUsers);

// ===== USER DATA VIEWING =====
router.get('/users/:id/health-data', protect, getUserHealthData);
router.get('/users/:id/appointments', protect, getUserAppointments);
router.get('/users/:id/medications', protect, getUserMedications);
router.get('/users/:id/predictions', protect, getUserPredictions);

// ===== STATISTICS & ANALYTICS =====
router.get('/stats', protect, getUserStats);
router.get('/system-stats', protect, getSystemStats);

// ===== AUDIT & MONITORING =====
router.get('/audit-logs', protect, getAuditLogs);

// ===== BROADCAST & COMMUNICATION =====
router.post('/broadcast-notification', protect, broadcastNotification);

module.exports = router;
