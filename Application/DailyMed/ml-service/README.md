# DailyMed ML Microservice

AI-powered health prediction service for DailyMed diabetes management platform.

## 🎯 Features

- **Hypertension Risk Prediction**: XGBoost model predicting hypertension risk based on patient vitals
- **Blood Glucose Forecasting**: CatBoost regression model for 6-hour glucose prediction
- **Insulin Dosage Recommendations**: Rule-based system for insulin adjustment suggestions
- **MongoDB Integration**: Real-time patient data fetching from DailyMed database
- **RESTful API**: FastAPI-based microservice with automatic documentation

## 📋 Prerequisites

- Python 3.8+
- MongoDB (running on localhost:27017)
- Trained model files (see Model Setup section)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

### 2. Setup Environment

Create `.env` file:
```env
MONGO_URI=mongodb://localhost:27017/dailymed
ML_SERVICE_PORT=8000
```

### 3. Export Trained Models

You need to export the trained models from your Jupyter notebooks:

**From `ai_models/SVM.ipynb`:**
```python
import joblib
# After training your XGBoost model
joblib.dump(xgb, 'ml-service/models/xgb_hypertension_dailyMed.pkl')
```

**From `ai_models/Blood_Glucose_Prediction.ipynb`:**
```python
from catboost import CatBoostRegressor
# After training your CatBoost model
model.save_model('ml-service/models/catboost_bg_model.cbm')
```

### 4. Run the Service

```bash
python main.py
```

The service will start on `http://localhost:8000`

## 📚 API Documentation

Once running, visit:
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔌 API Endpoints

### Health Check
```
GET /health
```

### Hypertension Prediction
```
POST /predict/hypertension
Content-Type: application/json

{
  "patient_email": "patient@example.com",
  "age": 45,
  "systolic_bp": 135,
  "diastolic_bp": 85,
  "family_history": true,
  "smoking_status": false,
  "salt_intake": 6.5,
  "stress_score": 7,
  "exercise_level": "Moderate"
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "has_hypertension_risk": true,
    "risk_score": 0.7234,
    "risk_level": "HIGH",
    "recommendation": "CONSULT_DOCTOR",
    "explanation": "Moderate hypertension risk (72.34% confidence)..."
  },
  "metadata": {
    "model": "XGBoost Hypertension Classifier",
    "timestamp": "2025-12-11T10:30:00Z"
  }
}
```

### Glucose Prediction
```
POST /predict/glucose
Content-Type: application/json

{
  "patient_email": "patient@example.com",
  "current_glucose": 6.5,
  "carbohydrate_intake": 55,
  "insulin_dose": 12,
  "exercise_minutes": 30
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "predicted_glucose": 7.2,
    "unit": "mmol/L",
    "forecast_6h": [
      {"hour": 1, "predicted_glucose": 7.1, "confidence": 0.9},
      {"hour": 2, "predicted_glucose": 7.3, "confidence": 0.85}
    ],
    "trend": "increasing",
    "risk_zone": "NORMAL"
  }
}
```

### Insulin Dosage Recommendation
```
POST /predict/insulin-dosage
Content-Type: application/json

{
  "patient_email": "patient@example.com",
  "current_insulin_dose": 12
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "action": "MAINTAIN",
    "current_dose": 12.0,
    "suggested_dose": 12.0,
    "explanation": "Your predicted blood glucose is within optimal range...",
    "urgency": "LOW",
    "requires_doctor_approval": false
  }
}
```

## 🗂️ Project Structure

```
ml-service/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── .env                    # Environment configuration
├── README.md              # This file
├── services/
│   ├── __init__.py
│   ├── hypertension_predictor.py   # Hypertension prediction logic
│   ├── glucose_predictor.py        # Glucose forecasting logic
│   ├── insulin_advisor.py          # Insulin recommendation logic
│   └── database.py                 # MongoDB integration
├── models/
│   ├── xgb_hypertension_dailyMed.pkl   # XGBoost model (to be added)
│   └── catboost_bg_model.cbm           # CatBoost model (to be added)
└── training/
    └── export_models.py    # Script to export models from notebooks
```

## 🧪 Testing

### Test with Mock Data

If model files are not available, the service will use mock predictors for testing:

```bash
curl -X POST http://localhost:8000/predict/hypertension \
  -H "Content-Type: application/json" \
  -d '{"patient_email": "test@example.com", "systolic_bp": 145}'
```

### Test with Database

Ensure MongoDB is running and contains patient data:

```bash
# Check database connection
curl http://localhost:8000/health
```

## 🔧 Model Training & Export

### Step 1: Train Models in Jupyter

Run the existing notebooks:
- `ai_models/SVM.ipynb` → Train XGBoost hypertension classifier
- `ai_models/Blood_Glucose_Prediction.ipynb` → Train CatBoost glucose regressor

### Step 2: Export Models

Use the export script:

```bash
cd ml-service
python training/export_models.py
```

Or manually from notebooks:

```python
# In SVM.ipynb (after training)
import joblib
joblib.dump(xgb, '../ml-service/models/xgb_hypertension_dailyMed.pkl')

# In Blood_Glucose_Prediction.ipynb (after training)
model.save_model('../ml-service/models/catboost_bg_model.cbm')
```

## 🔗 Integration with Backend

The Node.js backend calls these endpoints via axios:

```javascript
// backend/controllers/predictionController.js
const response = await axios.post('http://localhost:8000/predict/hypertension', {
  patient_email: req.user.email,
  systolic_bp: healthData.bloodPressure.split('/')[0]
});
```

## 🛡️ Security Notes

- **Production**: Set `allow_origins` in CORS to specific domains
- **Authentication**: Add API key validation for production
- **HIPAA Compliance**: Encrypt sensitive health data in transit and at rest
- **Rate Limiting**: Implement rate limiting to prevent abuse

## 📊 Model Performance

### Hypertension Model (XGBoost)
- Accuracy: ~92% (from training notebook)
- Features: Age, BP, Family History, Lifestyle factors
- Output: Binary classification + risk score

### Glucose Prediction (CatBoost)
- R² Score: ~0.85 (from training notebook)
- Features: Historical glucose, insulin, carbs, exercise
- Output: Continuous glucose forecast (mmol/L)

## 🐛 Troubleshooting

### Error: "Model file not found"
- Export models from Jupyter notebooks to `models/` folder
- Service will use mock predictors if models unavailable

### Error: "Database connection failed"
- Ensure MongoDB is running: `mongod`
- Check MONGO_URI in `.env` file

### Port Already in Use
- Change port in `.env`: `ML_SERVICE_PORT=8001`

## 📝 License

Part of DailyMed diabetes management platform - Final Year Project

## 🤝 Contributing

This is a research project. For questions, contact the development team.
