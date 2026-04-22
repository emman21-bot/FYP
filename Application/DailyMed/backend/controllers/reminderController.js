const Reminder = require('../models/Reminder');
const Notification = require('../models/Notification');

// Create a new reminder
exports.createReminder = async (req, res) => {
  try {
    const { metricType, schedule, time, daysOfWeek, customMessage } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Validate required fields
    if (!metricType || !schedule || !time) {
      return res.status(400).json({ message: 'metricType, schedule, and time are required' });
    }

    // If weekly schedule, daysOfWeek is required
    if (schedule === 'weekly' && (!daysOfWeek || daysOfWeek.length === 0)) {
      return res.status(400).json({ message: 'daysOfWeek is required for weekly schedule' });
    }

    // Calculate next due date
    const nextDueAt = calculateNextDueDate(schedule, time, daysOfWeek);

    const reminder = await Reminder.create({
      userId,
      userEmail,
      metricType,
      schedule,
      time,
      daysOfWeek: schedule === 'weekly' ? daysOfWeek : undefined,
      customMessage,
      timezone: 'Asia/Karachi',
      isActive: true,
      nextDueAt,
      status: 'scheduled'
    });

    res.status(201).json({
      message: 'Reminder created successfully',
      reminder
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ message: 'Server error creating reminder', error: error.message });
  }
};

// Get all reminders for current user
exports.getReminders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { metricType, isActive } = req.query;

    const filter = { userId };
    if (metricType) filter.metricType = metricType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const reminders = await Reminder.find(filter).sort({ createdAt: -1 });

    res.json({ reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ message: 'Server error fetching reminders', error: error.message });
  }
};

// Get single reminder by ID
exports.getReminderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({ _id: id, userId });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.json({ reminder });
  } catch (error) {
    console.error('Error fetching reminder:', error);
    res.status(500).json({ message: 'Server error fetching reminder', error: error.message });
  }
};

// Update a reminder
exports.updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { metricType, schedule, time, daysOfWeek, isActive, customMessage } = req.body;

    const reminder = await Reminder.findOne({ _id: id, userId });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Update fields
    if (metricType !== undefined) reminder.metricType = metricType;
    if (schedule !== undefined) reminder.schedule = schedule;
    if (time !== undefined) reminder.time = time;
    if (daysOfWeek !== undefined) reminder.daysOfWeek = daysOfWeek;
    if (isActive !== undefined) reminder.isActive = isActive;
    if (customMessage !== undefined) reminder.customMessage = customMessage;

    // Recalculate next due date if schedule/time changed
    if (schedule || time || daysOfWeek) {
      reminder.nextDueAt = calculateNextDueDate(
        reminder.schedule,
        reminder.time,
        reminder.daysOfWeek
      );
    }

    await reminder.save();

    res.json({
      message: 'Reminder updated successfully',
      reminder
    });
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ message: 'Server error updating reminder', error: error.message });
  }
};

// Delete a reminder
exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOneAndDelete({ _id: id, userId });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ message: 'Server error deleting reminder', error: error.message });
  }
};

// Toggle reminder active status
exports.toggleReminderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await Reminder.findOne({ _id: id, userId });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    reminder.isActive = !reminder.isActive;
    await reminder.save();

    res.json({
      message: `Reminder ${reminder.isActive ? 'activated' : 'deactivated'} successfully`,
      reminder
    });
  } catch (error) {
    console.error('Error toggling reminder status:', error);
    res.status(500).json({ message: 'Server error toggling reminder status', error: error.message });
  }
};

// Helper function to calculate next due date
function calculateNextDueDate(schedule, time, daysOfWeek) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);

  let nextDue = new Date(now);
  nextDue.setHours(hours, minutes, 0, 0);

  // If time has passed today, move to next occurrence
  if (nextDue <= now) {
    if (schedule === 'daily') {
      nextDue.setDate(nextDue.getDate() + 1);
    } else if (schedule === 'weekly') {
      // Find next occurrence based on daysOfWeek
      const currentDay = nextDue.getDay();
      let daysToAdd = 1;
      for (let i = 1; i <= 7; i++) {
        const checkDay = (currentDay + i) % 7;
        if (daysOfWeek.includes(checkDay)) {
          daysToAdd = i;
          break;
        }
      }
      nextDue.setDate(nextDue.getDate() + daysToAdd);
    } else if (schedule === 'monthly') {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
  } else if (schedule === 'weekly') {
    // Check if today is in daysOfWeek
    const today = nextDue.getDay();
    if (!daysOfWeek.includes(today)) {
      // Find next valid day
      let daysToAdd = 1;
      for (let i = 1; i <= 7; i++) {
        const checkDay = (today + i) % 7;
        if (daysOfWeek.includes(checkDay)) {
          daysToAdd = i;
          break;
        }
      }
      nextDue.setDate(nextDue.getDate() + daysToAdd);
    }
  }

  return nextDue;
}

module.exports.calculateNextDueDate = calculateNextDueDate;
