# 🚀 DailyMed ML Service - Complete Deployment Guide

## ⚠️ IMPORTANT: Python Installation Required

The ML service requires Python 3.8+ to be installed on your system.

### Step 1: Install Python

**Option A: Direct Download (Recommended)**
1. Visit https://www.python.org/downloads/
2. Download Python 3.11 or later (Windows 64-bit)
3. Run installer
4. **IMPORTANT**: Check "Add Python to PATH" during installation
5. Verify installation:
   ```powershell
   python --version
   # Should show: Python 3.11.x
   ```

**Option B: Using Winget (Windows Package Manager)**
```powershell
winget install Python.Python.3.11
```

**Option C: Using Chocolatey**
```powershell
choco install python
```

### Step 2: Verify Python Installation

Open a NEW PowerShell window and run:
```powershell
python --version
pip --version
```

Both should work without errors.

---

## 📦 ML Service Installation

### 1. Navigate to ML Service Directory
```powershell
cd d:\SaadFYP\Application\DailyMed\ml-service
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

This will install:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- XGBoost (hypertension model)
- CatBoost (glucose model)
- PyMongo (database connector)
- NumPy, Pandas, Scikit-learn

### 3. Export Trained Models

**Option A: Automatic Export**
```powershell
cd training
python export_models.py
```

**Option B: Manual Export from Jupyter Notebooks**

Open `ai_models/SVM.ipynb` and add this cell at the end:
```python
import joblib
import os

# Save the XGBoost model
model_path = os.path.join('..', 'ml-service', 'models', 'xgb_hypertension_dailyMed.pkl')
joblib.dump(xgb, model_path)
print(f"Model saved to: {model_path}")
```

Open `ai_models/Blood_Glucose_Prediction.ipynb` and add:
```python
import os

# Save the CatBoost model
model_path = os.path.join('..', 'ml-service', 'models', 'catboost_bg_model.cbm')
model.save_model(model_path)
print(f"Model saved to: {model_path}")
```

### 4. Verify Model Files

Check that these files exist:
```
ml-service/
└── models/
    ├── xgb_hypertension_dailyMed.pkl  ✅
    └── catboost_bg_model.cbm          ✅
```

If not, the service will use **mock predictors** for testing.

---

## 🏃 Running the ML Service

### 1. Ensure MongoDB is Running

The backend MongoDB should already be running. Verify:
```powershell
mongosh
# Or open MongoDB Compass
```

### 2. Start ML Service

```powershell
cd d:\SaadFYP\Application\DailyMed\ml-service
python main.py
```

You should see:
```
🚀 Starting DailyMed ML Service...
✅ Database connected
✅ Hypertension model loaded
✅ Glucose prediction model loaded
🎉 ML Service ready!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 3. Verify Service is Running

Open browser to: http://localhost:8000/health

Expected response:
```json
{
  "status": "healthy",
  "models": {
    "hypertension": true,
    "glucose": true
  },
  "database": true,
  "timestamp": "2025-12-11T..."
}
```

### 4. Access API Documentation

**Interactive API Docs**: http://localhost:8000/docs
- Test all endpoints directly in browser
- See request/response schemas
- Try example requests

---

## 🧪 Testing the ML Service

### Test Hypertension Prediction

Using PowerShell:
```powershell
$body = @{
    patient_email = "patient@example.com"
    systolic_bp = 145
    diastolic_bp = 92
    age = 45
    family_history = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/predict/hypertension" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

### Test Glucose Prediction

```powershell
$body = @{
    patient_email = "patient@example.com"
    current_glucose = 6.5
    insulin_dose = 12
    carbohydrate_intake = 55
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/predict/glucose" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

### Test Insulin Recommendation

```powershell
$body = @{
    patient_email = "patient@example.com"
    current_insulin_dose = 12
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/predict/insulin-dosage" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

---

## 🔗 Connecting Backend to ML Service

The backend is already configured to call the ML service. Verify in `.env`:

```env
ML_SERVICE_URL=http://localhost:8000
```

### Test Backend Integration

1. Start Backend:
   ```powershell
   cd d:\SaadFYP\Application\DailyMed\backend
   npm start
   ```

2. Start ML Service (in another terminal):
   ```powershell
   cd d:\SaadFYP\Application\DailyMed\ml-service
   python main.py
   ```

3. Test from mobile app:
   - Log in as patient
   - Navigate to Dashboard
   - Should see AI predictions and insulin recommendations

---

## 📱 Testing Complete Flow

### 1. Patient Logs Health Data
```
Mobile App → POST /api/health-data
{
  "bloodGlucose": 6.5,
  "bloodPressure": "145/92",
  "temperature": 37.2
}
```

### 2. Patient Views Dashboard
```
Mobile App → GET /api/analytics/dashboard
Backend → GET http://localhost:8000/predict/hypertension
Backend → GET http://localhost:8000/predict/glucose
Backend aggregates results → Returns to mobile
```

### 3. Dashboard Shows AI Predictions
- Blood Sugar card with AI forecast
- Blood Pressure with hypertension risk
- Insulin dosage recommendation

### 4. Doctor Approves Insulin Suggestion
```
Doctor App → PATCH /api/dosage-suggestions/:id/approve
Creates notification for patient
```

---

## 🐛 Troubleshooting

### Error: "Python not found"
- Install Python from python.org
- Restart PowerShell after installation
- Add Python to PATH environment variable

### Error: "No module named 'fastapi'"
```powershell
pip install fastapi uvicorn
```

### Error: "No module named 'catboost'"
```powershell
pip install catboost
```

### Error: "Model file not found"
- Service will use mock predictors automatically
- Export models from Jupyter notebooks
- Place in `ml-service/models/` folder

### Error: "Database connection failed"
- Check MongoDB is running
- Verify MONGO_URI in `.env`
- Check firewall settings

### Port 8000 Already in Use
Edit `.env`:
```env
ML_SERVICE_PORT=8001
```

Also update backend `.env`:
```env
ML_SERVICE_URL=http://localhost:8001
```

---

## 🎯 Deployment Checklist

- [ ] Python 3.8+ installed
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] Model files exported to `models/` folder
- [ ] MongoDB running
- [ ] ML service starts without errors
- [ ] Health check returns `{"status": "healthy"}`
- [ ] Backend can connect to ML service
- [ ] Mobile app dashboard shows AI predictions

---

## 📊 Expected Model Performance

### Hypertension Prediction
- Model: XGBoost Classifier
- Training Accuracy: ~92%
- Features: 11 features (age, BP, lifestyle)
- Output: Risk score 0-1, recommendation

### Glucose Forecasting
- Model: CatBoost Regressor
- R² Score: ~0.85
- Features: Historical glucose, insulin, diet
- Output: 6-hour forecast with confidence

---

## 🚦 Service Status Indicators

| Indicator | Meaning |
|-----------|---------|
| ✅ Models loaded | Model files found and loaded successfully |
| ⚠️ Mock predictor | Model files not found, using rule-based predictions |
| ✅ Database connected | MongoDB connection successful |
| ⚠️ Standalone mode | Running without database (mock data) |

---

## 🔒 Security Notes

**For Development (Current Setup)**
- CORS: Allows all origins (`*`)
- No authentication required
- Mock data when DB unavailable

**For Production (Future)**
- Restrict CORS to specific domains
- Add API key authentication
- Enable HTTPS/TLS
- Implement rate limiting
- Encrypt patient data
- HIPAA compliance audit

---

## 📞 Support

If you encounter issues:

1. Check logs in terminal where ML service is running
2. Verify all dependencies are installed
3. Ensure MongoDB is running
4. Check model files exist
5. Test with mock data first (no models needed)

---

## 🎉 Success!

When everything is running:

1. **Backend**: http://localhost:5000/api
2. **ML Service**: http://localhost:8000
3. **ML Docs**: http://localhost:8000/docs
4. **Mobile App**: Connected to both services

Your AI-powered diabetes management platform is live! 🚀
