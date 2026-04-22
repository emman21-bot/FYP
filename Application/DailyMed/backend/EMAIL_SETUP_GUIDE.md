# Email Configuration Guide for DailyMed

This guide will help you set up email functionality for sending OTP verification codes.

## Gmail Configuration (Recommended)

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Scroll to "How you sign in to Google"
4. Click on "2-Step Verification"
5. Follow the prompts to enable 2-Step Verification

### Step 2: Generate App Password

1. After enabling 2-Step Verification, go back to Security settings
2. Scroll to "How you sign in to Google"
3. Click on "App passwords"
   - If you don't see "App passwords", make sure 2-Step Verification is enabled
4. You may need to sign in again
5. At the bottom, select:
   - **Select app:** Mail
   - **Select device:** Other (Custom name)
   - Enter: "DailyMed Backend"
6. Click "Generate"
7. Google will display a 16-character password
8. **IMPORTANT**: Copy this password immediately (you won't be able to see it again)

### Step 3: Update .env File

Open your `backend/.env` file and update the following fields:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password-here
SMTP_FROM=noreply@dailymed.com
```

**Example:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=saad.healthcare@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=noreply@dailymed.com
```

**Important Notes:**
- Use the **App Password**, NOT your regular Gmail password
- Remove any spaces from the app password
- Keep the SMTP_HOST and SMTP_PORT as shown above

### Step 4: Test Email Configuration

1. Stop your backend server if it's running (Ctrl+C in terminal)
2. Start it again:
   ```bash
   cd backend
   npm start
   ```
3. Try registering a new user to test email sending

## Alternative Email Services

### Using Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@dailymed.com
```

### Using SendGrid (Professional Option)

1. Sign up at https://sendgrid.com/
2. Create an API key
3. Update .env:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=verified-sender@yourdomain.com
```

## Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution:**
- Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Double-check the SMTP_USER (must be the full email address)
- Ensure there are no extra spaces in the password
- Try generating a new App Password

### Error: "Connection timeout"

**Solution:**
- Check your internet connection
- Verify SMTP_HOST and SMTP_PORT are correct
- Check if your firewall is blocking port 587
- Try port 465 instead (requires secure: true)

### Emails not being received

**Solution:**
- Check spam/junk folder
- Verify the recipient email address is correct
- Check Gmail's "Sent" folder to confirm emails are being sent
- Wait a few minutes (sometimes there's a delay)

### Error: "self signed certificate in certificate chain"

**Solution:**
Add this to your email service configuration (emailService.js):
```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false  // Add this line
  }
});
```

## Security Best Practices

1. **Never commit .env file to Git**
   - Already added to .gitignore
   - Share credentials securely with team members

2. **Use different email accounts for development and production**

3. **Regularly rotate App Passwords**

4. **Monitor email sending limits:**
   - Gmail: 500 emails/day for free accounts
   - Consider SendGrid for production (12,000 emails/month free)

5. **Keep backup of App Password in secure password manager**

## Production Recommendations

For production deployment, consider:

1. **SendGrid** or **AWS SES** for better deliverability
2. Set up SPF, DKIM, and DMARC records for your domain
3. Use a verified sender domain
4. Implement email rate limiting
5. Monitor bounce and complaint rates

## Need Help?

If you're still having issues:
1. Check the backend server logs for specific error messages
2. Verify all environment variables are set correctly
3. Test with a simple nodemailer test script first
4. Ensure Node.js and npm packages are up to date

---

**Last Updated:** December 2025
