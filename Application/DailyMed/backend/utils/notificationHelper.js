const Notification = require('../models/Notification');

// Create notification
const createNotification = async ({ userId, userEmail, type, title, message, data = {} }) => {
  try {
    const notification = await Notification.create({
      userId,
      userEmail,
      type,
      title,
      message,
      data
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create multiple notifications
const createBulkNotifications = async (notifications) => {
  try {
    const created = await Notification.insertMany(notifications);
    return created;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

// Notification templates
const notificationTemplates = {
  appointmentRequest: (data) => ({
    type: 'appointment_request',
    title: 'New Appointment Request',
    message: `${data.patientName} has requested an appointment on ${new Date(data.appointmentDate).toLocaleDateString()} at ${data.timeSlot.startTime}`,
    data: {
      appointmentId: data.appointmentId,
      patientName: data.patientName,
      appointmentDate: data.appointmentDate,
      timeSlot: data.timeSlot
    }
  }),

  appointmentApproved: (data) => ({
    type: 'appointment_approved',
    title: 'Appointment Approved',
    message: `Dr. ${data.doctorName} has approved your appointment on ${new Date(data.appointmentDate).toLocaleDateString()} at ${data.timeSlot.startTime}. Zoom meeting link is ready!`,
    data: {
      appointmentId: data.appointmentId,
      doctorName: data.doctorName,
      appointmentDate: data.appointmentDate,
      timeSlot: data.timeSlot,
      zoomLink: data.zoomLink
    }
  }),

  appointmentDeclined: (data) => ({
    type: 'appointment_declined',
    title: 'Appointment Declined',
    message: `Dr. ${data.doctorName} has declined your appointment request. ${data.reason ? `Reason: ${data.reason}` : ''}`,
    data: {
      appointmentId: data.appointmentId,
      doctorName: data.doctorName,
      reason: data.reason || ''
    }
  }),

  appointmentRescheduled: (data) => ({
    type: 'appointment_rescheduled',
    title: 'Appointment Rescheduled',
    message: data.isPatient 
      ? `Dr. ${data.doctorName} has rescheduled your appointment to ${new Date(data.newDate).toLocaleDateString()} at ${data.newTimeSlot.startTime}`
      : `${data.patientName} has rescheduled the appointment to ${new Date(data.newDate).toLocaleDateString()} at ${data.newTimeSlot.startTime}`,
    data: {
      appointmentId: data.appointmentId,
      oldDate: data.oldDate,
      oldTimeSlot: data.oldTimeSlot,
      newDate: data.newDate,
      newTimeSlot: data.newTimeSlot,
      zoomLink: data.zoomLink
    }
  }),

  appointmentCancelled: (data) => ({
    type: 'appointment_cancelled',
    title: 'Appointment Cancelled',
    message: data.isDoctor
      ? `${data.patientName} has cancelled the appointment. ${data.reason ? `Reason: ${data.reason}` : ''}`
      : `Dr. ${data.doctorName} has cancelled the appointment. ${data.reason ? `Reason: ${data.reason}` : ''}`,
    data: {
      appointmentId: data.appointmentId,
      reason: data.reason || '',
      cancelledBy: data.cancelledBy
    }
  }),

  profileUpdated: (data) => ({
    type: 'profile_update',
    title: 'Profile Updated',
    message: 'Your profile has been updated successfully',
    data: {}
  }),

  availabilityUpdated: (data) => ({
    type: 'availability_update',
    title: 'Availability Updated',
    message: 'Your availability schedule has been updated successfully',
    data: {}
  })
};

module.exports = {
  createNotification,
  createBulkNotifications,
  notificationTemplates
};
