const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const { createZoomMeeting, deleteZoomMeeting, updateZoomMeeting, createInstantZoomMeeting } = require('../utils/zoomHelper');
const { createNotification, notificationTemplates } = require('../utils/notificationHelper');
const { appointmentApprovedTemplate, appointmentReminderTemplate } = require('../utils/emailTemplates');
let emailQueue;
try {
  ({ emailQueue } = require('../utils/queue') || {});
} catch (err) {
  // queue may be unavailable in some environments
}

// @desc    Create new appointment (Patient)
// @route   POST /api/appointments
// @access  Private (Patient only)
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, reason } = req.body;

    // Validation
    if (!doctorId || !appointmentDate || !timeSlot?.startTime || !timeSlot?.endTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: doctorId, appointmentDate, timeSlot, and reason'
      });
    }

    // Get doctor profile
    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId, isActive: true });
    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or inactive'
      });
    }

    // Get doctor user details
    const doctorUser = await User.findById(doctorId);
    if (!doctorUser) {
      return res.status(404).json({
        success: false,
        message: 'Doctor user not found'
      });
    }

    // Check if the time slot is in the future
    const [startHour, startMinute] = timeSlot.startTime.split(':');
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const now = new Date();
    
    // Add a 5-minute buffer to avoid issues with slight time differences
    const bufferTime = new Date(now.getTime() - 5 * 60000);
    
    if (appointmentDateTime < bufferTime) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book appointments in the past'
      });
    }

    // Check if slot is already approved/confirmed (allow multiple pending requests)
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: {
        $gte: new Date(appointmentDate).setHours(0, 0, 0, 0),
        $lt: new Date(appointmentDate).setHours(23, 59, 59, 999)
      },
      'timeSlot.startTime': timeSlot.startTime,
      'timeSlot.endTime': timeSlot.endTime,
      status: { $in: ['approved', 'rescheduled'] } // Only check approved slots
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This time slot has been confirmed with another patient. Please select a different time.'
      });
    }

    // Check if this patient already has a pending or approved appointment with this doctor
    const patientExistingAppointment = await Appointment.findOne({
      patientId: req.user._id,
      doctorId,
      status: { $in: ['pending', 'approved'] }
    });

    if (patientExistingAppointment) {
      const statusText = patientExistingAppointment.status === 'pending' ? 'pending approval' : 'confirmed';
      return res.status(400).json({
        success: false,
        message: `You already have a ${statusText} appointment with this doctor. Please wait for the current appointment to complete before booking another.`
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientId: req.user._id,
      patientEmail: req.user.email,
      patientName: req.user.fullName || req.user.email.split('@')[0],
      doctorId: doctorProfile.userId,
      doctorEmail: doctorProfile.userEmail,
      doctorName: doctorProfile.fullName,
      doctorExpertise: doctorProfile.expertise,
      appointmentDate,
      timeSlot,
      reason,
      status: 'pending'
    });

    // Send in-app notification to doctor
    try {
      const notificationData = notificationTemplates.appointmentRequest({
        appointmentId: appointment._id,
        patientName: appointment.patientName,
        appointmentDate,
        timeSlot,
        reason
      });

      await createNotification({
        userId: doctorProfile.userId,
        userEmail: doctorProfile.userEmail,
        ...notificationData
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the appointment creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Appointment request sent successfully. Waiting for doctor approval',
      data: appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating appointment',
      error: error.message
    });
  }
};

// @desc    Get appointments (Patient/Doctor based on role)
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const userRole = req.user.role;

    let query = {};

    // Filter by user role
    if (userRole === 'patient') {
      query.patientId = req.user._id;
    } else if (userRole === 'doctor') {
      query.doctorId = req.user._id;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter upcoming appointments
    if (upcoming === 'true') {
      query.appointmentDate = { $gte: new Date() };
      query.status = { $in: ['pending', 'approved', 'rescheduled'] };
    }

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: 1, 'timeSlot.startTime': 1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointments',
      error: error.message
    });
  }
};

// @desc    Approve appointment (Doctor)
// @route   PATCH /api/appointments/:id/approve
// @access  Private (Doctor only)
exports.approveAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this appointment'
      });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve - appointment status is ${appointment.status}`
      });
    }

    // Check if the time slot is still available (another appointment might have been approved)
    const conflictingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      'timeSlot.startTime': appointment.timeSlot.startTime,
      'timeSlot.endTime': appointment.timeSlot.endTime,
      status: { $in: ['approved', 'rescheduled'] },
      _id: { $ne: appointment._id }
    });

    if (conflictingAppointment) {
      // Mark this appointment as declined automatically
      appointment.status = 'declined';
      appointment.declineReason = 'Time slot was already confirmed with another patient';
      await appointment.save();
      
      return res.status(400).json({
        success: false,
        message: 'This time slot has been confirmed with another patient. The appointment request has been declined.'
      });
    }

    // Check if patient already has an approved appointment with this doctor
    const patientActiveAppointment = await Appointment.findOne({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      status: { $in: ['approved'] },
      _id: { $ne: appointment._id }
    });

    if (patientActiveAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This patient already has a confirmed appointment with you. Please complete or cancel their existing appointment before approving another.'
      });
    }

    // Create Zoom meeting
    let zoomData;
    try {
      zoomData = await createZoomMeeting({
        doctorName: appointment.doctorName,
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot
      });

      appointment.zoomMeetingLink = zoomData.meetingLink;
      appointment.zoomMeetingId = zoomData.meetingId;
      appointment.zoomPassword = zoomData.password;
      appointment.zoomHostUrl = zoomData.startUrl; // Host URL for doctor
    } catch (zoomError) {
      console.error('Error creating Zoom meeting:', zoomError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create Zoom meeting. Please try again'
      });
    }

    appointment.status = 'approved';
    await appointment.save();

    // Schedule a delayed reminder job for 24 hours before the appointment (if possible)
    try {
      const startParts = appointment.timeSlot.startTime.split(':');
      const apptDateTime = new Date(appointment.appointmentDate);
      apptDateTime.setHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);

      const reminderAt = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000);
      const now = new Date();

      if (reminderAt > now) {
        const delay = reminderAt.getTime() - now.getTime();
        if ((process.env.USE_EMAIL_QUEUE || 'false').toLowerCase() === 'true' && emailQueue) {
          const patientTemplate = appointmentReminderTemplate({
            recipientName: appointment.patientName,
            recipientType: 'patient',
            doctorName: appointment.doctorName,
            patientName: appointment.patientName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            zoomLink: appointment.zoomMeetingLink,
            zoomPassword: appointment.zoomPassword
          });

          const doctorTemplate = appointmentReminderTemplate({
            recipientName: appointment.doctorName,
            recipientType: 'doctor',
            doctorName: appointment.doctorName,
            patientName: appointment.patientName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            zoomLink: appointment.zoomMeetingLink,
            zoomPassword: appointment.zoomPassword
          });

          await emailQueue.add('appointmentReminder', {
            email: appointment.patientEmail,
            subject: patientTemplate.subject,
            html: patientTemplate.html
          }, { delay, attempts: 3, backoff: { type: 'exponential', delay: 60000 } });

          await emailQueue.add('appointmentReminder', {
            email: appointment.doctorEmail,
            subject: doctorTemplate.subject,
            html: doctorTemplate.html
          }, { delay, attempts: 3, backoff: { type: 'exponential', delay: 60000 } });

          // Mark reminder scheduled so cron won't duplicate
          appointment.reminderSent = true;
          await appointment.save();
          console.log(`⏳ Scheduled reminder for appointment ${appointment._id} at ${reminderAt.toISOString()}`);
        }
      }
    } catch (schedErr) {
      console.error('Error scheduling reminder job:', schedErr);
    }

    // Send notification to patient and enqueue/send approval email
    try {
      const patientNotification = notificationTemplates.appointmentApproved({
        appointmentId: appointment._id,
        doctorName: appointment.doctorName,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        zoomLink: appointment.zoomMeetingLink
      });

      await createNotification({
        userId: appointment.patientId,
        userEmail: appointment.patientEmail,
        ...patientNotification
      });

      // Build email template
      const emailTemplate = appointmentApprovedTemplate({
        patientName: appointment.patientName,
        doctorName: appointment.doctorName,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        zoomLink: appointment.zoomMeetingLink,
        zoomPassword: appointment.zoomPassword
      });

      // Enqueue email if queue enabled, otherwise send directly
      if ((process.env.USE_EMAIL_QUEUE || 'false').toLowerCase() === 'true' && emailQueue) {
        await emailQueue.add('sendEmail', {
          email: appointment.patientEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        }, { attempts: 5, backoff: { type: 'exponential', delay: 60000 } });
        console.log('📥 Enqueued appointment approval email for', appointment.patientEmail);
      } else {
        try {
          const { sendEmail } = require('../utils/emailHelper');
          await sendEmail({ email: appointment.patientEmail, subject: emailTemplate.subject, html: emailTemplate.html });
          console.log('✉️ Sent appointment approval email to', appointment.patientEmail);
        } catch (emailErr) {
          console.error('Error sending approval email directly:', emailErr);
        }
      }
    } catch (notificationError) {
      console.error('Error creating notification or sending email:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment approved successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error approving appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving appointment',
      error: error.message
    });
  }
};

// @desc    Decline appointment (Doctor)
// @route   PATCH /api/appointments/:id/decline
// @access  Private (Doctor only)
exports.declineAppointment = async (req, res) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to decline this appointment'
      });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot decline appointment with status: ${appointment.status}`
      });
    }

    appointment.status = 'declined';
    appointment.cancellationReason = reason || '';
    await appointment.save();

    // Send notification to patient
    try {
      const patientNotification = notificationTemplates.appointmentDeclined({
        appointmentId: appointment._id,
        doctorName: appointment.doctorName,
        reason: reason || ''
      });

      await createNotification({
        userId: appointment.patientId,
        userEmail: appointment.patientEmail,
        ...patientNotification
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment declined successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error declining appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while declining appointment',
      error: error.message
    });
  }
};

// @desc    Reschedule appointment (Doctor/Patient)
// @route   PATCH /api/appointments/:id/reschedule
// @access  Private
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { newDate, newTimeSlot, reason } = req.body;

    if (!newDate || !newTimeSlot?.startTime || !newTimeSlot?.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide new date and time slot'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check authorization
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isPatient = appointment.patientId.toString() === req.user._id.toString();

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reschedule this appointment'
      });
    }

    if (!['pending', 'approved'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule appointment with status: ${appointment.status}`
      });
    }

    // Store old date/time for email
    const oldDate = appointment.appointmentDate;
    const oldTimeSlot = appointment.timeSlot;

    // Update appointment
    appointment.appointmentDate = newDate;
    appointment.timeSlot = newTimeSlot;
    appointment.status = 'rescheduled';
    appointment.rescheduleRequest = {
      isRescheduled: true,
      newDate,
      newTimeSlot,
      requestedBy: isDoctor ? 'doctor' : 'patient',
      reason: reason || ''
    };

    // Update Zoom meeting if it exists
    if (appointment.zoomMeetingId) {
      try {
        await updateZoomMeeting(appointment.zoomMeetingId, {
          appointmentDate: newDate,
          timeSlot: newTimeSlot
        });
      } catch (zoomError) {
        console.error('Error updating Zoom meeting:', zoomError);
        // Continue even if Zoom update fails
      }
    } else if (appointment.status === 'approved') {
      // Create new Zoom meeting if approved but no meeting exists
      try {
        const zoomData = await createZoomMeeting({
          doctorName: appointment.doctorName,
          patientName: appointment.patientName,
          appointmentDate: newDate,
          timeSlot: newTimeSlot
        });

        appointment.zoomMeetingLink = zoomData.meetingLink;
        appointment.zoomMeetingId = zoomData.meetingId;
        appointment.zoomPassword = zoomData.password;
        appointment.zoomHostUrl = zoomData.startUrl; // Host URL for doctor
      } catch (zoomError) {
        console.error('Error creating Zoom meeting:', zoomError);
      }
    }

    await appointment.save();

    // Send emails to both parties
    try {
      // Email to patient
      const patientEmailTemplate = appointmentRescheduledTemplate({
        recipientName: appointment.patientName,
        recipientType: 'patient',
        doctorName: appointment.doctorName,
        patientName: appointment.patientName,
        oldDate,
        oldTimeSlot,
        newDate,
        newTimeSlot,
        rescheduleReason: reason || '',
        zoomLink: appointment.zoomMeetingLink,
        zoomPassword: appointment.zoomPassword
      });

      // Send notifications to both parties
      const patientNotification = notificationTemplates.appointmentRescheduled({
        appointmentId: appointment._id,
        isPatient: true,
        doctorName: appointment.doctorName,
        oldDate,
        oldTimeSlot,
        newDate,
        newTimeSlot,
        zoomLink: appointment.zoomMeetingLink
      });

      const doctorNotification = notificationTemplates.appointmentRescheduled({
        appointmentId: appointment._id,
        isPatient: false,
        patientName: appointment.patientName,
        oldDate,
        oldTimeSlot,
        newDate,
        newTimeSlot,
        zoomLink: appointment.zoomMeetingLink
      });

      await createNotification({
        userId: appointment.patientId,
        userEmail: appointment.patientEmail,
        ...patientNotification
      });

      await createNotification({
        userId: appointment.doctorId,
        userEmail: appointment.doctorEmail,
        ...doctorNotification
      });
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rescheduling appointment',
      error: error.message
    });
  }
};

// @desc    Cancel appointment (Doctor/Patient)
// @route   DELETE /api/appointments/:id
// @access  Private
exports.cancelAppointment = async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check authorization
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isPatient = appointment.patientId.toString() === req.user._id.toString();

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this appointment'
      });
    }

    // If patient is cancelling an approved appointment, require reason
    if (isPatient && appointment.status === 'approved' && !cancellationReason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for cancellation',
        requireReason: true
      });
    }

    // Delete Zoom meeting if it exists
    if (appointment.zoomMeetingId) {
      try {
        await deleteZoomMeeting(appointment.zoomMeetingId);
      } catch (zoomError) {
        console.error('Error deleting Zoom meeting:', zoomError);
        // Continue even if Zoom deletion fails
      }
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = isDoctor ? 'doctor' : 'patient';
    appointment.cancellationReason = cancellationReason || '';
    await appointment.save();

    // Send notifications to both parties
    try {
      const cancelledByName = isDoctor ? appointment.doctorName : appointment.patientName;

      const patientNotification = notificationTemplates.appointmentCancelled({
        appointmentId: appointment._id,
        isPatient: true,
        doctorName: appointment.doctorName,
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        cancelledBy: cancelledByName,
        cancellationReason: cancellationReason || ''
      });

      const doctorNotification = notificationTemplates.appointmentCancelled({
        appointmentId: appointment._id,
        isPatient: false,
        doctorName: appointment.doctorName,
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        cancelledBy: cancelledByName,
        cancellationReason: cancellationReason || ''
      });

      await createNotification({
        userId: appointment.patientId,
        userEmail: appointment.patientEmail,
        ...patientNotification
      });

      await createNotification({
        userId: appointment.doctorId,
        userEmail: appointment.doctorEmail,
        ...doctorNotification
      });
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling appointment',
      error: error.message
    });
  }
};

// @desc    Get single appointment details
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check authorization
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isPatient = appointment.patientId.toString() === req.user._id.toString();

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this appointment'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error getting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment',
      error: error.message
    });
  }
};

// @desc    Mark appointment as completed
// @route   PATCH /api/appointments/:id/complete
// @access  Private (Doctor or Patient)
exports.markAppointmentComplete = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check authorization - either doctor or patient can mark as complete
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isPatient = appointment.patientId.toString() === req.user._id.toString();

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this appointment'
      });
    }

    // Only approved or rescheduled appointments can be marked as completed
    if (appointment.status !== 'approved' && appointment.status !== 'rescheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark ${appointment.status} appointment as completed. Only approved or rescheduled appointments can be completed.`
      });
    }

    // Update appointment status
    appointment.status = 'completed';
    appointment.completedAt = new Date();
    await appointment.save();

    // Send notifications to both parties
    try {
      const completedBy = isDoctor ? 'doctor' : 'patient';
      const completedByName = isDoctor ? appointment.doctorName : appointment.patientName;

      // Notification to patient
      const patientNotification = {
        type: 'appointment_completed',
        title: 'Appointment Completed',
        message: `Your appointment with Dr. ${appointment.doctorName} has been marked as completed by ${completedBy === 'doctor' ? 'the doctor' : 'you'}.`,
        data: { appointmentId: appointment._id }
      };

      // Notification to doctor
      const doctorNotification = {
        type: 'appointment_completed',
        title: 'Appointment Completed',
        message: `Appointment with ${appointment.patientName} has been marked as completed by ${completedBy === 'patient' ? 'the patient' : 'you'}.`,
        data: { appointmentId: appointment._id }
      };

      await createNotification({
        userId: appointment.patientId,
        userEmail: appointment.patientEmail,
        ...patientNotification
      });

      await createNotification({
        userId: appointment.doctorId,
        userEmail: appointment.doctorEmail,
        ...doctorNotification
      });
    } catch (notificationError) {
      console.error('Error creating completion notifications:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment marked as completed successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error marking appointment as complete:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking appointment as complete',
      error: error.message
    });
  }
};

// @desc    Start instant meeting (Doctor only)
// @route   POST /api/appointments/:id/start-instant-meeting
// @access  Private (Doctor only)
exports.startInstantMeeting = async (req, res) => {
  try {
    const appointmentId = req.params.id;

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'fullName')
      .populate('doctorId', 'fullName');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify the user is the doctor for this appointment
    if (appointment.doctorId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to start this meeting'
      });
    }

    // Check if appointment is approved
    if (appointment.status !== 'approved' && appointment.status !== 'rescheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot start meeting. Appointment status is: ${appointment.status}`
      });
    }

    // Delete old scheduled meeting if exists
    if (appointment.zoomMeetingId) {
      try {
        await deleteZoomMeeting(appointment.zoomMeetingId);
        console.log('Old scheduled meeting deleted');
      } catch (deleteError) {
        console.error('Error deleting old meeting:', deleteError);
        // Continue anyway
      }
    }

    // Create instant Zoom meeting
    const zoomMeeting = await createInstantZoomMeeting(
      appointment.doctorId.fullName,
      appointment.patientId.fullName
    );

    // Update appointment with instant meeting details
    appointment.zoomMeetingId = zoomMeeting.meetingId;
    appointment.zoomMeetingLink = zoomMeeting.meetingLink;
    appointment.zoomPassword = zoomMeeting.password;
    appointment.zoomHostUrl = zoomMeeting.startUrl;

    await appointment.save();

    // Notify patient about the instant meeting
    try {
      await createNotification({
        userId: appointment.patientId._id,
        userEmail: appointment.patientEmail,
        title: 'Meeting Started',
        message: `Dr. ${appointment.doctorId.fullName} has started your appointment. Join now!`,
        type: 'appointment_started',
        data: { appointmentId: appointment._id }
      });
    } catch (notificationError) {
      console.error('Error sending meeting start notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Instant meeting created successfully',
      data: {
        appointmentId: appointment._id,
        hostUrl: zoomMeeting.startUrl,
        patientJoinUrl: zoomMeeting.meetingLink,
        password: zoomMeeting.password
      }
    });
  } catch (error) {
    console.error('Error starting instant meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting instant meeting',
      error: error.message
    });
  }
};
