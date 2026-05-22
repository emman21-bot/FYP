const nodemailer = require('nodemailer');

const getSmtpConfig = () => {
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || process.env.EMAIL_USER;

  const missing = [];
  if (!smtpUser) missing.push('SMTP_USER|EMAIL_USER');
  if (!smtpPass) missing.push('SMTP_PASSWORD|EMAIL_PASSWORD');
  if (!smtpFrom) missing.push('SMTP_FROM|SMTP_USER|EMAIL_USER');

  if (missing.length) {
    throw new Error(`Missing SMTP configuration: ${missing.join(', ')}`);
  }

  return {
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpFrom,
  };
};

const createTransporter = () => {
  const { smtpHost, smtpPort, smtpUser, smtpPass } = getSmtpConfig();
  const secure = smtpPort === 465;
  const transporterOptions = {
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  if (smtpHost.includes('gmail')) {
    transporterOptions.service = 'gmail';
  }

  return nodemailer.createTransport(transporterOptions);
};

const getFromAddress = () => {
  const { smtpFrom } = getSmtpConfig();
  return {
    name: 'DailyMed',
    address: smtpFrom,
  };
};

// Send email function
exports.sendEmail = async ({ email, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject,
      html,
      text: text || '',
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
          from: getFromAddress(),
          to: emailData.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text || '',
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
