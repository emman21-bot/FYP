const nodemailer = require('nodemailer');

// Create reusable transporter object using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER || 'theuniquethreadsfyp@gmail.com',
      pass: process.env.EMAIL_PASSWORD // Gmail app password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send email function
exports.sendEmail = async ({ email, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'DailyMed',
        address: process.env.EMAIL_USER || 'theuniquethreadsfyp@gmail.com'
      },
      to: email,
      subject: subject,
      html: html,
      text: text || '' // Fallback text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send multiple emails
exports.sendBulkEmails = async (emails) => {
  try {
    const transporter = createTransporter();
    const results = [];

    for (const emailData of emails) {
      try {
        const mailOptions = {
          from: {
            name: 'DailyMed',
            address: process.env.EMAIL_USER || 'theuniquethreadsfyp@gmail.com'
          },
          to: emailData.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text || ''
        };

        const info = await transporter.sendMail(mailOptions);
        results.push({ success: true, email: emailData.email, messageId: info.messageId });
      } catch (error) {
        console.error(`Error sending email to ${emailData.email}:`, error);
        results.push({ success: false, email: emailData.email, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in bulk email sending:', error);
    throw error;
  }
};

// Verify email configuration
exports.verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', error);
    return false;
  }
};
