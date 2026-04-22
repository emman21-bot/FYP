const express = require('express');
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  approveAppointment,
  declineAppointment,
  rescheduleAppointment,
  cancelAppointment,
  markAppointmentComplete,
  startInstantMeeting
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// General routes (Patient/Doctor based on role)
router.get('/', getAppointments); // Get all appointments (filtered by role)
router.get('/:id', getAppointmentById); // Get single appointment details

// Patient routes
router.post('/', authorize('patient'), createAppointment); // Create new appointment

// Doctor routes
router.patch('/:id/approve', authorize('doctor'), approveAppointment); // Approve appointment
router.patch('/:id/decline', authorize('doctor'), declineAppointment); // Decline appointment
router.post('/:id/start-instant-meeting', authorize('doctor'), startInstantMeeting); // Start instant meeting

// Both Doctor and Patient can reschedule/cancel/complete
router.patch('/:id/reschedule', rescheduleAppointment); // Reschedule appointment
router.delete('/:id', cancelAppointment); // Cancel appointment
router.patch('/:id/complete', markAppointmentComplete); // Mark as completed

module.exports = router;
