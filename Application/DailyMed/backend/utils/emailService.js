const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, username) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"DailyMed" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Verify Your DailyMed Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              color: #4A90E2;
              margin-bottom: 30px;
            }
            .otp-box {
              background-color: #4A90E2;
              color: white;
              font-size: 32px;
              font-weight: bold;
              text-align: center;
              padding: 20px;
              border-radius: 8px;
              letter-spacing: 8px;
              margin: 30px 0;
            }
            .content {
              text-align: center;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>DailyMed</h1>
              <h3>Email Verification</h3>
            </div>
            
            <div class="content">
              <p>Hello <strong>${username}</strong>,</p>
              <p>Thank you for registering with DailyMed. To complete your registration, please verify your email address using the OTP below:</p>
            </div>
            
            <div class="otp-box">
              ${otp}
            </div>
            
            <div class="content">
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't create an account with DailyMed, please ignore this email.
            </div>
            
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; 2025 DailyMed. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${username},\n\nYour DailyMed verification OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't create an account with DailyMed, please ignore this email.\n\nBest regards,\nDailyMed Team`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, username, role) => {
  try {
    const transporter = createTransporter();

    const roleMessages = {
      patient: 'You can now start tracking your health and medications.',
      doctor: 'You can now manage your patients and appointments.',
      caregiver: 'You can now monitor and support your patients.'
    };

    const mailOptions = {
      from: `"DailyMed" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Welcome to DailyMed!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              color: #4A90E2;
              margin-bottom: 30px;
            }
            .content {
              text-align: center;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #4A90E2;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Welcome to DailyMed!</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${username}</strong>,</p>
              <p>Your account has been successfully verified! 🎉</p>
              <p>You're now registered as a <strong>${role}</strong>.</p>
              <p>${roleMessages[role]}</p>
            </div>
            
            <div class="footer">
              <p>&copy; 2025 DailyMed. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✉️ Welcome email sent to:', email);
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    // Don't throw error as this is not critical
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail
};
