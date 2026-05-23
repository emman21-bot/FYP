const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getUserProfile,
  updateProfile,
  updateMedicalInfo,
  updateNotificationPreferences
} = require('../controllers/userProfileController');

// All routes require authentication
router.use(protect);

// Get user profile/settings
router.get('/profile', getUserProfile);

// Update profile information
router.put('/profile', updateProfile);

// Update medical information
router.put('/medical', updateMedicalInfo);

// Update notification preferences
router.put('/notifications', updateNotificationPreferences);

module.exports = router;
