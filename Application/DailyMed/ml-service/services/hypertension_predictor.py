"""
Hypertension Risk Prediction Service
Uses XGBoost classifier trained on patient health metrics
"""

import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any
import os


class HypertensionPredictor:
    """Hypertension risk prediction using XGBoost model"""
    
    def __init__(self):
        self.model = None
        self.feature_columns = None
        self.model_path = "models/xgb_hypertension_dailyMed.pkl"
        
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None
    
    def load_model(self):
        """Load the trained XGBoost model"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"❌ Model file not found: {self.model_path}")
        
        try:
            self.model = joblib.load(self.model_path)
            # Get feature names from model
            if hasattr(self.model, 'feature_names_in_'):
                self.feature_columns = self.model.feature_names_in_
            else:
                # Fallback to expected features
                self.feature_columns = self._get_default_features()
            print(f"✅ Hypertension model loaded from {self.model_path}")
        except Exception as e:
            raise Exception(f"❌ Error loading model: {e}")
    
    def _get_default_features(self) -> list:
        """Default feature columns expected by the model"""
        return [
            'Age', 'Salt_Intake', 'Stress_Score', 'Systolic_BP', 'Diastolic_BP',
            'Family_History', 'Smoking_Status',
            'BP_History_Normal', 'BP_History_Prehypertension',
            'Exercise_Level_Low', 'Exercise_Level_Moderate'
        ]
    
    def _preprocess_features(self, features: Dict[str, Any]) -> pd.DataFrame:
        """
        Preprocess input features to match model training format
        
        Args:
            features: Dictionary with patient health metrics
            
        Returns:
            Preprocessed DataFrame ready for model input
        """
        # Create base dataframe
        data = {
            'Age': features.get('age', 30),
            'Salt_Intake': features.get('salt_intake', 5.0),
            'Stress_Score': features.get('stress_score', 5.0),
            'Systolic_BP': features.get('systolic_bp', 120),
            'Diastolic_BP': features.get('diastolic_bp', 80),
            'Family_History': int(features.get('family_history', False)),
            'Smoking_Status': int(features.get('smoking_status', False))
        }
        
        # One-hot encode exercise level
        exercise_level = features.get('exercise_level', 'Moderate')
        data['Exercise_Level_Low'] = 1 if exercise_level == 'Low' else 0
        data['Exercise_Level_Moderate'] = 1 if exercise_level == 'Moderate' else 0
        # High is reference category (both 0)
        
        # One-hot encode BP history (derived from current BP)
        systolic = data['Systolic_BP']
        if systolic >= 140:
            bp_history = 'Hypertension'
        elif systolic >= 130:
            bp_history = 'Prehypertension'
        else:
            bp_history = 'Normal'
        
        data['BP_History_Normal'] = 1 if bp_history == 'Normal' else 0
        data['BP_History_Prehypertension'] = 1 if bp_history == 'Prehypertension' else 0
        # Hypertension is reference category
        
        # Create DataFrame
        df = pd.DataFrame([data])
        
        # Ensure all expected columns exist
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0
        
        # Reorder columns to match training
        df = df[self.feature_columns]
        
        return df
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make hypertension risk prediction
        
        Args:
            features: Patient health metrics
            
        Returns:
            Dictionary with prediction, risk score, and recommendation
        """
        if not self.is_loaded():
            raise Exception("Model not loaded. Call load_model() first.")
        
        # Preprocess features
        X = self._preprocess_features(features)
        
        try:
            # Predict class (0 = No Hypertension, 1 = Hypertension)
            prediction = self.model.predict(X)[0]
            
            # Get probability/confidence score
            if hasattr(self.model, 'predict_proba'):
                proba = self.model.predict_proba(X)[0]
                risk_score = float(proba[1])  # Probability of class 1
            else:
                # Use decision function as proxy
                risk_score = float(prediction)
            
            # Generate recommendation
            action, explanation = self._generate_recommendation(prediction, risk_score)
            
            return {
                "has_hypertension_risk": bool(prediction),
                "risk_score": round(risk_score, 4),
                "risk_level": self._get_risk_level(risk_score),
                "recommendation": action,
                "explanation": explanation,
                "input_features": features
            }
            
        except Exception as e:
            raise Exception(f"Prediction error: {str(e)}")
    
    def _generate_recommendation(self, prediction: int, risk_score: float) -> tuple:
        """Generate action recommendation and explanation"""
        if prediction == 1:
            if risk_score >= 0.8:
                action = "URGENT_CONSULTATION"
                explanation = f"High hypertension risk detected ({risk_score:.2%} confidence). Immediate medical consultation recommended."
            else:
                action = "CONSULT_DOCTOR"
                explanation = f"Moderate hypertension risk ({risk_score:.2%} confidence). Schedule doctor appointment for evaluation."
        else:
            if risk_score < 0.2:
                action = "MAINTAIN"
                explanation = f"Low hypertension risk ({1-risk_score:.2%} confidence). Continue healthy lifestyle habits."
            else:
                action = "MONITOR"
                explanation = f"Borderline risk level. Monitor blood pressure regularly and maintain healthy habits."
        
        return action, explanation
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Categorize risk level"""
        if risk_score >= 0.7:
            return "HIGH"
        elif risk_score >= 0.4:
            return "MODERATE"
        else:
            return "LOW"
