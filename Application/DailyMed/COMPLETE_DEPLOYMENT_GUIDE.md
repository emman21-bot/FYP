# 🚀 Complete DailyMed System Deployment Guide

## Overview
This guide will help you deploy the complete DailyMed diabetes management platform with AI-powered predictions.

**System Components:**
1. MongoDB Database
2. Node.js Backend API (Port 5000)
3. Python ML Microservice (Port 8000)
4. React Native Mobile App (Expo)

---

## ✅ Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Python 3.8+ installed
- [ ] MongoDB installed and running
- [ ] Git installed
- [ ] Expo CLI installed (`npm install -g expo-cli`)
- [ ] Android Studio / Xcode (for mobile testing)

---

## 📦 Part 1: Install Python (if not installed)

### Windows:
1. Download Python from https://www.python.org/downloads/
2. Run installer
3. **IMPORTANT**: Check "Add Python to PATH"
4. Verify:
   ```powershell
   python --version
   pip --version
   ```

### Verification:
```powershell
python --version  # Should show Python 3.8+
pip --version     # Should show pip
```

---

## 🗄️ Part 2: MongoDB Setup

### Start MongoDB:
```powershell
# If installed as service:
net start MongoDB

# Or start manually:
mongod --dbpath="C:\data\db"
```

### Verify:
```powershell
mongosh
# Should connect to MongoDB shell
```

---

## 🔧 Part 3: Backend Setup

### 1. Navigate to Backend:
```powershell
cd d:\SaadFYP\Application\DailyMed\backend
```

### 2. Install Dependencies (if not already):
```powershell
npm install
```

### 3. Configure Environment:
Create/edit `.env` file:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dailymed
JWT_SECRET=your-secret-key-here
ML_SERVICE_URL=http://localhost:8000
```

### 4. Start Backend:
```powershell
npm start
```

**Expected Output:**
```
Server running on port 5000
MongoDB connected successfully
```

### 5. Test Backend:
Open browser: http://localhost:5000/api/health

---

## 🤖 Part 4: ML Service Setup

### 1. Navigate to ML Service:
```powershell
cd d:\SaadFYP\Application\DailyMed\ml-service
```

### 2. Install Python Dependencies:
```powershell
pip install -r requirements.txt
```

**This installs:**
- FastAPI (web framework)
- Uvicorn (ASGI server)
- XGBoost (hypertension model)
- CatBoost (glucose model)
- PyMongo (database)
- NumPy, Pandas, Scikit-learn

### 3. Export Trained Models:

**Option A: Automatic (if models exist in ai_models/):**
```powershell
cd training
python export_models.py
```

**Option B: Manual from Jupyter Notebooks:**

Open `ai_models/SVM.ipynb` and add/run this cell:
```python
import joblib
import os

# Ensure XGBoost model is trained
# Then save it:
output_path = os.path.join('..', 'ml-service', 'models', 'xgb_hypertension_dailyMed.pkl')
joblib.dump(xgb, output_path)
print(f"Model saved: {output_path}")
```

Open `ai_models/Blood_Glucose_Prediction.ipynb` and add/run:
```python
import os

# Ensure CatBoost model is trained
# Then save it:
output_path = os.path.join('..', 'ml-service', 'models', 'catboost_bg_model.cbm')
model.save_model(output_path)
print(f"Model saved: {output_path}")
```

**Verify models exist:**
```powershell
dir models
# Should show:
# xgb_hypertension_dailyMed.pkl
# catboost_bg_model.cbm
```

### 4. Start ML Service:

**Option A: Using Batch File:**
```powershell
.\start-ml-service.bat
```

**Option B: Direct Python:**
```powershell
python main.py
```

**Expected Output:**
```
🚀 Starting DailyMed ML Service...
✅ Database connected
✅ Hypertension model loaded
✅ Glucose prediction model loaded
🎉 ML Service ready!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 5. Test ML Service:

**Health Check:**
```powershell
curl http://localhost:8000/health
```

**Interactive Docs:**
Open browser: http://localhost:8000/docs

**Run Test Suite:**
```powershell
pip install requests colorama
python test_service.py
```

---

## 📱 Part 5: Mobile App Setup

### 1. Navigate to Root:
```powershell
cd d:\SaadFYP\Application\DailyMed
```

### 2. Install Dependencies (if not already):
```powershell
npm install
```

### 3. Update API URL:

Edit `src/screens/patient/PatientDashboard.js` (and other screens):
```javascript
const API_URL = 'http://YOUR_IP_ADDRESS:5000/api';
// Replace YOUR_IP_ADDRESS with your computer's local IP
```

**Find your IP:**
```powershell
ipconfig
# Look for IPv4 Address under your network adapter
```

### 4. Start Expo:
```powershell
npx expo start
```

### 5. Run on Device:
- Scan QR code with Expo Go app (iOS/Android)
- Or press `a` for Android emulator
- Or press `i` for iOS simulator

---

## 🧪 Part 6: Complete System Test

### Test Flow 1: Register & Login
1. Open mobile app
2. Register new patient account
3. Login successfully

### Test Flow 2: Log Health Data
1. Navigate to "Log Vitals"
2. Enter:
   - Blood Glucose: 120 mg/dL
   - Blood Pressure: 130/85 mmHg
   - Temperature: 98.6°F
   - Weight: 150 lbs
3. Submit

### Test Flow 3: View Dashboard
1. Navigate to Dashboard
2. Should see:
   - Blood Sugar average card
   - Blood Pressure average card
   - Today's vitals
   - **AI Prediction Cards** (if ML service running)
   - Glucose forecast chart
   - Insulin dosage recommendation

### Test Flow 4: Doctor Hiring
1. Navigate to "Doctors" tab
2. Browse doctors
3. Send "Be My Doctor" request
4. (Login as doctor)
5. Approve request
6. (Back to patient) See assigned doctor

### Test Flow 5: AI Predictions
1. Trigger hypertension prediction:
   ```powershell
   # Via API:
   curl -X POST http://localhost:5000/api/predictions/hypertension \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json"
   ```

2. Check predictions on dashboard
3. Verify AI recommendations appear

---

## 🔍 Troubleshooting

### Issue: Backend won't start
- Check MongoDB is running: `mongosh`
- Check port 5000 is free: `netstat -ano | findstr :5000`
- Verify `.env` file exists and has correct MONGO_URI

### Issue: ML Service won't start
- Install Python dependencies: `pip install -r requirements.txt`
- Check Python version: `python --version` (need 3.8+)
- Model files missing → Service will use mock predictors (still works!)

### Issue: "ML Service unavailable" on mobile
- Verify ML service is running: http://localhost:8000/health
- Check backend `.env` has `ML_SERVICE_URL=http://localhost:8000`
- Restart backend after changing `.env`

### Issue: Mobile app can't connect to backend
- Use computer's IP address, not `localhost`
- Check firewall allows connections on port 5000
- Verify both devices on same Wi-Fi network

### Issue: Dashboard shows no data
- Ensure you've logged health data first
- Check backend logs for errors
- Verify JWT token is valid

---

## 📊 System Architecture

```
Mobile App (Expo)
    ↓ HTTP
Backend API (Node.js:5000)
    ↓ HTTP          ↓ MongoDB
ML Service (Python:8000)
    ↓ MongoDB
Database (MongoDB:27017)
```

**Data Flow:**
1. Patient logs vitals → Backend saves to MongoDB
2. Patient views dashboard → Backend aggregates data
3. Backend calls ML service → ML service fetches from MongoDB
4. ML service returns predictions → Backend sends to mobile
5. Mobile displays AI-powered dashboard

---

## 🎯 Deployment Checklist

### Backend:
- [ ] MongoDB running
- [ ] `npm install` completed
- [ ] `.env` configured
- [ ] `npm start` successful
- [ ] Health endpoint responds: http://localhost:5000/api/health

### ML Service:
- [ ] Python 3.8+ installed
- [ ] `pip install -r requirements.txt` completed
- [ ] Model files in `models/` folder (or using mock)
- [ ] `python main.py` successful
- [ ] API docs accessible: http://localhost:8000/docs

### Mobile App:
- [ ] `npm install` completed
- [ ] API_URL updated with correct IP
- [ ] `npx expo start` successful
- [ ] App loads on device/simulator

### Integration:
- [ ] Patient can register/login
- [ ] Patient can log health data
- [ ] Dashboard displays data
- [ ] AI predictions appear (if ML service running)
- [ ] Doctor can approve patient requests
- [ ] Notifications working

---

## 🚀 Quick Start Commands

### Terminal 1 - MongoDB (if not service):
```powershell
mongod --dbpath="C:\data\db"
```

### Terminal 2 - Backend:
```powershell
cd d:\SaadFYP\Application\DailyMed\backend
npm start
```

### Terminal 3 - ML Service:
```powershell
cd d:\SaadFYP\Application\DailyMed\ml-service
python main.py
```

### Terminal 4 - Mobile App:
```powershell
cd d:\SaadFYP\Application\DailyMed
npx expo start
```

---

## 📝 Environment Variables Summary

**Backend `.env`:**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dailymed
JWT_SECRET=your-secret-key-change-in-production
ML_SERVICE_URL=http://localhost:8000
```

**ML Service `.env`:**
```env
MONGO_URI=mongodb://localhost:27017/dailymed
ML_SERVICE_PORT=8000
```

---

## 🎉 Success Indicators

### You're ready when:
✅ Backend responds: `curl http://localhost:5000/api/health`
✅ ML service responds: `curl http://localhost:8000/health`
✅ Mobile app shows login screen
✅ Can register new user
✅ Dashboard loads with data
✅ AI predictions visible (if ML service running)

---

## 🔒 Security Notes

**Development Mode (Current):**
- CORS allows all origins
- JWT secret should be changed
- No rate limiting
- Mock ML predictors work without models

**Production Requirements:**
- Restrict CORS to specific domains
- Use strong JWT secret
- Enable HTTPS/TLS
- Implement rate limiting
- Add API key authentication for ML service
- HIPAA compliance audit

---

## 📞 Support

**Common Questions:**

**Q: Do I need to train the models?**
A: No! If model files aren't found, the ML service uses intelligent mock predictors that still demonstrate the complete workflow.

**Q: Can I deploy without the ML service?**
A: Yes! The backend gracefully handles ML service unavailability. Dashboard will show basic analytics without AI predictions.

**Q: How do I update the models?**
A: Re-train in Jupyter notebooks, export new .pkl/.cbm files to `ml-service/models/`, restart ML service.

---

## 🎓 Next Steps

After deployment:
1. Create test patient and doctor accounts
2. Log sample health data
3. Test all user flows
4. Review AI predictions
5. Test doctor approval workflow
6. Monitor logs for errors

---

**Deployment Date**: December 11, 2025
**Status**: ✅ READY FOR LOCAL DEPLOYMENT
**Documentation**: Complete
