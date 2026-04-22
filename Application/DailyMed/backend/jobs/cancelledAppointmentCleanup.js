const cron = require('node-cron');
const Appointment = require('../models/Appointment');

/**
 * Auto-delete all appointments older than 30 days
 * Runs daily at midnight
 */
const startAppointmentCleanupCron = () => {
  // Run every day at 00:00 (midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('🗑️  Running appointment cleanup job...');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Delete all appointments older than 30 days regardless of status
      const result = await Appointment.deleteMany({
        updatedAt: { $lt: thirtyDaysAgo }
      });
      
      if (result.deletedCount > 0) {
        console.log(`✅ Deleted ${result.deletedCount} appointment(s) older than 30 days`);
      } else {
        console.log('✅ No old appointments to delete');
      }
    } catch (error) {
      console.error('❌ Error in appointment cleanup cron:', error);
    }
  });
  
  console.log('✅ Appointment cleanup cron job initialized (runs daily at midnight)');
};

module.exports = { startAppointmentCleanupCron };
