const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  toggleReminderStatus
} = require('../controllers/reminderController');

// Create reminder
router.post('/', protect, createReminder);

// Get all reminders for user
router.get('/', protect, getReminders);

// Get single reminder
router.get('/:id', protect, getReminderById);

// Update reminder
router.put('/:id', protect, updateReminder);

// Delete reminder
router.delete('/:id', protect, deleteReminder);

// Toggle reminder active status
router.patch('/:id/toggle', protect, toggleReminderStatus);

module.exports = router;
