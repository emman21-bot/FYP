// Email templates for appointment notifications

const appointmentRequestTemplate = (data) => {
  const { doctorName, patientName, patientEmail, appointmentDate, timeSlot, reason } = data;
  
  return {
    subject: `New Appointment Request from ${patientName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007AFF; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #007AFF; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Appointment Request</h2>
          </div>
          <div class="content">
            <p>Dear Dr. ${doctorName},</p>
            <p>You have received a new appointment request from a patient.</p>
            
            <div class="info-box">
              <h3>Patient Details:</h3>
              <p><strong>Name:</strong> ${patientName}</p>
              <p><strong>Email:</strong> ${patientEmail}</p>
            </div>
            
            <div class="info-box">
              <h3>Appointment Details:</h3>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${timeSlot.startTime} - ${timeSlot.endTime}</p>
              <p><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p>Please log in to your DailyMed dashboard to review and respond to this appointment request.</p>
            
            <div class="footer">
              <p>This is an automated email from DailyMed. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const appointmentApprovedTemplate = (data) => {
  const { patientName, doctorName, appointmentDate, timeSlot, zoomLink, zoomPassword } = data;
  
  return {
    subject: `Appointment Confirmed with Dr. ${doctorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
          .zoom-box { background-color: #E3F2FD; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✓ Appointment Confirmed</h2>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>Great news! Your appointment request has been approved by Dr. ${doctorName}.</p>
            
            <div class="info-box">
              <h3>Appointment Details:</h3>
              <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${timeSlot.startTime} - ${timeSlot.endTime} (GMT+5)</p>
            </div>
            
            <div class="zoom-box">
              <h3>📹 Join Your Virtual Consultation:</h3>
              <p><strong>Meeting Link:</strong></p>
              <a href="${zoomLink}" class="button">Join Zoom Meeting</a>
              <p><strong>Meeting Password:</strong> ${zoomPassword || 'Not required'}</p>
              <p style="font-size: 12px; color: #666;">Please join the meeting at the scheduled time. It's recommended to join 2-3 minutes early.</p>
            </div>
            
            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>Please ensure you have a stable internet connection</li>
              <li>Test your camera and microphone before the meeting</li>
              <li>Keep your medical records handy for reference</li>
            </ul>
            
            <div class="footer">
              <p>This is an automated email from DailyMed. Please do not reply to this email.</p>
              <p>If you need to reschedule or cancel, please do so through the app.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const appointmentDeclinedTemplate = (data) => {
  const { patientName, doctorName, appointmentDate, timeSlot, reason } = data;
  
  return {
    subject: `Appointment Request Declined - Dr. ${doctorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Appointment Request Declined</h2>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>We regret to inform you that your appointment request with Dr. ${doctorName} has been declined.</p>
            
            <div class="info-box">
              <h3>Requested Appointment:</h3>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${timeSlot.startTime} - ${timeSlot.endTime}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            <p>We apologize for any inconvenience. You may:</p>
            <ul>
              <li>Try booking a different time slot</li>
              <li>Contact the doctor's office directly</li>
              <li>Search for other available doctors in the app</li>
            </ul>
            
            <div class="footer">
              <p>This is an automated email from DailyMed. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const appointmentRescheduledTemplate = (data) => {
  const { recipientName, recipientType, doctorName, patientName, oldDate, oldTimeSlot, newDate, newTimeSlot, rescheduleReason, zoomLink, zoomPassword } = data;
  
  return {
    subject: `Appointment Rescheduled with ${recipientType === 'patient' ? 'Dr. ' + doctorName : patientName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF9800; }
          .zoom-box { background-color: #E3F2FD; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Appointment Rescheduled</h2>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>Your appointment has been rescheduled to a new date and time.</p>
            
            <div class="info-box">
              <h3>Previous Appointment:</h3>
              <p><strong>Date:</strong> ${new Date(oldDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${oldTimeSlot.startTime} - ${oldTimeSlot.endTime}</p>
            </div>
            
            <div class="info-box">
              <h3>New Appointment:</h3>
              <p><strong>${recipientType === 'patient' ? 'Doctor' : 'Patient'}:</strong> ${recipientType === 'patient' ? 'Dr. ' + doctorName : patientName}</p>
              <p><strong>Date:</strong> ${new Date(newDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${newTimeSlot.startTime} - ${newTimeSlot.endTime} (GMT+5)</p>
              ${rescheduleReason ? `<p><strong>Reason for Reschedule:</strong> ${rescheduleReason}</p>` : ''}
            </div>
            
            ${zoomLink ? `
            <div class="zoom-box">
              <h3>📹 Updated Meeting Link:</h3>
              <a href="${zoomLink}" class="button">Join Zoom Meeting</a>
              <p><strong>Meeting Password:</strong> ${zoomPassword || 'Not required'}</p>
            </div>
            ` : ''}
            
            <div class="footer">
              <p>This is an automated email from DailyMed. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const appointmentCancelledTemplate = (data) => {
  const { recipientName, recipientType, doctorName, patientName, appointmentDate, timeSlot, cancelledBy, cancellationReason } = data;
  
  return {
    subject: `Appointment Cancelled - ${recipientType === 'patient' ? 'Dr. ' + doctorName : patientName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #9E9E9E; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #9E9E9E; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Appointment Cancelled</h2>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>This appointment has been cancelled by ${cancelledBy}.</p>
            
            <div class="info-box">
              <h3>Cancelled Appointment:</h3>
              <p><strong>${recipientType === 'patient' ? 'Doctor' : 'Patient'}:</strong> ${recipientType === 'patient' ? 'Dr. ' + doctorName : patientName}</p>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${timeSlot.startTime} - ${timeSlot.endTime}</p>
              ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
            </div>
            
            ${recipientType === 'patient' ? `
            <p>We apologize for any inconvenience. You can book a new appointment through the DailyMed app.</p>
            ` : ''}
            
            <div class="footer">
              <p>This is an automated email from DailyMed. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const appointmentReminderTemplate = (data) => {
  const { recipientName, recipientType, doctorName, patientName, appointmentDate, timeSlot, zoomLink, zoomPassword } = data;
  
  return {
    subject: `Reminder: Upcoming Appointment ${recipientType === 'patient' ? 'with Dr. ' + doctorName : 'with ' + patientName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
          .zoom-box { background-color: #E3F2FD; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 Appointment Reminder</h2>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>This is a reminder about your upcoming appointment scheduled for tomorrow.</p>
            
            <div class="info-box">
              <h3>Appointment Details:</h3>
              <p><strong>${recipientType === 'patient' ? 'Doctor' : 'Patient'}:</strong> ${recipientType === 'patient' ? 'Dr. ' + doctorName : patientName}</p>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> ${timeSlot.startTime} - ${timeSlot.endTime} (GMT+5)</p>
            </div>
            
            <div class="zoom-box">
              <h3>📹 Join Your Meeting:</h3>
              <a href="${zoomLink}" class="button">Join Zoom Meeting</a>
              <p><strong>Meeting Password:</strong> ${zoomPassword || 'Not required'}</p>
            </div>
            
            <p><strong>Please remember to:</strong></p>
            <ul>
              <li>Join the meeting on time</li>
              <li>Ensure stable internet connection</li>
              <li>Test your camera and microphone beforehand</li>
              ${recipientType === 'patient' ? '<li>Keep your medical records ready</li>' : ''}
            </ul>
            
            <div class="footer">
              <p>This is an automated email from DailyMed. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

module.exports = {
  appointmentRequestTemplate,
  appointmentApprovedTemplate,
  appointmentDeclinedTemplate,
  appointmentRescheduledTemplate,
  appointmentCancelledTemplate,
  appointmentReminderTemplate
};
