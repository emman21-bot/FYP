# Doctor-Patient Connection Module

## Overview
Complete bidirectional doctor-patient relationship system allowing patients to find doctors, send connection requests, and doctors to manage patients with full medical record access.

## Patient-Side Features

### 1. Find a Doctor (FindDoctorScreen)
**Access:** Patient Drawer → "Find a Doctor"

**Features:**
- Browse all active doctors accepting patients
- View detailed doctor profiles in modal:
  - Full name, specialization, qualifications
  - Years of experience, consultation fee
  - Languages spoken, hospital affiliation
  - Bio and profile picture
- Send "Be My Doctor" request with confirmation
- Real-time request status updates

**File:** `src/screens/patient/FindDoctorScreen.js` (690 lines)

**API Used:**
- `doctorAPI.getAllDoctors()` - Fetch doctor list
- `careRelationshipAPI.sendDoctorRequest(doctorId)` - Send request

---

## Doctor-Side Features

### 2. Patient Requests (DoctorPatientRequestsScreen)
**Access:** Doctor Drawer → "Patient Requests"

**Features:**
- View all pending patient connection requests
- Click any request card to view patient medical history modal:
  - Latest vital signs (glucose, BP, heart rate, weight)
  - 30-day averages with health status indicators
  - Total health records count
  - Color-coded health status badges (Normal/Elevated/High)
- Accept request with optional approval notes
- Reject request with required rejection reason
- Auto-refresh on screen focus

**File:** `src/screens/doctor/DoctorPatientRequestsScreen.js` (720 lines)

**Workflow:**
1. Doctor sees pending request → clicks "View History"
2. Modal shows complete medical overview
3. Doctor clicks "Accept" → optional notes input → confirm
4. Patient gets notification, relationship becomes "active"
5. Patient card moves to "My Patients" screen

**API Used:**
- `careRelationshipAPI.getCareRelationships('requested')` - Get pending requests
- `healthDataAPI.getHealthData(patientEmail)` - Fetch patient records
- `careRelationshipAPI.approvePatientRequest(id, notes)` - Approve
- `careRelationshipAPI.rejectPatientRequest(id, reason)` - Reject

---

### 3. My Patients (DoctorMyPatientsScreen)
**Access:** Doctor Drawer → "My Patients"

**Features:**
- View all active patient connections
- Click patient card to view complete medical records modal:
  - Latest readings: glucose, BP, heart rate, weight, insulin dose
  - 30-day averages with trend analysis
  - Health status color-coding
  - Total health records count
- Download patient medical report as PDF:
  - Professional formatted report with patient info
  - All vital signs with timestamps
  - 30-day averages and trends
  - Shareable via native share sheet
- Terminate care relationship (with confirmation)
- Pull-to-refresh functionality

**File:** `src/screens/doctor/DoctorMyPatientsScreen.js` (890 lines)

**PDF Export Features:**
- Uses `expo-print` to generate PDF from HTML template
- Includes patient demographics, latest vitals, averages
- Color-coded health status indicators
- Professional medical report formatting
- Native sharing via `expo-sharing`

**API Used:**
- `careRelationshipAPI.getCareRelationships('active')` - Get active patients
- `healthDataAPI.getHealthData(patientEmail)` - Fetch records
- `careRelationshipAPI.terminateCareRelationship(id, reason)` - End care

---

## Backend API

### Care Relationship Endpoints
All endpoints already implemented in backend:

**POST** `/api/care-relationships/request`
- Patient sends request to doctor
- Creates relationship with status: 'requested'

**PATCH** `/api/care-relationships/:id/approve`
- Doctor approves request
- Updates status: 'requested' → 'active'
- Sends notification to patient

**PATCH** `/api/care-relationships/:id/reject`
- Doctor rejects request with reason
- Deletes relationship record
- Sends rejection notification to patient

**GET** `/api/care-relationships?status=active`
- Get all relationships by status
- Filters by patientId or doctorId

**PATCH** `/api/care-relationships/:id/end`
- Terminate active relationship
- Updates status: 'active' → 'terminated'

### Database Schema (CareRelationship Model)
```javascript
{
  patientId: ObjectId,
  patientEmail: String,
  patientName: String,
  doctorId: ObjectId,
  doctorEmail: String,
  doctorName: String,
  status: ['requested', 'active', 'suspended', 'terminated'],
  requestedAt: Date,
  approvedAt: Date,
  terminatedAt: Date,
  consentScopes: [String],
  notes: String
}
```

---

## Navigation Structure

### Patient Navigation
```
CustomDrawer (Patient)
├── Dashboard
├── AI Predictions
├── Health Data
├── Reports
├── Appointments
├── Medications
├── Alerts
└── Find a Doctor ← NEW
```

### Doctor Navigation
```
DoctorDrawer
├── Dashboard
├── Profile
├── Patient Requests ← NEW
├── My Patients ← NEW
├── Reports
├── Appointments
├── Patients (Original)
└── Alerts
```

---

## Health Status Indicators

### Blood Glucose
- **Low:** < 70 mg/dL (Red)
- **Normal:** 70-140 mg/dL (Green)
- **Elevated:** 141-180 mg/dL (Orange)
- **High:** > 180 mg/dL (Red)

### Blood Pressure
- **Normal:** < 120/80 mmHg (Green)
- **Elevated:** 120-129/<80 mmHg (Orange)
- **High Stage 1:** 130-139/80-89 mmHg (Orange)
- **High Stage 2:** ≥ 140/90 mmHg (Red)

---

## UI Components

### Health Card Component (Reusable)
Displays single health metric with:
- Icon (emoji)
- Title (metric name)
- Value with unit
- Status badge (color-coded)

Used in both request and patient screens for consistency.

---

## Complete Workflow

### Patient → Doctor Connection Flow

1. **Patient Side:**
   - Opens drawer → "Find a Doctor"
   - Browses doctor list
   - Clicks doctor card → views profile modal
   - Clicks "Be My Doctor" → confirmation alert
   - Request sent → toast notification

2. **Doctor Side:**
   - Receives notification (backend)
   - Opens drawer → "Patient Requests"
   - Sees new request card
   - Clicks "View History" → medical data modal opens
   - Reviews patient health records
   - Clicks "Accept" → adds optional notes → confirms
   - Patient relationship becomes active

3. **Ongoing Access:**
   - Patient card appears in "My Patients"
   - Doctor clicks patient → views full medical records
   - Can download PDF report anytime
   - Can terminate relationship if needed

---

## Error Handling

All screens include:
- Loading states with ActivityIndicator
- Empty states with helpful messages
- Try-catch error handling
- User-friendly error alerts
- Pull-to-refresh on network errors
- Graceful fallbacks for missing data

---

## Dependencies Used

### New Packages
- `expo-print` - PDF generation from HTML
- `expo-sharing` - Native share functionality

### Existing Packages
- `@react-navigation/native` - Screen navigation
- `@react-native-async-storage/async-storage` - User data
- React Native core components

---

## Files Modified/Created

### Created Files (3)
1. `src/services/careRelationshipAPI.js` - API service
2. `src/screens/patient/FindDoctorScreen.js` - Patient find doctors
3. `src/screens/doctor/DoctorPatientRequestsScreen.js` - Doctor requests
4. `src/screens/doctor/DoctorMyPatientsScreen.js` - Doctor patients list
5. `src/screens/doctor/index.js` - Doctor screen exports

### Modified Files (5)
1. `App.js` - Added FindDoctor route
2. `src/screens/patient/index.js` - Exported FindDoctorScreen
3. `src/components/CustomDrawer.js` - Added "Find a Doctor" menu
4. `src/components/DoctorDrawer.js` - Added "Patient Requests" + "My Patients"
5. `src/navigation/DoctorStackNavigator.js` - Added doctor screens

---

## Testing Checklist

### Patient Side
- [ ] Drawer shows "Find a Doctor" option
- [ ] Doctor list loads successfully
- [ ] Doctor profile modal displays all info
- [ ] "Be My Doctor" sends request
- [ ] Confirmation alerts work
- [ ] Can't send duplicate requests

### Doctor Side
- [ ] Drawer shows "Patient Requests" and "My Patients"
- [ ] Pending requests appear correctly
- [ ] Medical history modal loads patient data
- [ ] Health status badges show correct colors
- [ ] Accept request works (with/without notes)
- [ ] Reject request requires reason
- [ ] Approved patients appear in "My Patients"
- [ ] PDF download generates correctly
- [ ] PDF shares via native dialog
- [ ] Terminate relationship requires confirmation

---

## Next Steps (Optional Enhancements)

1. **Real-time Updates:**
   - WebSocket notifications for new requests
   - Auto-refresh when request approved

2. **Advanced Analytics:**
   - Patient health trend charts in modal
   - Risk score calculation

3. **Communication:**
   - In-app messaging between doctor-patient
   - Appointment scheduling from patient card

4. **Search & Filter:**
   - Search doctors by specialization
   - Filter by location, rating, fee range

5. **Patient Consent:**
   - Granular data sharing permissions
   - Consent form before sharing records

---

## Security Considerations

- All API calls authenticated with JWT tokens
- Patient data filtered by relationship status
- Email-based queries prevent ID manipulation
- Audit logs for all relationship changes (backend)
- Consent tracking in CareRelationship model
- HIPAA-compliant data handling practices

---

## Color Theme

Using existing `Colors` from `constants/theme.js`:
- Primary: Blue (#007AFF)
- Success: Green (#34C759)
- Warning: Orange (#FF9500)
- Error: Red (#FF3B30)
- Background: Light gray (#F2F2F7)
- Text: Dark gray (#000000)
- TextLight: Medium gray (#8E8E93)

---

## Summary

✅ **Patient Side:** Complete find doctor + request workflow
✅ **Doctor Side:** Request management + patient records access
✅ **PDF Export:** Professional medical reports
✅ **Navigation:** Integrated into both patient and doctor drawers
✅ **Backend:** Fully functional API endpoints
✅ **UI/UX:** Consistent design, loading states, error handling
✅ **Status Indicators:** Color-coded health metrics

The doctor-patient connection module is now **fully implemented** and ready for testing!
