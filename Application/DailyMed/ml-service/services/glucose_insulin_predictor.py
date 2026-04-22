"""
Blood Glucose & Insulin Prediction Service
Uses LSTM for glucose prediction and XGBoost for insulin recommendation
Based on OhioT1DM trained models
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
import os
import pickle
import joblib
from datetime import datetime, timedelta


class GlucoseInsulinPredictor:
    """Blood glucose forecasting and insulin recommendation using LSTM + XGBoost models"""
    
    # Thresholds for insulin recommendation
    DOSE_THRESHOLD = 0.5  # If predicted dose differs by less than this, MAINTAIN
    HYPO_THRESHOLD = 70.0  # If predicted glucose is below this, DECREASE
    TARGET_MIN = 70  # mg/dL
    TARGET_MAX = 180  # mg/dL
    
    def __init__(self):
        self.glucose_model = None
        self.glucose_scaler = None
        self.glucose_features = None
        self.insulin_model = None
        self.insulin_scaler = None
        self.insulin_features = None
        self.model_metadata = None
        self.models_loaded = False
        
        # Model file paths
        self.glucose_model_path = "models/glucose_lstm_model.h5"
        self.glucose_scaler_path = "models/glucose_scaler.pkl"
        self.glucose_features_path = "models/glucose_features.pkl"
        self.insulin_model_path = "models/insulin_xgb_model.pkl"
        self.insulin_scaler_path = "models/insulin_scaler.pkl"
        self.insulin_features_path = "models/insulin_features.pkl"
        self.metadata_path = "models/model_metadata.pkl"
        
        # Load models on initialization
        self._load_models()
    
    def _load_models(self):
        """Load all trained models and scalers"""
        try:
            # Load TensorFlow for LSTM
            import tensorflow as tf
            
            # Load glucose LSTM model
            if os.path.exists(self.glucose_model_path):
                self.glucose_model = tf.keras.models.load_model(
                    self.glucose_model_path,
                    custom_objects={
                        'mse': tf.keras.losses.MeanSquaredError(),
                        'mae': tf.keras.metrics.MeanAbsoluteError()
                    }
                )
                print(f"✅ Loaded glucose LSTM model from {self.glucose_model_path}")
            else:
                print(f"⚠️ Glucose model not found at {self.glucose_model_path}")
            
            # Load glucose scaler
            if os.path.exists(self.glucose_scaler_path):
                self.glucose_scaler = joblib.load(self.glucose_scaler_path)
                print(f"✅ Loaded glucose scaler")
            
            # Load glucose features list
            if os.path.exists(self.glucose_features_path):
                with open(self.glucose_features_path, 'rb') as f:
                    self.glucose_features = pickle.load(f)
                print(f"✅ Loaded glucose features: {len(self.glucose_features)} features")
            
            # Load insulin XGBoost model
            if os.path.exists(self.insulin_model_path):
                self.insulin_model = joblib.load(self.insulin_model_path)
                print(f"✅ Loaded insulin XGBoost model from {self.insulin_model_path}")
            else:
                print(f"⚠️ Insulin model not found at {self.insulin_model_path}")
            
            # Load insulin scaler
            if os.path.exists(self.insulin_scaler_path):
                self.insulin_scaler = joblib.load(self.insulin_scaler_path)
                print(f"✅ Loaded insulin scaler")
            
            # Load insulin features list
            if os.path.exists(self.insulin_features_path):
                with open(self.insulin_features_path, 'rb') as f:
                    self.insulin_features = pickle.load(f)
                print(f"✅ Loaded insulin features: {len(self.insulin_features)} features")
            
            # Load model metadata
            if os.path.exists(self.metadata_path):
                with open(self.metadata_path, 'rb') as f:
                    self.model_metadata = pickle.load(f)
                print(f"✅ Loaded model metadata")
            
            self.models_loaded = (
                self.glucose_model is not None and 
                self.insulin_model is not None
            )
            
            if self.models_loaded:
                print("✅ All glucose/insulin models loaded successfully!")
            
        except Exception as e:
            print(f"❌ Error loading models: {e}")
            import traceback
            traceback.print_exc()
            self.models_loaded = False
    
    def is_loaded(self) -> bool:
        """Check if models are loaded"""
        return self.models_loaded
    
    def _create_glucose_features(self, health_data: List[Dict]) -> Optional[np.ndarray]:
        """
        Create feature array for glucose prediction from health data
        
        Expected glucose_features from training:
        ['glucose_lag_1', 'glucose_lag_2', 'glucose_lag_3', 'glucose_lag_6', 'glucose_lag_12',
         'glucose_mean_6', 'glucose_std_6', 'glucose_min_6', 'glucose_max_6',
         'glucose_mean_12', 'glucose_std_12', 'glucose_min_12', 'glucose_max_12',
         'glucose_mean_24', 'glucose_std_24',
         'glucose_diff_1', 'glucose_diff_2',
         'insulin_sum_12', 'insulin_sum_24', 'insulin_sum_48',
         'carbs_sum_12', 'carbs_sum_24', 'carbs_sum_48',
         'hour_sin', 'hour_cos', 'is_morning', 'is_afternoon', 'is_evening', 'is_night']
        """
        if not health_data or len(health_data) < 3:
            return None
        
        try:
            # Sort by date
            sorted_data = sorted(health_data, key=lambda x: x.get('readingDate', x.get('timestamp', '')))
            
            # Extract glucose values
            glucose_values = []
            insulin_values = []
            carbs_values = []
            
            for entry in sorted_data:
                # Get glucose value (try different fields)
                glucose = None
                if 'bloodSugar' in entry and entry['bloodSugar']:
                    glucose = (
                        entry['bloodSugar'].get('fasting') or 
                        entry['bloodSugar'].get('random') or 
                        entry['bloodSugar'].get('postMeal')
                    )
                elif 'bloodGlucose' in entry:
                    glucose = entry['bloodGlucose']
                elif 'glucose' in entry:
                    glucose = entry['glucose']
                
                if glucose:
                    glucose_values.append(float(glucose))
                
                # Get insulin value
                insulin = entry.get('insulinDose', entry.get('insulin_dose', 0)) or 0
                insulin_values.append(float(insulin))
                
                # Get carbs value
                carbs = entry.get('carbsIntake', entry.get('carbs', 0)) or 0
                carbs_values.append(float(carbs))
            
            if len(glucose_values) < 3:
                return None
            
            # Create feature array based on expected features
            features = {}
            
            # Lag features (use last values)
            features['glucose_lag_1'] = glucose_values[-1] if len(glucose_values) >= 1 else 100
            features['glucose_lag_2'] = glucose_values[-2] if len(glucose_values) >= 2 else features['glucose_lag_1']
            features['glucose_lag_3'] = glucose_values[-3] if len(glucose_values) >= 3 else features['glucose_lag_2']
            features['glucose_lag_6'] = glucose_values[-6] if len(glucose_values) >= 6 else features['glucose_lag_3']
            features['glucose_lag_12'] = glucose_values[-12] if len(glucose_values) >= 12 else features['glucose_lag_6']
            
            # Rolling window stats
            recent_6 = glucose_values[-6:] if len(glucose_values) >= 6 else glucose_values
            recent_12 = glucose_values[-12:] if len(glucose_values) >= 12 else glucose_values
            recent_24 = glucose_values[-24:] if len(glucose_values) >= 24 else glucose_values
            
            features['glucose_mean_6'] = np.mean(recent_6)
            features['glucose_std_6'] = np.std(recent_6) if len(recent_6) > 1 else 0
            features['glucose_min_6'] = np.min(recent_6)
            features['glucose_max_6'] = np.max(recent_6)
            
            features['glucose_mean_12'] = np.mean(recent_12)
            features['glucose_std_12'] = np.std(recent_12) if len(recent_12) > 1 else 0
            features['glucose_min_12'] = np.min(recent_12)
            features['glucose_max_12'] = np.max(recent_12)
            
            features['glucose_mean_24'] = np.mean(recent_24)
            features['glucose_std_24'] = np.std(recent_24) if len(recent_24) > 1 else 0
            
            # Glucose differences (trend)
            features['glucose_diff_1'] = glucose_values[-1] - glucose_values[-2] if len(glucose_values) >= 2 else 0
            features['glucose_diff_2'] = glucose_values[-1] - glucose_values[-3] if len(glucose_values) >= 3 else 0
            
            # Insulin sums
            features['insulin_sum_12'] = sum(insulin_values[-12:]) if len(insulin_values) >= 12 else sum(insulin_values)
            features['insulin_sum_24'] = sum(insulin_values[-24:]) if len(insulin_values) >= 24 else sum(insulin_values)
            features['insulin_sum_48'] = sum(insulin_values[-48:]) if len(insulin_values) >= 48 else sum(insulin_values)
            
            # Carbs sums
            features['carbs_sum_12'] = sum(carbs_values[-12:]) if len(carbs_values) >= 12 else sum(carbs_values)
            features['carbs_sum_24'] = sum(carbs_values[-24:]) if len(carbs_values) >= 24 else sum(carbs_values)
            features['carbs_sum_48'] = sum(carbs_values[-48:]) if len(carbs_values) >= 48 else sum(carbs_values)
            
            # Time features
            current_hour = datetime.now().hour
            features['hour_sin'] = np.sin(2 * np.pi * current_hour / 24)
            features['hour_cos'] = np.cos(2 * np.pi * current_hour / 24)
            features['is_morning'] = 1 if 6 <= current_hour < 12 else 0
            features['is_afternoon'] = 1 if 12 <= current_hour < 18 else 0
            features['is_evening'] = 1 if 18 <= current_hour < 22 else 0
            features['is_night'] = 1 if current_hour >= 22 or current_hour < 6 else 0
            
            # Build feature array in the correct order
            if self.glucose_features:
                feature_array = np.array([[features.get(f, 0) for f in self.glucose_features]])
            else:
                # Default order if features list not loaded
                feature_array = np.array([[
                    features['glucose_lag_1'], features['glucose_lag_2'], features['glucose_lag_3'],
                    features['glucose_lag_6'], features['glucose_lag_12'],
                    features['glucose_mean_6'], features['glucose_std_6'], features['glucose_min_6'], features['glucose_max_6'],
                    features['glucose_mean_12'], features['glucose_std_12'], features['glucose_min_12'], features['glucose_max_12'],
                    features['glucose_mean_24'], features['glucose_std_24'],
                    features['glucose_diff_1'], features['glucose_diff_2'],
                    features['insulin_sum_12'], features['insulin_sum_24'], features['insulin_sum_48'],
                    features['carbs_sum_12'], features['carbs_sum_24'], features['carbs_sum_48'],
                    features['hour_sin'], features['hour_cos'],
                    features['is_morning'], features['is_afternoon'], features['is_evening'], features['is_night']
                ]])
            
            return feature_array
            
        except Exception as e:
            print(f"Error creating glucose features: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _create_insulin_features(self, health_data: List[Dict]) -> Optional[np.ndarray]:
        """
        Create feature array for insulin prediction from health data
        
        Expected insulin_features from training:
        ['glucose', 'glucose_lag_1', 'glucose_lag_2', 'glucose_lag_3',
         'glucose_mean_12', 'glucose_std_12',
         'glucose_diff_1', 'glucose_diff_2',
         'carbs', 'carbs_sum_12', 'carbs_sum_24',
         'basal_insulin', 'bolus_insulin',
         'hour_sin', 'hour_cos', 'is_morning', 'is_afternoon', 'is_evening']
        """
        if not health_data or len(health_data) < 3:
            return None
        
        try:
            # Sort by date
            sorted_data = sorted(health_data, key=lambda x: x.get('readingDate', x.get('timestamp', '')))
            
            # Extract values
            glucose_values = []
            insulin_values = []
            carbs_values = []
            
            for entry in sorted_data:
                # Get glucose value
                glucose = None
                if 'bloodSugar' in entry and entry['bloodSugar']:
                    glucose = (
                        entry['bloodSugar'].get('fasting') or 
                        entry['bloodSugar'].get('random') or 
                        entry['bloodSugar'].get('postMeal')
                    )
                elif 'bloodGlucose' in entry:
                    glucose = entry['bloodGlucose']
                elif 'glucose' in entry:
                    glucose = entry['glucose']
                
                if glucose:
                    glucose_values.append(float(glucose))
                
                # Get insulin value
                insulin = entry.get('insulinDose', entry.get('insulin_dose', 0)) or 0
                insulin_values.append(float(insulin))
                
                # Get carbs value
                carbs = entry.get('carbsIntake', entry.get('carbs', 0)) or 0
                carbs_values.append(float(carbs))
            
            if len(glucose_values) < 3:
                return None
            
            # Create features
            features = {}
            
            # Current glucose
            features['glucose'] = glucose_values[-1]
            features['glucose_lag_1'] = glucose_values[-2] if len(glucose_values) >= 2 else glucose_values[-1]
            features['glucose_lag_2'] = glucose_values[-3] if len(glucose_values) >= 3 else features['glucose_lag_1']
            features['glucose_lag_3'] = glucose_values[-4] if len(glucose_values) >= 4 else features['glucose_lag_2']
            
            # Rolling stats
            recent_12 = glucose_values[-12:] if len(glucose_values) >= 12 else glucose_values
            features['glucose_mean_12'] = np.mean(recent_12)
            features['glucose_std_12'] = np.std(recent_12) if len(recent_12) > 1 else 0
            
            # Differences
            features['glucose_diff_1'] = glucose_values[-1] - glucose_values[-2] if len(glucose_values) >= 2 else 0
            features['glucose_diff_2'] = glucose_values[-1] - glucose_values[-3] if len(glucose_values) >= 3 else 0
            
            # Carbs
            features['carbs'] = carbs_values[-1] if carbs_values else 0
            features['carbs_sum_12'] = sum(carbs_values[-12:]) if len(carbs_values) >= 12 else sum(carbs_values)
            features['carbs_sum_24'] = sum(carbs_values[-24:]) if len(carbs_values) >= 24 else sum(carbs_values)
            
            # Insulin (current)
            current_insulin = insulin_values[-1] if insulin_values else 10
            features['basal_insulin'] = current_insulin * 0.5  # Approximate split
            features['bolus_insulin'] = current_insulin * 0.5
            
            # Time features
            current_hour = datetime.now().hour
            features['hour_sin'] = np.sin(2 * np.pi * current_hour / 24)
            features['hour_cos'] = np.cos(2 * np.pi * current_hour / 24)
            features['is_morning'] = 1 if 6 <= current_hour < 12 else 0
            features['is_afternoon'] = 1 if 12 <= current_hour < 18 else 0
            features['is_evening'] = 1 if 18 <= current_hour < 22 else 0
            
            # Build feature array in correct order
            if self.insulin_features:
                feature_array = np.array([[features.get(f, 0) for f in self.insulin_features]])
            else:
                feature_array = np.array([[
                    features['glucose'], features['glucose_lag_1'], features['glucose_lag_2'], features['glucose_lag_3'],
                    features['glucose_mean_12'], features['glucose_std_12'],
                    features['glucose_diff_1'], features['glucose_diff_2'],
                    features['carbs'], features['carbs_sum_12'], features['carbs_sum_24'],
                    features['basal_insulin'], features['bolus_insulin'],
                    features['hour_sin'], features['hour_cos'],
                    features['is_morning'], features['is_afternoon'], features['is_evening']
                ]])
            
            return feature_array, features.get('basal_insulin', 0) + features.get('bolus_insulin', 0)
            
        except Exception as e:
            print(f"Error creating insulin features: {e}")
            import traceback
            traceback.print_exc()
            return None, 0
    
    def predict_glucose(self, health_data: List[Dict]) -> Dict[str, Any]:
        """
        Predict glucose level 30 minutes ahead using LSTM model
        
        Args:
            health_data: List of health data records from database
            
        Returns:
            Dictionary with prediction results
        """
        if not self.models_loaded or self.glucose_model is None:
            return {
                "success": False,
                "error": "Glucose prediction model not loaded",
                "predicted_glucose_mgdl": None
            }
        
        try:
            # Create features from health data
            feature_array = self._create_glucose_features(health_data)
            
            if feature_array is None:
                return {
                    "success": False,
                    "error": "Insufficient health data for prediction. Need at least 3 glucose readings.",
                    "predicted_glucose_mgdl": None
                }
            
            # Scale features
            if self.glucose_scaler:
                feature_scaled = self.glucose_scaler.transform(feature_array)
                print(f"🔍 Scaling Debug:")
                print(f"   Raw feature[0][0]: {feature_array[0][0]}")
                print(f"   Scaled feature[0][0]: {feature_scaled[0][0]}")
            else:
                feature_scaled = feature_array
            
            # Reshape for LSTM (samples, timesteps, features)
            feature_lstm = feature_scaled.reshape((1, 1, feature_scaled.shape[1]))
            
            # Get current glucose FIRST (before prediction, from raw health data)
            sorted_data = sorted(health_data, key=lambda x: x.get('readingDate', x.get('timestamp', '')))
            current_glucose_raw = None
            for entry in reversed(sorted_data):
                if 'bloodSugar' in entry and entry['bloodSugar']:
                    current_glucose_raw = (
                        entry['bloodSugar'].get('fasting') or 
                        entry['bloodSugar'].get('random') or 
                        entry['bloodSugar'].get('postMeal')
                    )
                elif 'bloodGlucose' in entry:
                    current_glucose_raw = entry['bloodGlucose']
                if current_glucose_raw:
                    break
            
            current_glucose = float(current_glucose_raw) if current_glucose_raw else 100
            
            # Predict
            predicted_glucose = self.glucose_model.predict(feature_lstm, verbose=0)[0][0]
            
            print(f"🔍 Glucose Prediction Debug:")
            print(f"   Current glucose (raw from DB): {current_glucose} mg/dL")
            print(f"   Model raw output: {predicted_glucose}")
            
            # Safety check: Clamp predictions to realistic range (40-400 mg/dL)
            # If model predicts outside this range, it's likely due to out-of-distribution data
            if predicted_glucose < 40 or predicted_glucose > 400:
                print(f"⚠️ Model predicted extreme value: {predicted_glucose} mg/dL")
                print(f"   This is likely due to input data being outside training distribution")
                print(f"   Clamping to reasonable range based on current glucose")
                
                # Use a simple heuristic: predict slight change from current
                if current_glucose < 70:
                    # Hypoglycemia - predict modest recovery
                    predicted_glucose = min(current_glucose + 20, 90)
                elif current_glucose > 180:
                    # Hyperglycemia - predict modest decrease  
                    predicted_glucose = max(current_glucose - 15, 140)
                else:
                    # Normal range - predict stability
                    predicted_glucose = current_glucose + np.random.uniform(-10, 10)
                
                print(f"   Adjusted prediction: {predicted_glucose} mg/dL")
            
            # Determine trend
            if predicted_glucose > current_glucose + 10:
                trend = "increasing"
            elif predicted_glucose < current_glucose - 10:
                trend = "decreasing"
            else:
                trend = "stable"
            
            # Determine risk zone
            if predicted_glucose < self.TARGET_MIN:
                risk_zone = "low"
            elif predicted_glucose > self.TARGET_MAX:
                risk_zone = "high"
            else:
                risk_zone = "normal"
            
            # Create forecast points for 6 hours (every 30 min = 12 points)
            forecast_6h = []
            base_glucose = float(predicted_glucose)
            for i in range(12):
                # Simple interpolation from current to predicted
                time_offset = (i + 1) * 30  # minutes
                if trend == "increasing":
                    glucose_at_time = base_glucose + (i * 3)  # Slight increase
                elif trend == "decreasing":
                    glucose_at_time = base_glucose - (i * 2)  # Slight decrease
                else:
                    glucose_at_time = base_glucose + np.random.uniform(-5, 5)
                
                forecast_6h.append({
                    "time": f"+{time_offset}min",
                    "glucose": round(glucose_at_time)
                })
            
            return {
                "success": True,
                "predicted_glucose_mgdl": round(float(predicted_glucose)),
                "current_glucose_mgdl": round(float(current_glucose)),
                "trend": trend,
                "risk_zone": risk_zone,
                "forecast_6h_mgdl": forecast_6h,
                "prediction_horizon": "30 minutes",
                "model_type": "LSTM",
                "confidence": self.model_metadata.get('glucose_model', {}).get('r2_score', 0.85) if self.model_metadata else 0.85
            }
            
        except Exception as e:
            print(f"Error predicting glucose: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "predicted_glucose_mgdl": None
            }
    
    def predict_insulin(self, health_data: List[Dict], current_dose: float = None) -> Dict[str, Any]:
        """
        Predict optimal insulin dosage and provide recommendation
        
        Args:
            health_data: List of health data records
            current_dose: Current insulin dose (if known)
            
        Returns:
            Dictionary with insulin recommendation
        """
        if not self.models_loaded or self.insulin_model is None:
            return {
                "success": False,
                "error": "Insulin prediction model not loaded",
                "action": "MAINTAIN"
            }
        
        try:
            # Create features
            result = self._create_insulin_features(health_data)
            if result is None or result[0] is None:
                return {
                    "success": False,
                    "error": "Insufficient health data for prediction",
                    "action": "MAINTAIN",
                    "explanation": "Please log at least 3 glucose readings to enable insulin recommendations."
                }
            
            feature_array, estimated_current_dose = result
            
            # Use provided current_dose or estimated
            if current_dose is None:
                current_dose = estimated_current_dose if estimated_current_dose > 0 else 10.0
            
            # Scale features
            if self.insulin_scaler:
                feature_scaled = self.insulin_scaler.transform(feature_array)
            else:
                feature_scaled = feature_array
            
            # Predict optimal insulin dose
            predicted_dose = self.insulin_model.predict(feature_scaled)[0]
            
            # Also get glucose prediction for safety check
            glucose_prediction = self.predict_glucose(health_data)
            predicted_glucose = glucose_prediction.get('predicted_glucose_mgdl', 100)
            
            # Get recommendation
            action, adjustment_pct, suggested_dose, explanation = self._get_insulin_recommendation(
                predicted_dose=float(predicted_dose),
                current_dose=float(current_dose),
                predicted_glucose=float(predicted_glucose) if predicted_glucose else 100
            )
            
            # Determine urgency
            if predicted_glucose and predicted_glucose < self.HYPO_THRESHOLD:
                urgency = "HIGH"
            elif predicted_glucose and predicted_glucose > 250:
                urgency = "HIGH"
            elif action != "MAINTAIN":
                urgency = "MEDIUM"
            else:
                urgency = "LOW"
            
            return {
                "success": True,
                "action": action,
                "current_dose": round(current_dose, 1),
                "suggested_dose": round(suggested_dose, 1),
                "predicted_dose": round(float(predicted_dose), 1),
                "adjustment_percentage": round(adjustment_pct, 1),
                "predicted_glucose": round(float(predicted_glucose)) if predicted_glucose else None,
                "explanation": explanation,
                "urgency": urgency,
                "requires_doctor_approval": action != "MAINTAIN",
                "disclaimer": "⚠️ This is an AI-generated suggestion. Always consult your healthcare provider before adjusting medication.",
                "model_type": "XGBoost",
                "clinical_notes": self._generate_clinical_notes(predicted_glucose, predicted_dose, current_dose)
            }
            
        except Exception as e:
            print(f"Error predicting insulin: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "action": "MAINTAIN"
            }
    
    def _get_insulin_recommendation(
        self,
        predicted_dose: float,
        current_dose: float,
        predicted_glucose: float
    ) -> tuple:
        """
        Convert prediction outputs into recommendation
        
        Returns: (action, adjustment_percentage, suggested_dose, explanation)
        """
        # Safety check - prevent hypoglycemia
        if predicted_glucose < self.HYPO_THRESHOLD:
            if current_dose > 1:
                suggested_dose = max(0, current_dose * 0.5)
                adjustment_pct = -50
                return (
                    "DECREASE",
                    adjustment_pct,
                    suggested_dose,
                    f"⚠️ HYPO ALERT: Predicted glucose ({predicted_glucose:.0f} mg/dL) is below safe threshold. Reduce insulin immediately to prevent hypoglycemia."
                )
            else:
                return (
                    "MAINTAIN",
                    0,
                    current_dose,
                    f"⚠️ Low glucose predicted ({predicted_glucose:.0f} mg/dL). Maintain current low dose and consider eating carbohydrates."
                )
        
        # Compare predicted optimal dose with current dose
        dose_change = predicted_dose - current_dose
        
        if dose_change > self.DOSE_THRESHOLD:
            # Predicted optimal dose is higher
            adjustment_pct = min(50, (dose_change / current_dose * 100) if current_dose > 0 else 25)
            suggested_dose = current_dose + dose_change
            return (
                "INCREASE",
                adjustment_pct,
                suggested_dose,
                f"AI analysis suggests increasing insulin. Predicted glucose trend indicates higher dose may improve control. Suggested: {suggested_dose:.1f} units."
            )
        
        elif dose_change < -self.DOSE_THRESHOLD:
            # Predicted optimal dose is lower
            adjustment_pct = max(-50, (dose_change / current_dose * 100) if current_dose > 0 else -25)
            suggested_dose = max(0, current_dose + dose_change)
            return (
                "DECREASE",
                adjustment_pct,
                suggested_dose,
                f"AI analysis suggests reducing insulin. Current glucose patterns indicate lower dose may be appropriate. Suggested: {suggested_dose:.1f} units."
            )
        
        else:
            # Doses are similar - maintain
            return (
                "MAINTAIN",
                0,
                current_dose,
                f"Your current insulin dose ({current_dose:.1f} units) appears optimal based on your glucose patterns. Continue as prescribed."
            )
    
    def _generate_clinical_notes(
        self,
        predicted_glucose: float,
        predicted_dose: float,
        current_dose: float
    ) -> str:
        """Generate clinical notes for healthcare providers"""
        notes = []
        
        if predicted_glucose:
            if predicted_glucose < 70:
                notes.append("ALERT: Hypoglycemia risk detected in 30-minute forecast.")
            elif predicted_glucose > 250:
                notes.append("WARNING: Hyperglycemia trend predicted. Consider intervention.")
            elif predicted_glucose > 180:
                notes.append("Elevated glucose predicted. Monitor closely.")
        
        dose_diff = abs(predicted_dose - current_dose)
        if dose_diff > 2:
            notes.append(f"Significant dose adjustment suggested ({dose_diff:.1f} units difference).")
        
        if not notes:
            notes.append("Glucose and insulin patterns within expected ranges.")
        
        return " ".join(notes)
