# DailyMed Backend API Documentation - Modules 2-4

## Overview
This document details all backend APIs for the AI-powered health management system with patient-doctor care relationships, ML predictions, and insulin dosage management.

**Base URL**: `http://localhost:5000/api`
**Authentication**: JWT Bearer token required (except auth endpoints)

---

## 1. Care Relationship APIs

### POST /care-relationships/request
**Patient requests care from doctor**
```json
Request:
{
  "doctorEmail": "doctor@example.com",
  "requestMessage": "I need help managing my diabetes",
  "consentScopes": {
    "healthData": true,
    "predictions": true,
    "dosageSuggestions": true
  }
}

Response: 201
{
  "message": "Care request sent successfully",
  "careRelationship": { ... }
}
```

### PATCH /care-relationships/:id/approve
**Doctor approves care request**
```json
Request:
{
  "approvalMessage": "I'll be happy to help manage your condition"
}

Response: 200
{
  "message": "Care request approved",
  "careRelationship": { ... }
}
```

### PATCH /care-relationships/:id/reject
**Doctor rejects care request**
```json
Request:
{
  "rejectionReason": "My practice is currently at capacity"
}

Response: 200
{
  "message": "Care request rejected",
  "careRelationship": { ... }
}
```

### GET /care-relationships
**Get care relationships (filtered by role)**
```
Query params:
- status: requested|active|suspended|ended
- patientEmail: (for doctors only)

Response: 200
{
  "relationships": [
    {
      "_id": "...",
      "patientEmail": "patient@example.com",
      "doctorEmail": "doctor@example.com",
      "status": "active",
      "consentScopes": { ... },
      "createdAt": "..."
    }
  ]
}
```

### PATCH /care-relationships/:id/end
**End care relationship**
```
Response: 200
{
  "message": "Care relationship ended successfully"
}
```

---

## 2. Reminder APIs

### POST /reminders
**Create health data entry reminder**
```json
Request:
{
  "metricType": "bloodSugar",
  "schedule": "daily",
  "time": "08:00",
  "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
  "customMessage": "Don't forget your morning glucose check!"
}

Response: 201
{
  "message": "Reminder created successfully",
  "reminder": { ... }
}
```

### GET /reminders
**Get all reminders**
```
Query params:
- metricType: bloodSugar|bloodPressure|weight|general
- isActive: true|false

Response: 200
{
  "reminders": [ ... ]
}
```

### PUT /reminders/:id
**Update reminder**
```json
Request:
{
  "time": "09:00",
  "isActive": true
}

Response: 200
{
  "message": "Reminder updated successfully",
  "reminder": { ... }
}
```

### DELETE /reminders/:id
**Delete reminder**
```
Response: 200
{ "message": "Reminder deleted successfully" }
```

### PATCH /reminders/:id/toggle
**Toggle reminder active status**
```
Response: 200
{
  "message": "Reminder activated successfully",
  "reminder": { ... }
}
```

---

## 3. Threshold Configuration APIs

### POST /thresholds
**Create or update threshold**
```json
Request:
{
  "metricType": "bloodSugar",
  "minValue": 70,
  "maxValue": 180,
  "unit": "mg/dL",
  "alertEnabled": true,
  "notificationPreferences": {
    "inApp": true,
    "email": false,
    "push": true
  }
}

Response: 201
{
  "message": "Threshold created successfully",
  "threshold": { ... }
}
```

### GET /thresholds
**Get all thresholds**
```
Query params:
- metricType: bloodSugar|bloodPressure|weight|heartRate
- alertEnabled: true|false

Response: 200
{
  "thresholds": [ ... ]
}
```

### GET /thresholds/:metricType
**Get threshold by metric type**
```
Response: 200
{
  "threshold": { ... }
}
```

### DELETE /thresholds/:metricType
**Delete threshold**
```
Response: 200
{ "message": "Threshold configuration deleted successfully" }
```

### PATCH /thresholds/:metricType/toggle
**Toggle alert status**
```
Response: 200
{
  "message": "Alert enabled successfully",
  "threshold": { ... }
}
```

---

## 4. Prediction & Analytics APIs

### POST /predictions/hypertension
**Trigger hypertension risk prediction (SVM)**
```json
Request:
{
  "age": 45,
  "saltIntake": 3.5,
  "stressScore": 7,
  "sleepDuration": 6,
  "bmi": 28.5,
  "familyHistory": true,
  "smokingStatus": 1,
  "exerciseLevel": 2
}

Response: 200
{
  "message": "Prediction completed successfully",
  "prediction": {
    "modelRunId": "...",
    "result": "high_risk",
    "confidence": 0.87,
    "riskFactors": ["BMI", "stress_score", "sleep_duration"],
    "recommendation": "Consult your doctor about...",
    "executionTime": 234
  }
}
```

### POST /predictions/glucose
**Trigger glucose forecast (LSTM)**
```json
Request:
{
  "forecastHorizon": 6
}

Response: 200
{
  "message": "Glucose forecast completed successfully",
  "forecast": {
    "modelRunId": "...",
    "predictions": [120, 125, 130, 135, 140, 145],
    "timestamps": ["2024-01-01T10:00:00Z", ...],
    "trend": "rising",
    "confidence": 0.92,
    "alerts": {
      "hypoRisk": false,
      "hyperRisk": false
    },
    "executionTime": 1234
  }
}
```

### GET /predictions/history
**Get prediction history**
```
Query params:
- modelName: hypertension_svm|glucose_lstm|insulin_dosage_advisor
- status: queued|running|completed|failed
- limit: default 20

Response: 200
{
  "predictions": [
    {
      "_id": "...",
      "modelName": "glucose_lstm",
      "status": "completed",
      "output": { ... },
      "executionTime": 1234,
      "createdAt": "..."
    }
  ]
}
```

### GET /predictions/:id
**Get single prediction**
```
Response: 200
{
  "prediction": { ... },
  "feedback": { ... } or null
}
```

### POST /predictions/:modelRunId/feedback
**Submit prediction feedback**
```json
Request:
{
  "feedbackType": "accurate",
  "accuracyRating": 4,
  "comments": "The forecast was very close to actual values"
}

Response: 201
{
  "message": "Feedback submitted successfully",
  "feedback": { ... }
}
```

### GET /predictions/feedback/stats
**Get feedback statistics**
```
Query params:
- modelName: (optional)

Response: 200
{
  "stats": [
    {
      "_id": "accurate",
      "count": 45,
      "avgRating": 4.2
    }
  ]
}
```

---

## 5. Dosage Suggestion APIs

### POST /dosage-suggestions/generate
**Patient generates AI dosage suggestion**
```json
Request:
{
  "doctorEmail": "doctor@example.com",
  "recentMeals": [
    { "time": "07:00", "carbs": 45 }
  ],
  "recentActivity": "moderate",
  "currentGlucose": 180,
  "targetGlucose": 120
}

Response: 201
{
  "message": "Dosage suggestion generated and sent to doctor for review",
  "dosageSuggestion": {
    "id": "...",
    "suggestion": {
      "type": "bolus",
      "timing": "now",
      "amount": 4,
      "units": "units",
      "reasoning": "Current glucose 180 mg/dL is above target..."
    },
    "status": "pending",
    "doctorEmail": "doctor@example.com",
    "expiresAt": "2024-01-01T12:00:00Z",
    "confidence": 0.89
  }
}
```

### PATCH /dosage-suggestions/:id/approve
**Doctor approves dosage suggestion**
```json
Request:
{
  "notes": "Suggestion looks good based on patient history",
  "modifiedAmount": 4
}

Response: 200
{
  "message": "Dosage suggestion approved successfully",
  "dosageSuggestion": { ... }
}
```

### PATCH /dosage-suggestions/:id/reject
**Doctor rejects dosage suggestion**
```json
Request:
{
  "reason": "Patient should reduce carb intake first"
}

Response: 200
{
  "message": "Dosage suggestion rejected",
  "dosageSuggestion": { ... }
}
```

### PATCH /dosage-suggestions/:id/apply
**Patient applies approved dosage**
```
Response: 200
{
  "message": "Dosage applied and recorded successfully",
  "dosageSuggestion": { ... }
}
```

### GET /dosage-suggestions
**Get dosage suggestions (role-filtered)**
```
Query params:
- status: pending|approved|rejected|applied|expired
- patientEmail: (for doctors only)

Response: 200
{
  "suggestions": [ ... ]
}
```

### GET /dosage-suggestions/:id
**Get single dosage suggestion**
```
Response: 200
{
  "suggestion": {
    "_id": "...",
    "patientId": { ... },
    "doctorId": { ... },
    "suggestion": { ... },
    "status": "approved",
    "modelRunId": { ... }
  }
}
```

---

## 6. Treatment Plan APIs

### POST /treatment-plans
**Doctor creates treatment plan**
```json
Request:
{
  "patientEmail": "patient@example.com",
  "insulinType": "Humalog",
  "basalDose": 20,
  "bolusDose": 1.5,
  "carbRatio": 15,
  "correctionFactor": 50,
  "targetGlucoseRange": {
    "min": 80,
    "max": 180
  },
  "targetA1C": 7.0,
  "notes": "Start with conservative basal dose"
}

Response: 201
{
  "message": "Treatment plan created successfully",
  "treatmentPlan": { ... }
}
```

### PUT /treatment-plans/:id
**Doctor updates treatment plan (creates new version)**
```json
Request:
{
  "basalDose": 22,
  "bolusDose": 1.8,
  "notes": "Increased basal after reviewing 2-week data"
}

Response: 200
{
  "message": "Treatment plan updated successfully",
  "treatmentPlan": { ... }
}
```

### GET /treatment-plans/active
**Get active treatment plan**
```
Query params:
- patientEmail: (required for doctors)

Response: 200
{
  "treatmentPlan": {
    "version": 2,
    "isActive": true,
    "insulinType": "Humalog",
    "basalDose": 22,
    ...
  }
}
```

### GET /treatment-plans/history
**Get treatment plan history**
```
Query params:
- patientEmail: (required for doctors)

Response: 200
{
  "treatmentPlans": [
    { "version": 2, "isActive": true, ... },
    { "version": 1, "isActive": false, ... }
  ]
}
```

### PATCH /treatment-plans/:id/deactivate
**Deactivate treatment plan**
```
Response: 200
{
  "message": "Treatment plan deactivated successfully",
  "treatmentPlan": { ... }
}
```

---

## 7. Health Data Attachment APIs

### POST /health-data/:healthDataId/attachments
**Upload attachment to health data record**
```
Request: multipart/form-data
- file: (binary)

Response: 201
{
  "message": "File uploaded successfully",
  "attachment": {
    "id": "...",
    "fileName": "lab_results.pdf",
    "fileType": "application/pdf",
    "fileSize": 245678,
    "uploadedAt": "..."
  }
}
```

### GET /health-data/:healthDataId/attachments
**Get all attachments for health data record**
```
Response: 200
{
  "attachments": [
    {
      "_id": "...",
      "fileName": "lab_results.pdf",
      "fileType": "application/pdf",
      "fileSize": 245678,
      "createdAt": "..."
    }
  ]
}
```

### GET /health-data/attachments/:id
**Get attachment metadata**
```
Response: 200
{
  "attachment": { ... }
}
```

### GET /health-data/attachments/:id/download
**Download attachment**
```
Response: 200
Content-Type: application/pdf (or image/jpeg, etc.)
Content-Disposition: attachment; filename="lab_results.pdf"
```

### DELETE /health-data/attachments/:id
**Delete attachment**
```
Response: 200
{ "message": "Attachment deleted successfully" }
```

---

## Notification Types Extended

New notification types added for ML features:

- `care_request_received` - Doctor receives care request
- `care_request_approved` - Patient's care request approved
- `care_request_rejected` - Patient's care request rejected
- `health_alert` - ML detected health risk (hypo/hyper, hypertension)
- `dosage_review_requested` - Doctor needs to review AI dosage suggestion
- `dosage_suggestion_generated` - Patient's AI suggestion created
- `dosage_suggestion_approved` - Doctor approved dosage
- `dosage_suggestion_rejected` - Doctor rejected dosage
- `dosage_suggestion_applied` - Patient applied dosage
- `treatment_plan_created` - Doctor created treatment plan
- `treatment_plan_updated` - Doctor updated treatment plan
- `treatment_plan_deactivated` - Treatment plan deactivated
- `reminder_due` - Reminder notification triggered

---

## Error Responses

All endpoints follow standard error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical details"
}
```

Common status codes:
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 503: Service Unavailable (ML service down)
- 500: Internal Server Error

---

## Authentication

Include JWT token in all requests (except /auth endpoints):

```
Authorization: Bearer <token>
```

Token contains: `userId`, `email`, `role` (patient/doctor/caregiver/admin)

---

## ML Service Integration

Backend communicates with Python FastAPI ML microservice at `http://localhost:8000`:

- `POST /predict/hypertension` - SVM hypertension prediction
- `POST /predict/glucose` - LSTM glucose forecast
- `POST /predict/insulin-dosage` - AI dosage advisor

ML service endpoints will be documented separately once microservice is built.

---

## Data Flow Examples

### Complete Dosage Workflow:

1. **Patient** creates care relationship request → Doctor notified
2. **Doctor** approves request → Patient notified
3. **Doctor** creates treatment plan → Patient notified
4. **Patient** records glucose time series data (5-min intervals)
5. **Patient** requests AI dosage suggestion → ML service processes → Doctor notified
6. **Doctor** reviews and approves → Patient notified
7. **Patient** applies dosage → Recorded in health data → Doctor notified

### Prediction Workflow:

1. **Patient** enters health data regularly
2. **Patient** triggers prediction (hypertension or glucose)
3. ML service processes → Creates ModelRun record
4. If high risk detected → Notification created
5. **Patient** can submit feedback → Used for model improvement

---

## Rate Limiting

All `/api/*` routes are rate limited:
- 100 requests per 15 minutes per IP
- 429 status returned when exceeded

---

## File Upload Constraints

- Max size: 10MB per file
- Allowed types: JPEG, PNG, PDF
- Stored locally at: `backend/uploads/health-attachments/`
- Production: Migrate to S3-compatible cloud storage

---

## Timezone Handling

All reminders use `Asia/Karachi` timezone. Adjust in:
- `backend/models/Reminder.js`
- Reminder cron job (to be implemented)

---

## Next Steps

1. Build ML microservice (Python FastAPI)
2. Setup job queue for async predictions (BullMQ + Redis)
3. Implement reminder cron job
4. Migrate file storage to cloud (S3/MinIO)
5. Update frontend patient/doctor screens
6. Add WebSocket for real-time notifications
7. Deploy ML models with versioning
