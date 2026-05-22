const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { emailQueue } = require('../utils/queue');
const { appointmentReminderTemplate } = require('../utils/emailTemplates');

// Find appointments ~24 hours ahead and enqueue reminder emails
const sendAppointmentReminders = async () => {
  try {
    console.log('🔔 Starting appointment reminder job...');

    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour window

    // Find approved appointments that haven't had reminders sent
    const upcoming = await Appointment.find({
      status: 'approved',
      reminderSent: false,
      appointmentDate: { $gte: start, $lt: end }
    });

    console.log(`📧 Found ${upcoming.length} appointments to remind (window ${start.toISOString()} - ${end.toISOString()})`);

    for (const appt of upcoming) {
      try {
        const patientTemplate = appointmentReminderTemplate({
          recipientName: appt.patientName,
          recipientType: 'patient',
          doctorName: appt.doctorName,
          patientName: appt.patientName,
          appointmentDate: appt.appointmentDate,
          timeSlot: appt.timeSlot,
          zoomLink: appt.zoomMeetingLink,
          zoomPassword: appt.zoomPassword
        });

        const doctorTemplate = appointmentReminderTemplate({
          recipientName: appt.doctorName,
          recipientType: 'doctor',
          doctorName: appt.doctorName,
          patientName: appt.patientName,
          appointmentDate: appt.appointmentDate,
          timeSlot: appt.timeSlot,
          zoomLink: appt.zoomMeetingLink,
          zoomPassword: appt.zoomPassword
        });

        // Enqueue patient email
        await emailQueue.add('appointmentReminder', {
          email: appt.patientEmail,
          subject: patientTemplate.subject,
          html: patientTemplate.html
        }, { attempts: 5, backoff: { type: 'exponential', delay: 1000 * 60 } });

        // Enqueue doctor email
        await emailQueue.add('appointmentReminder', {
          email: appt.doctorEmail,
          subject: doctorTemplate.subject,
          html: doctorTemplate.html
        }, { attempts: 5, backoff: { type: 'exponential', delay: 1000 * 60 } });

        // Mark reminderSent true so we don't double-send
        appt.reminderSent = true;
        await appt.save();

        console.log(`✅ Enqueued reminders for appointment ${appt._id}`);
      } catch (err) {
        console.error(`❌ Failed to enqueue reminder for appointment ${appt._id}:`, err.message);
      }
    }

    console.log('✨ Appointment reminder job completed');
  } catch (err) {
    console.error('❌ Error in appointment reminder job:', err);
  }
};

const startAppointmentReminderCron = () => {
  // Run every hour at minute 5 to pick up next-24h appointments
  cron.schedule('5 * * * *', () => {
    console.log('\n⏰ ===== Appointment Reminder Cron Triggered =====');
    sendAppointmentReminders();
  });

  console.log('✅ Appointment reminder cron initialized (runs hourly)');
};

module.exports = {
  startAppointmentReminderCron,
  sendAppointmentReminders
};
