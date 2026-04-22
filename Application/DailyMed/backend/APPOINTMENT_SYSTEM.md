# Appointment Booking System Documentation

## Overview
Complete appointment booking system with doctor profiles, Zoom meeting integration, and automated email notifications.

## Features
- ✅ Doctor profile management with availability slots
- ✅ Patient appointment booking
- ✅ Doctor approval/decline/reschedule workflow
- ✅ Automated Zoom meeting creation via Server-to-Server OAuth
- ✅ Email notifications at every workflow stage
- ✅ Appointment cancellation by both parties
- ✅ Robust database with proper indexing

## Backend Architecture

### Database Models

#### 1. DoctorProfile Model
**Location:** `backend/models/DoctorProfile.js`

**Schema:**
```javascript
{
  userId: ObjectId (ref: 'User'),
  userEmail: String,
  fullName: String (required),
  expertise: String (required),
  location: {
    city: String,
    country: String,
    address: String
  },
  about: String (required),
  qualifications: [String],
  experience: Number,
  consultationFee: Number,
  availability: [{
    day: enum['Monday', 'Tuesday', ...],
    slots: [{
      startTime: String (HH:MM),
      endTime: String (HH:MM),
      isAvailable: Boolean
    }]
  }],
  profilePicture: String,
  isProfileComplete: Boolean (auto-calculated),
  rating: Number,
  totalReviews: Number,
  isActive: Boolean
}
```

**Indexes:**
- `userEmail`: Unique
- `userId`: Unique
- `expertise`: For filtering
- `isActive`: For active doctor queries

#### 2. Appointment Model
**Location:** `backend/models/Appointment.js`

**Schema:**
```javascript
{
  patientId: ObjectId (ref: 'User'),
  patientEmail: String,
  patientName: String,
  doctorId: ObjectId (ref: 'User'),
  doctorEmail: String,
  doctorName: String,
  doctorExpertise: String,
  appointmentDate: Date,
  timeSlot: {
    startTime: String,
    endTime: String
  },
  reason: String (max 500 chars),
  status: enum['pending', 'approved', 'declined', 'rescheduled', 'completed', 'cancelled'],
  zoomMeetingLink: String,
  zoomMeetingId: String,
  zoomPassword: String,
  rescheduleRequest: {
    isRescheduled: Boolean,
    newDate: Date,
    newTimeSlot: Object,
    requestedBy: enum['doctor', 'patient'],
    reason: String
  },
  notes: String,
  cancelledBy: enum['doctor', 'patient'],
  cancellationReason: String,
  completedAt: Date,
  reminderSent: Boolean
}
```

**Indexes:**
- `patientId + status + appointmentDate`: For patient dashboard
- `doctorId + status + appointmentDate`: For doctor dashboard
- `appointmentDate + status`: For upcoming appointments

### Controllers

#### 1. Doctor Profile Controller
**Location:** `backend/controllers/doctorProfileController.js`

**Functions:**
- `getDoctorProfile()`: Get logged-in doctor's profile
- `createOrUpdateProfile()`: Create or update doctor profile
- `updateAvailability()`: Update weekly availability slots
- `getAllDoctors()`: List all active doctors (with filters)
- `getDoctorById()`: Get specific doctor's profile
- `toggleActiveStatus()`: Enable/disable profile visibility

#### 2. Appointment Controller
**Location:** `backend/controllers/appointmentController.js`

**Functions:**
- `createAppointment()`: Patient creates appointment request
  - Validates time slot availability
  - Checks for past dates
  - Sends email to doctor
  
- `getAppointments()`: Get appointments (filtered by role)
  - Patient: Shows their appointments
  - Doctor: Shows their appointments
  - Supports status and upcoming filters
  
- `approveAppointment()`: Doctor approves appointment
  - Creates Zoom meeting
  - Updates status to 'approved'
  - Sends emails to both parties
  
- `declineAppointment()`: Doctor declines appointment
  - Updates status to 'declined'
  - Sends email to patient
  
- `rescheduleAppointment()`: Either party reschedules
  - Updates Zoom meeting
  - Sends emails to both parties
  - Tracks who requested reschedule
  
- `cancelAppointment()`: Either party cancels
  - Deletes Zoom meeting
  - Updates status to 'cancelled'
  - Sends emails to both parties
  
- `getAppointmentById()`: Get single appointment details

### Utilities

#### 1. Zoom Helper
**Location:** `backend/utils/zoomHelper.js`

**Functions:**
- `getZoomAccessToken()`: Get OAuth token using Server-to-Server credentials
- `createZoomMeeting(data)`: Create Zoom meeting with meeting settings
- `deleteZoomMeeting(meetingId)`: Delete Zoom meeting
- `updateZoomMeeting(meetingId, data)`: Update Zoom meeting datetime

**Configuration:**
- Uses Zoom API v2
- Server-to-Server OAuth (Account ID, Client ID, Client Secret)
- Timezone: Asia/Karachi (GMT+5)
- Meeting settings: Waiting room enabled, join before host disabled

#### 2. Email Helper
**Location:** `backend/utils/emailHelper.js`

**Functions:**
- `sendEmail({email, subject, html, text})`: Send single email
- `sendBulkEmails(emails)`: Send multiple emails
- `verifyEmailConfig()`: Verify email configuration

**Configuration:**
- Service: Gmail SMTP
- Port: 587 (TLS)
- From: theuniquethreadsfyp@gmail.com

#### 3. Email Templates
**Location:** `backend/utils/emailTemplates.js`

**Templates:**
1. **appointmentRequestTemplate**: Sent to doctor when patient requests appointment
2. **appointmentApprovedTemplate**: Sent to patient with Zoom link when approved
3. **appointmentDeclinedTemplate**: Sent to patient when declined
4. **appointmentRescheduledTemplate**: Sent to both parties with updated Zoom link
5. **appointmentCancelledTemplate**: Sent when appointment cancelled
6. **appointmentReminderTemplate**: Sent 24hrs before appointment (future implementation)

### Routes

#### Doctor Profile Routes
**Base URL:** `/api/doctor-profile`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Doctor | Get logged-in doctor's profile |
| POST | `/` | Doctor | Create or update profile |
| PUT | `/availability` | Doctor | Update availability slots |
| PATCH | `/toggle-status` | Doctor | Toggle active status |
| GET | `/all` | Public | Get all active doctors |
| GET | `/:doctorId` | Public | Get specific doctor's profile |

#### Appointment Routes
**Base URL:** `/api/appointments`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Authenticated | Get all appointments (filtered by role) |
| GET | `/:id` | Authenticated | Get single appointment |
| POST | `/` | Patient | Create new appointment |
| PATCH | `/:id/approve` | Doctor | Approve appointment |
| PATCH | `/:id/decline` | Doctor | Decline appointment |
| PATCH | `/:id/reschedule` | Both | Reschedule appointment |
| DELETE | `/:id` | Both | Cancel appointment |

## Environment Variables

Required environment variables in `.env`:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d

# Email (Gmail SMTP)
EMAIL_USER=theuniquethreadsfyp@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Zoom API (Server-to-Server OAuth)
ZOOM_ACCOUNT_ID=RTgKZHyZTkaChuejWEYKUg
ZOOM_CLIENT_ID=Bp602CJ2TBOPXZBL3aBybw
ZOOM_CLIENT_SECRET=VBfBxrWlQGogPKS4WLqg00UpuhJ3rfco

# Server
PORT=5000
NODE_ENV=development
```

## Workflow

### Doctor Profile Setup
1. Doctor logs in
2. Creates profile via `POST /api/doctor-profile`
3. Sets weekly availability slots via `PUT /api/doctor-profile/availability`
4. Profile becomes visible to patients when `isProfileComplete` is true

### Patient Booking Flow
1. Patient views all doctors via `GET /api/doctor-profile/all`
2. Selects doctor and views available slots
3. Creates appointment request via `POST /api/appointments`
4. Doctor receives email notification
5. Appointment status: `pending`

### Doctor Approval Flow
1. Doctor views pending appointments via `GET /api/appointments?status=pending`
2. Approves via `PATCH /api/appointments/:id/approve`
   - Zoom meeting created
   - Status: `approved`
   - Both parties receive email with Zoom link

### Doctor Decline Flow
1. Doctor declines via `PATCH /api/appointments/:id/decline`
   - Status: `declined`
   - Patient receives email with reason

### Reschedule Flow
1. Either party requests reschedule via `PATCH /api/appointments/:id/reschedule`
2. Zoom meeting updated with new datetime
3. Status: `rescheduled`
4. Both parties receive email with updated Zoom link

### Cancellation Flow
1. Either party cancels via `DELETE /api/appointments/:id`
2. Zoom meeting deleted
3. Status: `cancelled`
4. Both parties receive email notification

## Email Notifications

All emails are sent using professional HTML templates with:
- DailyMed branding
- Color-coded headers (green for approved, red for declined, orange for rescheduled)
- Formatted dates and times
- Zoom meeting links and passwords
- Responsive design

## Zoom Meeting Settings

Default settings for all meetings:
- Host video: ON
- Participant video: ON
- Join before host: OFF
- Mute upon entry: OFF
- Waiting room: ON
- Auto recording: OFF
- Meeting duration: Calculated from time slot
- Timezone: Asia/Karachi (GMT+5)

## Error Handling

All controllers implement:
- Input validation
- Authorization checks (doctor/patient specific actions)
- Proper error responses with meaningful messages
- Try-catch blocks for external API calls
- Graceful degradation (appointment created even if email fails)

## Database Indexes

Optimized for common queries:
- Doctor profile lookups by userId/userEmail
- Filtering doctors by expertise
- Finding active doctors
- Patient's appointments sorted by date
- Doctor's appointments sorted by date
- Upcoming appointments

## Testing

### Test Doctor Profile Creation
```bash
POST /api/doctor-profile
Authorization: Bearer <doctor_token>
{
  "fullName": "Dr. John Doe",
  "expertise": "Cardiology",
  "location": {
    "city": "Karachi",
    "country": "Pakistan",
    "address": "123 Medical Plaza"
  },
  "about": "Experienced cardiologist with 10 years of practice",
  "qualifications": ["MBBS", "FCPS"],
  "experience": 10,
  "consultationFee": 2000
}
```

### Test Availability Update
```bash
PUT /api/doctor-profile/availability
Authorization: Bearer <doctor_token>
{
  "availability": [
    {
      "day": "Monday",
      "slots": [
        {
          "startTime": "09:00",
          "endTime": "10:00",
          "isAvailable": true
        },
        {
          "startTime": "14:00",
          "endTime": "15:00",
          "isAvailable": true
        }
      ]
    }
  ]
}
```

### Test Appointment Booking
```bash
POST /api/appointments
Authorization: Bearer <patient_token>
{
  "doctorId": "693939bf2df25d06773f4ece",
  "appointmentDate": "2025-12-15",
  "timeSlot": {
    "startTime": "09:00",
    "endTime": "10:00"
  },
  "reason": "Regular checkup and consultation"
}
```

## Future Enhancements

- [ ] Implement appointment reminder cron job (send 24hrs before)
- [ ] Add doctor ratings and reviews
- [ ] Implement payment integration for consultation fees
- [ ] Add video consultation notes for doctors
- [ ] Implement prescription generation after consultation
- [ ] Add patient medical history attachment to appointments
- [ ] Implement recurring appointments
- [ ] Add appointment analytics dashboard

## Dependencies

```json
{
  "axios": "^1.6.2",
  "nodemailer": "^6.9.7",
  "mongoose": "^8.0.3",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "dotenv": "^16.3.1"
}
```

## Security Considerations

1. **Authentication:** All routes protected with JWT authentication
2. **Authorization:** Role-based access (doctor vs patient)
3. **Validation:** Input validation on all endpoints
4. **Rate Limiting:** Applied on all API routes
5. **Data Sanitization:** All inputs sanitized to prevent NoSQL injection
6. **Zoom Credentials:** Stored securely in environment variables
7. **Email Password:** Gmail app password (not account password)

## Support

For issues or questions, contact the development team.
