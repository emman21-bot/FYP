const express = require('express');
const router = express.Router();
const {
  getSystemSettings,
  updateSystemSettings,
  getAdminProfile,
  updateAdminProfile,
  changePassword
} = require('../controllers/adminSettingsController');
const { protect, authorizeAdmin } = require('../middlewares/auth');

// All routes require admin authentication
router.get('/settings', protect, authorizeAdmin, getSystemSettings);
router.put('/settings', protect, authorizeAdmin, updateSystemSettings);
router.get('/profile', protect, authorizeAdmin, getAdminProfile);
router.put('/profile', protect, authorizeAdmin, updateAdminProfile);
router.put('/change-password', protect, authorizeAdmin, changePassword);

module.exports = router;
