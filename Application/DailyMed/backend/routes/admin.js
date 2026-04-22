const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUserStatus,
  deleteUser,
  getUserStats
} = require('../controllers/adminController');
const { protect } = require('../middlewares/auth');

// Note: In production, add admin role check middleware
// For now, just using protect middleware

// User management routes
router.get('/users', protect, getAllUsers);
router.get('/users/:id', protect, getUserById);
router.post('/users', protect, createUser);
router.put('/users/:id/status', protect, updateUserStatus);
router.delete('/users/:id', protect, deleteUser);

// Statistics route
router.get('/stats', protect, getUserStats);

module.exports = router;
