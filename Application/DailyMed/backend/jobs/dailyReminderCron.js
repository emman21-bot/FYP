const cron = require('node-cron');
const DoctorProfile = require('../models/DoctorProfile');
const { sendEmail } = require('../utils/emailHelper');

// Daily reminder template for doctors to set availability
const dailyReminderTemplate = (doctorName) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  return {
    subject: '⏰ DailyMed - Set Your Availability for Today',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      ❤️‍🩹 DailyMed
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                      Daily Availability Reminder
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; font-size: 24px; margin-top: 0;">
                      Good Morning, Dr. ${doctorName}! 👋
                    </h2>
                    
                    <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 20px 0;">
                      It's <strong>${today}</strong> and it's time to set your available time slots for today.
                    </p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #007AFF; padding: 20px; margin: 25px 0; border-radius: 5px;">
                      <p style="margin: 0; color: #333333; font-size: 15px; line-height: 22px;">
                        <strong>💡 Quick Reminder:</strong><br>
                        Setting your availability helps patients find suitable appointment times and ensures smooth scheduling throughout the day.
                      </p>
                    </div>
                    
                    <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 20px 0;">
                      To update your availability:
                    </p>
                    
                    <ol style="color: #666666; font-size: 15px; line-height: 26px; padding-left: 20px;">
                      <li>Open the DailyMed app</li>
                      <li>Navigate to your Profile section</li>
                      <li>Click on "Manage Availability"</li>
                      <li>Select today's available time slots</li>
                      <li>Save your changes</li>
                    </ol>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="#" style="display: inline-block; background-color: #007AFF; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-size: 16px; font-weight: bold;">
                        Open DailyMed App
                      </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 25px;">
                      <p style="margin: 0; color: #856404; font-size: 14px; line-height: 20px;">
                        ⚠️ <strong>Note:</strong> If you don't set your availability, patients won't be able to book appointments with you today.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Stats Section -->
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 10px; text-align: center;">
                      <p style="margin: 0; color: #666666; font-size: 14px;">
                        💼 Helping patients get better healthcare, one appointment at a time
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0; color: #999999; font-size: 14px; line-height: 20px;">
                      This is an automated reminder from <strong>DailyMed</strong><br>
                      Sent on ${today}
                    </p>
                    <p style="margin: 15px 0 0 0; color: #999999; font-size: 12px;">
                      If you wish to change your notification preferences, please update your settings in the app.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };
};

// Function to send daily reminders to all active doctors
const sendDailyReminders = async () => {
  try {
    console.log('🔔 Starting daily reminder job...');
    
    // Find all active doctors
    const activeDoctors = await DoctorProfile.find({ 
      isActive: true,
      isProfileComplete: true 
    }).select('userEmail fullName');

    console.log(`📧 Found ${activeDoctors.length} active doctors to notify`);

    // Send email to each doctor
    for (const doctor of activeDoctors) {
      try {
        const emailTemplate = dailyReminderTemplate(doctor.fullName);
        
        await sendEmail({
          email: doctor.userEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });

        console.log(`✅ Reminder sent to: ${doctor.fullName} (${doctor.userEmail})`);
      } catch (emailError) {
        console.error(`❌ Failed to send reminder to ${doctor.userEmail}:`, emailError.message);
      }
    }

    console.log('✨ Daily reminder job completed!');
  } catch (error) {
    console.error('❌ Error in daily reminder job:', error);
  }
};

// Schedule the cron job to run every day at 9:00 AM (Pakistan Time - GMT+5)
const startDailyReminderCron = () => {
  // Cron expression: minute hour day month dayOfWeek
  // '0 9 * * *' means: At 9:00 AM every day
  cron.schedule('0 9 * * *', () => {
    console.log('\n⏰ ===== Daily Reminder Cron Job Triggered =====');
    console.log(`📅 Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`);
    sendDailyReminders();
  }, {
    timezone: 'Asia/Karachi' // Pakistan Standard Time (PKT)
  });

  console.log('✅ Daily reminder cron job initialized (Runs at 9:00 AM PKT)');
};

// Optional: Manual trigger function for testing
const triggerManualReminder = async () => {
  console.log('\n🔧 ===== Manual Reminder Trigger =====');
  await sendDailyReminders();
};

module.exports = {
  startDailyReminderCron,
  triggerManualReminder,
  sendDailyReminders
};
