const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getUserProfile,
  updateProfile,
  updateMedicalInfo,
  updateNotificationPreferences,
  registerPushToken,
  unregisterPushToken
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

// Register/remove push notification tokens
router.post('/push-token', registerPushToken);
router.delete('/push-token', unregisterPushToken);

module.exports = router;
