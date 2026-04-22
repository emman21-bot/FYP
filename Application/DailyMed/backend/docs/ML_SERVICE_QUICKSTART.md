# ML Microservice Quick Start Guide

## Overview

This guide outlines how to build the Python FastAPI ML microservice that will integrate with the DailyMed backend.

**Service URL**: `http://localhost:8000`
**Framework**: Python FastAPI
**Models**: scikit-learn (SVM), TensorFlow/Keras (LSTM)

---

## Project Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment variables
│   ├── models/
│   │   ├── __init__.py
│   │   ├── hypertension_svm.py    # SVM model loader
│   │   ├── glucose_lstm.py        # LSTM model loader
│   │   └── insulin_advisor.py     # Dosage calculation logic
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── hypertension.py        # /predict/hypertension endpoint
│   │   ├── glucose.py             # /predict/glucose endpoint
│   │   └── insulin.py             # /predict/insulin-dosage endpoint
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── hypertension_schema.py
│   │   ├── glucose_schema.py
│   │   └── insulin_schema.py
│   └── utils/
│       ├── __init__.py
│       └── preprocessing.py
├── models/                  # Saved model files
│   ├── hypertension_svm.pkl
│   ├── glucose_lstm.h5
│   └── scaler.pkl
├── notebooks/              # Original Jupyter notebooks
│   ├── hypertension_svm.ipynb
│   └── glucose_lstm.ipynb
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Requirements

```txt
# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
python-dotenv==1.0.0
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.2
tensorflow==2.15.0  # or pytorch
joblib==1.3.2
python-multipart==0.0.6
```

---

## Endpoint Implementations

### 1. Hypertension Prediction (SVM)

**File**: `app/routers/hypertension.py`

```python
from fastapi import APIRouter, HTTPException
from app.schemas.hypertension_schema import HypertensionInput, HypertensionOutput
from app.models.hypertension_svm import predict_hypertension
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/predict/hypertension", response_model=HypertensionOutput)
async def predict(input_data: HypertensionInput):
    try:
        # Extract features
        features = [
            input_data.age,
            input_data.salt_intake,
            input_data.stress_score,
            input_data.sleep_duration,
            input_data.bmi,
            input_data.family_history,
            input_data.smoking_status,
            input_data.exercise_level,
            input_data.bp_history,
            input_data.systolic_bp,
            input_data.diastolic_bp
        ]
        
        # Get prediction
        prediction, confidence, risk_factors = predict_hypertension(features)
        
        # Generate recommendation
        recommendation = generate_hypertension_recommendation(
            prediction, risk_factors, input_data
        )
        
        return HypertensionOutput(
            prediction=int(prediction),
            confidence=float(confidence),
            riskFactors=risk_factors,
            recommendation=recommendation
        )
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_hypertension_recommendation(prediction, risk_factors, input_data):
    if prediction == 1:
        rec = "High hypertension risk detected. Recommendations:\n"
        if "bmi" in risk_factors:
            rec += "- Reduce BMI through diet and exercise\n"
        if "stress_score" in risk_factors:
            rec += "- Practice stress management techniques\n"
        if "salt_intake" in risk_factors:
            rec += "- Reduce salt intake to <2g/day\n"
        if "sleep_duration" in risk_factors:
            rec += "- Aim for 7-8 hours of sleep\n"
        rec += "- Consult your doctor for detailed assessment"
    else:
        rec = "Low hypertension risk. Continue healthy lifestyle practices."
    return rec
```

**Schema**: `app/schemas/hypertension_schema.py`

```python
from pydantic import BaseModel, Field
from typing import List

class HypertensionInput(BaseModel):
    age: int = Field(..., ge=0, le=120)
    salt_intake: float = Field(..., ge=0)
    stress_score: int = Field(..., ge=0, le=10)
    sleep_duration: float = Field(..., ge=0, le=24)
    bmi: float = Field(..., ge=10, le=60)
    family_history: int = Field(..., ge=0, le=1)
    smoking_status: int = Field(..., ge=0, le=2)
    exercise_level: int = Field(..., ge=0, le=5)
    bp_history: int = Field(..., ge=0, le=1)
    systolic_bp: int = Field(..., ge=70, le=250)
    diastolic_bp: int = Field(..., ge=40, le=150)

class HypertensionOutput(BaseModel):
    prediction: int
    confidence: float
    riskFactors: List[str]
    recommendation: str
```

**Model**: `app/models/hypertension_svm.py`

```python
import joblib
import numpy as np
import os

# Load model at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../models/hypertension_svm.pkl')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '../../models/scaler.pkl')

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

FEATURE_NAMES = [
    'age', 'salt_intake', 'stress_score', 'sleep_duration', 'bmi',
    'family_history', 'smoking_status', 'exercise_level', 'bp_history',
    'systolic_bp', 'diastolic_bp'
]

def predict_hypertension(features):
    """
    Predict hypertension risk
    Returns: (prediction, confidence, risk_factors)
    """
    # Scale features
    features_scaled = scaler.transform([features])
    
    # Get prediction
    prediction = model.predict(features_scaled)[0]
    
    # Get probability (confidence)
    if hasattr(model, 'predict_proba'):
        proba = model.predict_proba(features_scaled)[0]
        confidence = proba[prediction]
    else:
        confidence = 0.85  # Default for models without predict_proba
    
    # Identify risk factors (features with high contribution)
    risk_factors = identify_risk_factors(features, prediction)
    
    return prediction, confidence, risk_factors

def identify_risk_factors(features, prediction):
    """Identify which features contribute most to risk"""
    risk_factors = []
    
    # Simple rule-based risk factor identification
    age, salt, stress, sleep, bmi, family, smoking, exercise, bp_hist, sys, dias = features
    
    if prediction == 1:
        if bmi >= 30:
            risk_factors.append('bmi')
        if stress >= 7:
            risk_factors.append('stress_score')
        if sleep < 6:
            risk_factors.append('sleep_duration')
        if salt >= 3:
            risk_factors.append('salt_intake')
        if smoking >= 1:
            risk_factors.append('smoking_status')
        if exercise <= 1:
            risk_factors.append('exercise_level')
        if sys >= 140 or dias >= 90:
            risk_factors.append('blood_pressure')
    
    return risk_factors
```

---

### 2. Glucose Forecast (LSTM)

**File**: `app/routers/glucose.py`

```python
from fastapi import APIRouter, HTTPException
from app.schemas.glucose_schema import GlucoseInput, GlucoseOutput
from app.models.glucose_lstm import forecast_glucose
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/predict/glucose", response_model=GlucoseOutput)
async def predict(input_data: GlucoseInput):
    try:
        # Prepare sequence data
        sequence = []
        for record in input_data.sequence:
            sequence.append([
                record.bg,
                record.insulin,
                record.carbs,
                record.hr,
                record.steps,
                record.calories,
                record.activity
            ])
        
        # Get forecast
        predictions, timestamps, confidence, trend = forecast_glucose(
            sequence, input_data.forecast_horizon
        )
        
        return GlucoseOutput(
            forecast=predictions,
            timestamps=timestamps,
            confidence=confidence,
            trend=trend
        )
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Schema**: `app/schemas/glucose_schema.py`

```python
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class GlucoseRecord(BaseModel):
    bg: float = Field(..., ge=20, le=600)
    insulin: float = Field(default=0, ge=0)
    carbs: float = Field(default=0, ge=0)
    hr: float = Field(default=0, ge=0)
    steps: float = Field(default=0, ge=0)
    calories: float = Field(default=0, ge=0)
    activity: float = Field(default=0, ge=0)

class GlucoseInput(BaseModel):
    sequence: List[GlucoseRecord]
    forecast_horizon: int = Field(..., ge=1, le=12)  # 1-12 hours

class GlucoseOutput(BaseModel):
    forecast: List[float]
    timestamps: List[str]
    confidence: float
    trend: str  # 'rising', 'falling', 'stable'
```

**Model**: `app/models/glucose_lstm.py`

```python
import tensorflow as tf
import numpy as np
from datetime import datetime, timedelta
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../models/glucose_lstm.h5')
model = tf.keras.models.load_model(MODEL_PATH)

WINDOW_SIZE = 72  # 6 hours at 5-min intervals
FEATURES = 7  # bg, insulin, carbs, hr, steps, calories, activity

def forecast_glucose(sequence, forecast_horizon):
    """
    Forecast glucose for next N hours
    Returns: (predictions, timestamps, confidence, trend)
    """
    # Convert to numpy array
    sequence_arr = np.array(sequence)
    
    # Normalize
    mean = sequence_arr.mean(axis=0)
    std = sequence_arr.std(axis=0) + 1e-8
    sequence_normalized = (sequence_arr - mean) / std
    
    # Prepare input
    if len(sequence_normalized) < WINDOW_SIZE:
        # Pad if insufficient data
        padding = np.zeros((WINDOW_SIZE - len(sequence_normalized), FEATURES))
        sequence_normalized = np.vstack([padding, sequence_normalized])
    else:
        sequence_normalized = sequence_normalized[-WINDOW_SIZE:]
    
    # Reshape for LSTM: (batch, timesteps, features)
    X = sequence_normalized.reshape(1, WINDOW_SIZE, FEATURES)
    
    # Forecast
    predictions = []
    current_sequence = X.copy()
    
    # Forecast horizon in 5-min steps (e.g., 6 hours = 72 steps)
    steps = forecast_horizon * 12  # 12 five-minute intervals per hour
    
    for _ in range(steps):
        pred = model.predict(current_sequence, verbose=0)[0]
        predictions.append(pred[0])  # Glucose prediction
        
        # Update sequence with prediction (simple approach)
        # In production, use more sophisticated updating
        new_step = np.zeros((1, 1, FEATURES))
        new_step[0, 0, 0] = pred[0]
        current_sequence = np.concatenate([current_sequence[:, 1:, :], new_step], axis=1)
    
    # Denormalize predictions
    predictions_denorm = [p * std[0] + mean[0] for p in predictions]
    
    # Calculate confidence (based on prediction variance)
    confidence = calculate_confidence(predictions_denorm)
    
    # Determine trend
    trend = determine_trend(predictions_denorm)
    
    # Generate timestamps
    timestamps = generate_timestamps(forecast_horizon, steps)
    
    return predictions_denorm, timestamps, confidence, trend

def calculate_confidence(predictions):
    """Calculate confidence based on prediction stability"""
    variance = np.var(predictions)
    # Lower variance = higher confidence
    confidence = 1 / (1 + variance / 100)
    return min(0.95, max(0.5, confidence))

def determine_trend(predictions):
    """Determine if glucose is rising, falling, or stable"""
    start = np.mean(predictions[:6])
    end = np.mean(predictions[-6:])
    diff = end - start
    
    if diff > 20:
        return 'rising'
    elif diff < -20:
        return 'falling'
    else:
        return 'stable'

def generate_timestamps(hours, steps):
    """Generate future timestamps"""
    now = datetime.now()
    interval = timedelta(minutes=5)
    return [(now + interval * i).isoformat() for i in range(1, steps + 1)]
```

---

### 3. Insulin Dosage Advisor

**File**: `app/routers/insulin.py`

```python
from fastapi import APIRouter, HTTPException
from app.schemas.insulin_schema import InsulinInput, InsulinOutput
from app.models.insulin_advisor import calculate_dosage
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/predict/insulin-dosage", response_model=InsulinOutput)
async def predict(input_data: InsulinInput):
    try:
        suggestion = calculate_dosage(input_data)
        return suggestion
    except Exception as e:
        logger.error(f"Dosage calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Schema**: `app/schemas/insulin_schema.py`

```python
from pydantic import BaseModel, Field
from typing import List, Dict

class Meal(BaseModel):
    time: str
    carbs: float

class TreatmentPlan(BaseModel):
    basal_dose: float
    carb_ratio: float
    correction_factor: float
    insulin_type: str

class InsulinInput(BaseModel):
    current_glucose: float = Field(..., ge=20, le=600)
    target_glucose: float = Field(..., ge=70, le=180)
    recent_glucose_series: List[float]
    recent_insulin: List[float]
    recent_carbs: List[float]
    meals: List[Meal]
    activity: str
    treatment_plan: TreatmentPlan

class DosageSuggestion(BaseModel):
    type: str  # 'bolus', 'basal_adjustment', 'no_change'
    timing: str
    amount: float
    units: str
    reasoning: str

class InsulinOutput(BaseModel):
    suggestion: DosageSuggestion
    confidence: float
    reasoning: str
```

**Model**: `app/models/insulin_advisor.py`

```python
import numpy as np
from app.schemas.insulin_schema import InsulinInput, InsulinOutput, DosageSuggestion

def calculate_dosage(input_data: InsulinInput) -> InsulinOutput:
    """
    Calculate insulin dosage using carb counting and correction formula
    """
    current_bg = input_data.current_glucose
    target_bg = input_data.target_glucose
    carb_ratio = input_data.treatment_plan.carb_ratio
    correction_factor = input_data.treatment_plan.correction_factor
    
    # Calculate correction dose
    correction_dose = 0
    if current_bg > target_bg:
        correction_dose = (current_bg - target_bg) / correction_factor
    
    # Calculate carb coverage
    carb_dose = 0
    total_carbs = sum([meal.carbs for meal in input_data.meals])
    if total_carbs > 0:
        carb_dose = total_carbs / carb_ratio
    
    # Total bolus
    total_bolus = correction_dose + carb_dose
    
    # Activity adjustment
    if input_data.activity == 'high':
        total_bolus *= 0.8  # Reduce by 20% for high activity
    elif input_data.activity == 'low':
        total_bolus *= 1.1  # Increase by 10% for low activity
    
    # Check insulin on board (IOB) from recent_insulin
    recent_insulin_total = sum(input_data.recent_insulin[-6:])  # Last 30 min
    if recent_insulin_total > 0:
        total_bolus -= recent_insulin_total * 0.5  # Subtract 50% of recent insulin
    
    # Round to nearest 0.5 units
    total_bolus = round(total_bolus * 2) / 2
    total_bolus = max(0, total_bolus)  # No negative doses
    
    # Generate reasoning
    reasoning = generate_reasoning(
        current_bg, target_bg, correction_dose, carb_dose, 
        total_carbs, total_bolus, input_data.activity
    )
    
    # Determine suggestion type
    if total_bolus >= 1:
        suggestion_type = 'bolus'
        timing = 'now'
    elif current_bg > target_bg + 50:
        suggestion_type = 'bolus'
        timing = 'now'
        total_bolus = max(1, total_bolus)
    else:
        suggestion_type = 'no_change'
        timing = 'monitor'
    
    # Calculate confidence
    glucose_variance = np.var(input_data.recent_glucose_series[-12:])
    confidence = 1 / (1 + glucose_variance / 500)
    confidence = min(0.95, max(0.6, confidence))
    
    suggestion = DosageSuggestion(
        type=suggestion_type,
        timing=timing,
        amount=total_bolus,
        units='units',
        reasoning=reasoning
    )
    
    return InsulinOutput(
        suggestion=suggestion,
        confidence=confidence,
        reasoning=reasoning
    )

def generate_reasoning(current_bg, target_bg, correction_dose, carb_dose, 
                       total_carbs, total_bolus, activity):
    reasoning = []
    
    if current_bg > target_bg:
        reasoning.append(
            f"Current glucose ({current_bg} mg/dL) is above target ({target_bg} mg/dL). "
            f"Correction dose: {correction_dose:.1f} units."
        )
    
    if total_carbs > 0:
        reasoning.append(
            f"Carbohydrate coverage for {total_carbs}g carbs: {carb_dose:.1f} units."
        )
    
    if activity != 'moderate':
        reasoning.append(
            f"Dose adjusted for {activity} activity level."
        )
    
    reasoning.append(
        f"Recommended bolus: {total_bolus:.1f} units."
    )
    
    return " ".join(reasoning)
```

---

## Main App

**File**: `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import hypertension, glucose, insulin
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DailyMed ML Service",
    description="AI prediction service for health analytics",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(hypertension.router, tags=["Hypertension"])
app.include_router(glucose.router, tags=["Glucose"])
app.include_router(insulin.router, tags=["Insulin"])

@app.get("/")
async def root():
    return {
        "service": "DailyMed ML Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Docker Setup

**Dockerfile**:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY app/ ./app/
COPY models/ ./models/

# Expose port
EXPOSE 8000

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  ml-service:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
    environment:
      - MODEL_VERSION=1.0
    restart: unless-stopped
```

---

## Running the Service

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000
```

### Docker

```bash
# Build and run
docker-compose up --build

# Or
docker build -t dailymed-ml .
docker run -p 8000:8000 dailymed-ml
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Hypertension prediction
curl -X POST http://localhost:8000/predict/hypertension \
  -H "Content-Type: application/json" \
  -d '{
    "age": 45,
    "salt_intake": 3.5,
    "stress_score": 7,
    "sleep_duration": 6,
    "bmi": 28.5,
    "family_history": 1,
    "smoking_status": 1,
    "exercise_level": 2,
    "bp_history": 1,
    "systolic_bp": 145,
    "diastolic_bp": 92
  }'
```

---

## Model Training & Export

### Export SVM Model

```python
# From Jupyter notebook
import joblib
from sklearn.preprocessing import StandardScaler

# After training
joblib.dump(svm_model, 'models/hypertension_svm.pkl')
joblib.dump(scaler, 'models/scaler.pkl')
```

### Export LSTM Model

```python
# From Jupyter notebook
import tensorflow as tf

# After training
model.save('models/glucose_lstm.h5')
```

---

## Next Steps

1. ✅ Convert Jupyter notebooks to production code
2. ✅ Create FastAPI endpoints
3. ✅ Add request validation with Pydantic
4. ✅ Implement error handling
5. ⏳ Train and export models
6. ⏳ Test endpoints with sample data
7. ⏳ Deploy with Docker
8. ⏳ Integrate with Node.js backend
9. ⏳ Add model versioning
10. ⏳ Setup monitoring and logging

---

**Status**: Architecture ready, implementation pending model training
**Priority**: Critical path - blocks prediction and dosage endpoints
