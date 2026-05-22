const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const userProfileRoutes = require('./routes/userProfile');
const healthDataRoutes = require('./routes/healthData');
const medicationRoutes = require('./routes/medicationRoutes');
const adminRoutes = require('./routes/admin');
const doctorProfileRoutes = require('./routes/doctorProfileRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const careRelationshipRoutes = require('./routes/careRelationship');
const reminderRoutes = require('./routes/reminder');
const thresholdRoutes = require('./routes/threshold');
const predictionRoutes = require('./routes/prediction');
const dosageSuggestionRoutes = require('./routes/dosageSuggestion');
const healthDataAttachmentRoutes = require('./routes/healthDataAttachment');
const treatmentPlanRoutes = require('./routes/treatmentPlan');
const doctorRoutes = require('./routes/doctor');
const analyticsRoutes = require('./routes/analytics');
const supportRoutes = require('./routes/support');
const adminSettingsRoutes = require('./routes/adminSettings');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const sanitizeInput = require('./middlewares/sanitize');
const { startDailyReminderCron } = require('./jobs/dailyReminderCron');
const { startAppointmentCleanupCron } = require('./jobs/cancelledAppointmentCleanup');
const { startAppointmentReminderCron } = require('./jobs/appointmentReminderCron');
const { verifyEmailConfig } = require('./utils/emailService');
const { attachSocketServer } = require('./utils/socketService');

// Start queue workers (if available)
try {
  require('./queues/emailWorker');
  console.log('✅ Email worker started');
} catch (err) {
  console.warn('⚠️ Email worker not started (optional):', err.message);
}

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Start cron jobs
startDailyReminderCron();
startAppointmentCleanupCron();
startAppointmentReminderCron();

// Security middleware - trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Verify email configuration on startup
verifyEmailConfig().then((isValid) => {
  if (!isValid) {
    console.warn('⚠️ Email transport is not configured correctly. OTP delivery will fail until SMTP credentials are fixed.');
  }
}).catch((err) => {
  console.error('⚠️ Error verifying email transport:', err);
});

// Middleware
app.use(cors({
  origin: '*', // In production, specify your frontend URL
  credentials: true
}));

app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize inputs to prevent NoSQL injection
app.use(sanitizeInput);

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check route (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userProfileRoutes);
app.use('/api/health-data', healthDataRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor-profile', doctorProfileRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/care-relationships', careRelationshipRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/thresholds', thresholdRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/dosage-suggestions', dosageSuggestionRoutes);
app.use('/api/health-data', healthDataAttachmentRoutes); // Attachment routes under health-data
app.use('/api/treatment-plans', treatmentPlanRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/treatment-plans', treatmentPlanRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
attachSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🏥 DailyMed API Server                  ║
║                                           ║
║   Server running on port: ${PORT}           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                  ║
║   Time: ${new Date().toLocaleTimeString()}                      ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

module.exports = app;
