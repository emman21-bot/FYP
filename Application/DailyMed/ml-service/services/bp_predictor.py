"""
Blood Pressure Prediction Service
Statistical trend-based predictor for future BP values
"""

from typing import Dict, Any, List
import numpy as np
from datetime import datetime, timedelta


class BPPredictor:
    """Blood pressure forecasting using statistical trends"""
    
    def __init__(self):
        self.loaded = True
    
    def is_loaded(self) -> bool:
        """Check if predictor is ready"""
        return self.loaded
    
    def predict(self, bp_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Predict future BP values based on historical trends
        
        Args:
            bp_history: List of BP readings with systolic, diastolic, and timestamp
            
        Returns:
            Dictionary with predicted BP and trend analysis
        """
        if not bp_history or len(bp_history) < 3:
            return {
                "success": False,
                "message": "Insufficient BP data. Need at least 3 readings.",
                "predicted_systolic": None,
                "predicted_diastolic": None
            }
        
        # Extract values
        systolic_values = [reading['systolic'] for reading in bp_history]
        diastolic_values = [reading['diastolic'] for reading in bp_history]
        
        # Calculate trends using linear regression
        systolic_pred = self._predict_value(systolic_values)
        diastolic_pred = self._predict_value(diastolic_values)
        
        # Calculate confidence based on data consistency
        confidence = self._calculate_confidence(systolic_values, diastolic_values)
        
        # Analyze trend direction
        systolic_trend = self._analyze_trend(systolic_values)
        diastolic_trend = self._analyze_trend(diastolic_values)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(
            systolic_pred, 
            diastolic_pred,
            systolic_trend,
            diastolic_trend
        )
        
        # Risk assessment
        risk_level = self._assess_risk(systolic_pred, diastolic_pred)
        
        return {
            "success": True,
            "predicted_systolic": round(systolic_pred, 1),
            "predicted_diastolic": round(diastolic_pred, 1),
            "systolic_trend": systolic_trend,
            "diastolic_trend": diastolic_trend,
            "confidence": round(confidence, 2),
            "risk_level": risk_level,
            "recommendation": recommendation,
            "method": "statistical_trend_analysis",
            "data_points": len(bp_history)
        }
    
    def _predict_value(self, values: List[float]) -> float:
        """
        Predict next value using weighted moving average with trend adjustment
        
        Args:
            values: Historical values
            
        Returns:
            Predicted next value
        """
        n = len(values)
        
        # Weighted moving average (recent values weighted more)
        weights = np.array([i + 1 for i in range(n)])
        weights = weights / weights.sum()
        wma = np.dot(values, weights)
        
        # Calculate trend (simple linear regression)
        x = np.arange(n)
        y = np.array(values)
        
        # Linear regression: y = mx + b
        x_mean = x.mean()
        y_mean = y.mean()
        
        numerator = ((x - x_mean) * (y - y_mean)).sum()
        denominator = ((x - x_mean) ** 2).sum()
        
        if denominator != 0:
            slope = numerator / denominator
        else:
            slope = 0
        
        # Predict next value (one step ahead)
        prediction = wma + slope
        
        # Apply safety bounds (prevent extreme predictions)
        avg = np.mean(values)
        std = np.std(values)
        
        # Limit prediction to within 2 standard deviations of mean
        lower_bound = avg - 2 * std
        upper_bound = avg + 2 * std
        
        prediction = max(lower_bound, min(upper_bound, prediction))
        
        return float(prediction)
    
    def _analyze_trend(self, values: List[float]) -> str:
        """
        Analyze trend direction
        
        Returns:
            'increasing', 'decreasing', or 'stable'
        """
        if len(values) < 2:
            return 'stable'
        
        # Calculate slope
        n = len(values)
        x = np.arange(n)
        y = np.array(values)
        
        slope = np.polyfit(x, y, 1)[0]
        
        # Threshold for trend detection (relative to mean)
        threshold = np.mean(values) * 0.02  # 2% of mean
        
        if slope > threshold:
            return 'increasing'
        elif slope < -threshold:
            return 'decreasing'
        else:
            return 'stable'
    
    def _calculate_confidence(self, systolic: List[float], diastolic: List[float]) -> float:
        """
        Calculate prediction confidence based on data consistency
        
        Returns:
            Confidence score between 0 and 1
        """
        # Calculate coefficient of variation (CV) for both
        systolic_cv = np.std(systolic) / np.mean(systolic) if np.mean(systolic) > 0 else 1
        diastolic_cv = np.std(diastolic) / np.mean(diastolic) if np.mean(diastolic) > 0 else 1
        
        # Average CV
        avg_cv = (systolic_cv + diastolic_cv) / 2
        
        # Convert CV to confidence (lower CV = higher confidence)
        # CV of 0.1 (10%) = ~0.9 confidence
        # CV of 0.3 (30%) = ~0.7 confidence
        confidence = max(0.5, 1 - avg_cv * 2)
        
        # Adjust for sample size
        n = len(systolic)
        if n < 5:
            confidence *= 0.8
        elif n >= 10:
            confidence = min(1.0, confidence * 1.1)
        
        return confidence
    
    def _assess_risk(self, systolic: float, diastolic: float) -> str:
        """
        Assess BP risk level based on AHA guidelines
        
        Returns:
            'normal', 'elevated', 'high', 'hypertension_stage_1', 'hypertension_stage_2', 'crisis'
        """
        if systolic >= 180 or diastolic >= 120:
            return 'crisis'
        elif systolic >= 140 or diastolic >= 90:
            return 'hypertension_stage_2'
        elif systolic >= 130 or diastolic >= 80:
            return 'hypertension_stage_1'
        elif systolic >= 120 and diastolic < 80:
            return 'elevated'
        else:
            return 'normal'
    
    def _generate_recommendation(
        self, 
        systolic: float, 
        diastolic: float,
        sys_trend: str,
        dia_trend: str
    ) -> str:
        """Generate actionable recommendation"""
        risk = self._assess_risk(systolic, diastolic)
        
        if risk == 'crisis':
            return "⚠️ URGENT: Predicted BP in crisis range. Seek immediate medical attention."
        
        elif risk == 'hypertension_stage_2':
            if sys_trend == 'increasing' or dia_trend == 'increasing':
                return "⚠️ BP trending high. Contact your doctor promptly. Monitor closely."
            return "⚠️ Elevated BP predicted. Consult your healthcare provider about medication."
        
        elif risk == 'hypertension_stage_1':
            if sys_trend == 'increasing' or dia_trend == 'increasing':
                return "BP increasing. Reduce salt intake, increase exercise. Schedule doctor visit."
            return "BP slightly elevated. Focus on lifestyle modifications and monitor daily."
        
        elif risk == 'elevated':
            return "BP elevated but manageable. Continue healthy diet, regular exercise, and stress management."
        
        else:
            if sys_trend == 'increasing' or dia_trend == 'increasing':
                return "BP normal but trending up. Maintain healthy habits to prevent future elevation."
            return "✅ BP predicted to remain in healthy range. Keep up the good work!"
