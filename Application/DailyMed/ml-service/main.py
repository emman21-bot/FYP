"""
DailyMed ML Microservice - Main Application
Provides AI-powered health predictions for hypertension risk and blood glucose forecasting
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import uvicorn
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Import prediction modules
from services.hypertension_predictor import HypertensionPredictor
from services.glucose_insulin_predictor import GlucoseInsulinPredictor
from services.bp_predictor import BPPredictor
from services.database import DatabaseService

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="DailyMed ML Service",
    description="AI-powered health prediction microservice",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
db_service = DatabaseService()
hypertension_predictor = HypertensionPredictor()
glucose_insulin_predictor = GlucoseInsulinPredictor()
bp_predictor = BPPredictor()


# ===== REQUEST/RESPONSE MODELS =====

class HypertensionPredictionRequest(BaseModel):
    """Request body for hypertension prediction"""
    patient_email: str = Field(..., description="Patient email to fetch health data")
    age: Optional[int] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    family_history: Optional[bool] = None
    smoking_status: Optional[bool] = None
    salt_intake: Optional[float] = None
    stress_score: Optional[float] = None
    exercise_level: Optional[str] = None  # Low, Moderate, High


class GlucosePredictionRequest(BaseModel):
    """Request body for glucose prediction"""
    patient_email: str = Field(..., description="Patient email to fetch health data")
    current_glucose: Optional[float] = None
    carbohydrate_intake: Optional[float] = None
    insulin_dose: Optional[float] = None
    exercise_minutes: Optional[int] = None
    time_of_day: Optional[str] = None


class InsulinRecommendationRequest(BaseModel):
    """Request body for insulin dosage recommendation"""
    patient_email: str = Field(..., description="Patient email")
    current_insulin_dose: Optional[float] = None


class BPPredictionRequest(BaseModel):
    """Request body for BP prediction"""
    patient_email: str = Field(..., description="Patient email to fetch BP history")


class PredictionResponse(BaseModel):
    """Standard prediction response"""
    success: bool
    prediction: dict
    metadata: dict


# ===== API ENDPOINTS =====

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "DailyMed ML Service",
        "status": "running",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Detailed health check with model status"""
    return {
        "status": "healthy",
        "models": {
            "hypertension": hypertension_predictor.is_loaded(),
            "glucose_insulin": glucose_insulin_predictor.is_loaded()
        },
        "database": db_service.is_connected(),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/predict/hypertension", response_model=PredictionResponse)
async def predict_hypertension(request: HypertensionPredictionRequest):
    """
    Predict hypertension risk for a patient
    
    Uses XGBoost model trained on patient health metrics.
    Returns risk score (0-1), prediction class, and recommendation.
    """
    try:
        # Fetch patient data from database
        patient_data = db_service.get_patient_health_data(request.patient_email)
        
        if not patient_data:
            raise HTTPException(status_code=404, detail="Patient not found or no health data available")
        
        # Override with provided values if any
        features = {
            "age": request.age or patient_data.get("age", 30),
            "systolic_bp": request.systolic_bp or patient_data.get("latest_systolic", 120),
            "diastolic_bp": request.diastolic_bp or patient_data.get("latest_diastolic", 80),
            "family_history": request.family_history if request.family_history is not None else patient_data.get("family_history", 0),
            "smoking_status": request.smoking_status if request.smoking_status is not None else patient_data.get("smoking_status", 0),
            "salt_intake": request.salt_intake or patient_data.get("salt_intake", 5.0),
            "stress_score": request.stress_score or patient_data.get("stress_score", 5.0),
            "exercise_level": request.exercise_level or patient_data.get("exercise_level", "Moderate")
        }
        
        # Make prediction
        prediction_result = hypertension_predictor.predict(features)
        
        # Save to database
        db_service.save_model_run(
            patient_email=request.patient_email,
            model_name="hypertension_xgboost",
            prediction_type="hypertension_risk",
            input_features=features,
            output_prediction=prediction_result
        )
        
        return PredictionResponse(
            success=True,
            prediction=prediction_result,
            metadata={
                "model": "XGBoost Hypertension Classifier",
                "timestamp": datetime.utcnow().isoformat(),
                "patient_email": request.patient_email
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/glucose", response_model=PredictionResponse)
async def predict_glucose(request: GlucosePredictionRequest):
    """
    Predict blood glucose levels for next 30 minutes and 6 hours
    
    Uses LSTM model trained on OhioT1DM time-series data.
    Returns predicted values and trend analysis.
    """
    try:
        # Fetch patient health data from database
        health_data = db_service.get_patient_health_data_list(request.patient_email)
        
        if not health_data or len(health_data) < 3:
            raise HTTPException(
                status_code=404, 
                detail="Insufficient glucose data. Need at least 3 readings for prediction."
            )
        
        # Make prediction using new LSTM model
        prediction_result = glucose_insulin_predictor.predict_glucose(health_data)
        
        if not prediction_result.get("success"):
            raise HTTPException(
                status_code=400, 
                detail=prediction_result.get("error", "Prediction failed")
            )
        
        # Save to database
        db_service.save_model_run(
            patient_email=request.patient_email,
            model_name="glucose_lstm",
            prediction_type="glucose_forecast",
            input_features={"readings_count": len(health_data)},
            output_prediction=prediction_result
        )
        
        return PredictionResponse(
            success=True,
            prediction=prediction_result,
            metadata={
                "model": "LSTM Glucose Predictor (OhioT1DM)",
                "timestamp": datetime.utcnow().isoformat(),
                "patient_email": request.patient_email
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Prediction failed: {str(e)}\n{traceback.format_exc()}"
        print(f"ERROR in glucose endpoint: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)


@app.post("/predict/insulin-dosage", response_model=PredictionResponse)
async def recommend_insulin_dosage(request: InsulinRecommendationRequest):
    """
    Recommend insulin dosage adjustment based on predicted glucose levels
    
    Uses XGBoost model trained on OhioT1DM data for optimal insulin dose prediction.
    Returns INCREASE/DECREASE/MAINTAIN recommendation with predicted dose.
    """
    try:
        # Fetch patient health data from database
        health_data = db_service.get_patient_health_data_list(request.patient_email)
        
        if not health_data or len(health_data) < 3:
            raise HTTPException(
                status_code=404, 
                detail="Insufficient health data. Need at least 3 readings for insulin recommendation."
            )
        
        # Get current insulin dose from request or latest health data
        current_dose = request.current_insulin_dose
        if not current_dose:
            for entry in reversed(health_data):
                if entry.get("insulinDose"):
                    current_dose = entry["insulinDose"]
                    break
            if not current_dose:
                current_dose = 10.0  # Default if no insulin data
        
        print(f"💊 Insulin prediction: {len(health_data)} readings, current dose: {current_dose} units")
        
        # Make insulin prediction using new XGBoost model
        insulin_result = glucose_insulin_predictor.predict_insulin(health_data, current_dose)
        
        if not insulin_result.get("success"):
            raise HTTPException(
                status_code=400, 
                detail=insulin_result.get("error", "Insulin prediction failed")
            )
        
        # Save to database
        db_service.save_model_run(
            patient_email=request.patient_email,
            model_name="insulin_xgboost",
            prediction_type="insulin_recommendation",
            input_features={
                "readings_count": len(health_data),
                "current_dose": current_dose
            },
            output_prediction=insulin_result
        )
        
        return PredictionResponse(
            success=True,
            prediction=insulin_result,
            metadata={
                "model": "XGBoost Insulin Predictor (OhioT1DM)",
                "timestamp": datetime.utcnow().isoformat(),
                "patient_email": request.patient_email
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Recommendation failed: {str(e)}\n{traceback.format_exc()}"
        print(f"ERROR in insulin-dosage endpoint: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)


@app.post("/predict/blood-pressure", response_model=PredictionResponse)
async def predict_blood_pressure(request: BPPredictionRequest):
    """
    Predict future blood pressure values based on historical trends
    
    Uses statistical trend analysis (weighted moving average + linear regression)
    to forecast next BP reading. Accuracy: ~60-70% depending on data consistency.
    """
    try:
        # Get BP history from database
        health_data = db_service.get_patient_health_data(request.patient_email)
        
        if not health_data:
            raise HTTPException(
                status_code=404, 
                detail="No health data found for patient"
            )
        
        # Get BP readings from last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        bp_readings = list(db_service.db.healthdatas.find({
            "userEmail": request.patient_email,
            "bloodPressure": {"$exists": True},
            "createdAt": {"$gte": thirty_days_ago}
        }).sort("readingDate", -1).limit(30))
        
        if not bp_readings or len(bp_readings) < 3:
            raise HTTPException(
                status_code=404,
                detail="Insufficient BP data. Need at least 3 readings for prediction."
            )
        
        # Prepare BP history
        bp_history = []
        for reading in bp_readings:
            bp = reading.get("bloodPressure", {})
            if bp.get("systolic") and bp.get("diastolic"):
                bp_history.append({
                    "systolic": float(bp["systolic"]),
                    "diastolic": float(bp["diastolic"]),
                    "timestamp": reading.get("readingDate", reading.get("createdAt"))
                })
        
        # Get prediction
        bp_prediction = bp_predictor.predict(bp_history)
        
        if not bp_prediction["success"]:
            raise HTTPException(
                status_code=404,
                detail=bp_prediction["message"]
            )
        
        return PredictionResponse(
            success=True,
            prediction=bp_prediction,
            metadata={
                "model": "Statistical Trend Analyzer",
                "timestamp": datetime.utcnow().isoformat(),
                "patient_email": request.patient_email,
                "method": "weighted_moving_average_with_linear_regression",
                "accuracy_note": "~60-70% accuracy. For trend indication only."
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"BP prediction failed: {str(e)}\n{traceback.format_exc()}"
        print(f"ERROR in blood-pressure endpoint: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/models/status")
async def get_models_status():
    """Get status of all loaded ML models"""
    return {
        "hypertension_model": {
            "loaded": hypertension_predictor.is_loaded(),
            "type": "XGBoost Classifier",
            "file": "xgb_hypertension_dailyMed.pkl"
        },
        "glucose_model": {
            "loaded": glucose_insulin_predictor.is_loaded(),
            "type": "LSTM Neural Network (OhioT1DM)",
            "file": "glucose_lstm_model.h5"
        },
        "insulin_model": {
            "loaded": glucose_insulin_predictor.is_loaded(),
            "type": "XGBoost Regressor (OhioT1DM)",
            "file": "insulin_xgb_model.pkl"
        },
        "bp_predictor": {
            "loaded": bp_predictor.is_loaded(),
            "type": "Statistical Trend Analyzer",
            "accuracy": "~60-70%"
        }
    }


# ===== STARTUP/SHUTDOWN EVENTS =====

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 Starting DailyMed ML Service...")
    
    # Connect to database
    db_service.connect()
    print("✅ Database connected")
    
    # Load ML models
    hypertension_predictor.load_model()
    print("✅ Hypertension model loaded")
    
    # Glucose/Insulin models load automatically in GlucoseInsulinPredictor constructor
    if glucose_insulin_predictor.is_loaded():
        print("✅ Glucose LSTM + Insulin XGBoost models loaded")
    else:
        print("⚠️ Glucose/Insulin models not loaded - predictions will fail")
    
    print("🎉 ML Service ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    db_service.disconnect()
    print("👋 ML Service stopped")


if __name__ == "__main__":
    port = int(os.getenv("ML_SERVICE_PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
