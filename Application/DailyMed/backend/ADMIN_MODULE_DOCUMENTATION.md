# Admin Module - Complete API Documentation

## Base URL
`http://localhost:5000/api/admin`

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

For development, you can use the special admin token:
```
Authorization: Bearer admin-special-token-dailymed-2025
```

---

## 1. USER MANAGEMENT ENDPOINTS

### 1.1 Get All Users (with Advanced Filtering)
**GET** `/api/admin/users`

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Users per page
- `search` (string) - Search by username, email, or full name
- `role` (string) - Filter by role: patient, doctor, caregiver
- `accountStatus` (string) - Filter by status: active, warning, suspended
- `isVerified` (string) - Filter by verification: true, false
- `startDate` (date) - Filter by registration date (ISO format)
- `endDate` (date) - Filter by registration date (ISO format)
- `hasDiabetes` (string) - Filter diabetic patients: true, false
- `hasHypertension` (string) - Filter hypertensive patients: true, false
- `lastLoginDays` (number) - Filter by last login within X days

**Example:**
```bash
GET /api/admin/users?page=1&limit=20&role=patient&hasDiabetes=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "username": "patient1",
      "email": "patient1@example.com",
      "role": "patient",
      "accountStatus": "active",
      "isVerified": true,
      "medicalConditions": {
        "diabetes": true,
        "hypertension": false
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastLogin": "2024-01-20T15:45:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalUsers": 100,
    "usersPerPage": 20
  }
}
```

---

### 1.2 Get Single User
**GET** `/api/admin/users/:id`

**Example:**
```bash
GET /api/admin/users/60d5ec49f1b2c8b1f8e4e5f6
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "username": "patient1",
    "email": "patient1@example.com",
    "role": "patient",
    "fullName": "John Doe",
    "phone": "+1234567890",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "height": 175,
    "weight": 70,
    "bloodType": "O+",
    "medicalConditions": {
      "diabetes": true,
      "hypertension": false
    },
    "accountStatus": "active",
    "isVerified": true,
    "assignedDoctorEmail": "doctor@example.com",
    "notificationPreferences": {
      "healthAlerts": true,
      "medReminders": true
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 1.3 Create New User
**POST** `/api/admin/users`

**Request Body:**
```json
{
  "username": "newpatient",
  "email": "newpatient@example.com",
  "password": "Strong@Pass123",
  "role": "patient",
  "fullName": "Jane Smith",
  "phone": "+1234567890",
  "isVerified": true
}
```

**Validation Rules:**
- Username: 3-20 characters, alphanumeric + underscore
- Email: Valid email format
- Password: Min 8 chars, uppercase, lowercase, number, special character
- Role: patient, doctor, or caregiver

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "...",
    "username": "newpatient",
    "email": "newpatient@example.com",
    "role": "patient",
    "isVerified": true,
    "accountStatus": "active"
  }
}
```

---

### 1.4 Update User Status
**PUT** `/api/admin/users/:id/status`

**Request Body:**
```json
{
  "accountStatus": "warning",
  "isVerified": true
}
```

**Note:** Both fields are optional. Provide at least one.

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "_id": "...",
    "username": "patient1",
    "accountStatus": "warning",
    "isVerified": true
  }
}
```

**Side Effects:**
- Creates audit log entry
- Sends notification to user about status change

---

### 1.5 Delete User
**DELETE** `/api/admin/users/:id`

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Side Effects:**
- Creates audit log entry (severity: high)
- Permanently removes user from database

---

## 2. BULK OPERATIONS

### 2.1 Bulk Update User Status
**PUT** `/api/admin/users/bulk-status`

**Request Body:**
```json
{
  "userIds": ["id1", "id2", "id3"],
  "accountStatus": "suspended",
  "isVerified": false
}
```

**Note:** At least one of accountStatus or isVerified must be provided.

**Response:**
```json
{
  "success": true,
  "message": "Successfully updated 3 users",
  "updatedCount": 3
}
```

**Side Effects:**
- Creates audit log for each user
- Sends notification to each affected user

---

### 2.2 Bulk Delete Users
**DELETE** `/api/admin/users/bulk-delete`

**Request Body:**
```json
{
  "userIds": ["id1", "id2", "id3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 3 users",
  "deletedCount": 3
}
```

**Side Effects:**
- Creates audit log for each deleted user (severity: critical)

---

## 3. USER DATA VIEWING

### 3.1 Get User Health Data
**GET** `/api/admin/users/:id/health-data`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "bloodSugar": {
        "fasting": 120,
        "random": 140
      },
      "bloodPressure": {
        "systolic": 130,
        "diastolic": 85
      },
      "heartRate": 72,
      "readingDate": "2024-01-20T08:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalRecords": 30,
    "recordsPerPage": 20
  }
}
```

---

### 3.2 Get User Appointments
**GET** `/api/admin/users/:id/appointments`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "patientId": { "username": "patient1", "email": "..." },
      "doctorId": { "username": "doctor1", "email": "..." },
      "date": "2024-01-25T10:00:00.000Z",
      "status": "pending",
      "type": "video"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 5,
    "recordsPerPage": 20
  }
}
```

---

### 3.3 Get User Medications
**GET** `/api/admin/users/:id/medications`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "twice daily",
      "isActive": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 3,
    "recordsPerPage": 20
  }
}
```

---

### 3.4 Get User Predictions
**GET** `/api/admin/users/:id/predictions`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "modelName": "hypertension_xgboost",
      "predictionType": "hypertension_risk",
      "outputPrediction": {
        "risk_score": 0.75,
        "risk_level": "HIGH"
      },
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 8,
    "recordsPerPage": 20
  }
}
```

---

## 4. STATISTICS & ANALYTICS

### 4.1 Get User Statistics
**GET** `/api/admin/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byRole": {
      "patients": 100,
      "doctors": 30,
      "caregivers": 20
    },
    "byStatus": {
      "active": 140,
      "warning": 7,
      "suspended": 3
    },
    "byVerification": {
      "verified": 145,
      "unverified": 5
    }
  }
}
```

---

### 4.2 Get System Statistics
**GET** `/api/admin/system-stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "byRole": {
        "patients": 100,
        "doctors": 30,
        "caregivers": 20
      }
    },
    "healthData": {
      "total": 2500,
      "last24Hours": 45
    },
    "appointments": {
      "total": 300,
      "pending": 25,
      "completed": 250,
      "cancelled": 25
    },
    "medications": {
      "total": 450,
      "active": 380
    },
    "predictions": {
      "total": 800,
      "last24Hours": 30
    },
    "database": {
      "sizeMB": "125.50"
    }
  }
}
```

---

## 5. AUDIT & MONITORING

### 5.1 Get Audit Logs
**GET** `/api/admin/audit-logs`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `action` (string) - Filter by action type (USER_CREATED, USER_DELETED, etc.)
- `severity` (string) - Filter by severity: low, medium, high, critical
- `actorEmail` (string) - Filter by admin email
- `targetUserEmail` (string) - Filter by affected user email

**Example:**
```bash
GET /api/admin/audit-logs?action=USER_DELETED&severity=high
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "actorEmail": "admin@dailymed.com",
      "actorRole": "admin",
      "action": "USER_DELETED",
      "resourceType": "User",
      "targetUserEmail": "deleted@example.com",
      "before": {
        "userId": "...",
        "username": "deleteduser",
        "email": "deleted@example.com"
      },
      "severity": "high",
      "ipAddress": "127.0.0.1",
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalRecords": 75,
    "recordsPerPage": 50
  }
}
```

---

## 6. BROADCAST & COMMUNICATION

### 6.1 Send Broadcast Notification
**POST** `/api/admin/broadcast-notification`

**Request Body:**
```json
{
  "title": "System Maintenance",
  "message": "Scheduled maintenance tonight at 2 AM. Service may be interrupted.",
  "role": "patient",
  "type": "general"
}
```

**Fields:**
- `title` (required) - Notification title
- `message` (required) - Notification message
- `role` (optional) - Target role: patient, doctor, caregiver (omit for all users)
- `type` (optional, default: "general") - Notification type

**Response:**
```json
{
  "success": true,
  "message": "Broadcast notification sent to 100 users",
  "recipientCount": 100
}
```

**Side Effects:**
- Creates notification for each target user
- Creates audit log entry

---

## ERROR RESPONSES

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## AUDIT LOG ACTIONS

The following actions are automatically logged:

- `USER_CREATED` - When admin creates a new user
- `USER_STATUS_UPDATED` - When admin changes user status/verification
- `USER_DELETED` - When admin deletes a user
- `BULK_STATUS_UPDATE` - When admin bulk updates users
- `BULK_DELETE` - When admin bulk deletes users
- `BROADCAST_NOTIFICATION` - When admin sends broadcast notification

---

## NOTIFICATION TYPES

Users receive notifications for:

- Account suspended (when admin sets status to "suspended")
- Account warning (when admin sets status to "warning")
- Account activated (when admin sets status to "active")
- Account verified/unverified (when admin changes verification status)
- Bulk status changes
- Broadcast messages

---

## TESTING

Run the test script to verify all endpoints:

```bash
cd backend
node test-admin-module.js
```

Make sure the backend server is running on port 5000 before testing.

---

## SECURITY NOTES

1. **Production Deployment:**
   - Replace special admin token with proper role-based authorization
   - Uncomment and use `authorize('admin')` middleware in routes
   - Implement rate limiting for admin endpoints
   - Enable HTTPS/TLS

2. **Data Privacy:**
   - Passwords are never returned in responses
   - Audit logs are automatically deleted after 2 years
   - Health data respects user privacy settings

3. **Access Control:**
   - All endpoints require authentication
   - Admin role verification recommended for production
   - IP address and user agent logged for audit trail

---

**Last Updated:** May 15, 2026
**Version:** 2.0.0 (Complete Admin Module)
