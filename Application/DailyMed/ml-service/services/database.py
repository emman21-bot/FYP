"""
Database Service for ML Microservice
Connects to MongoDB and fetches patient health data
"""

from pymongo import MongoClient
from typing import Dict, Any, Optional, List
import os
from datetime import datetime, timedelta
from bson import ObjectId


class DatabaseService:
    """MongoDB connection and data retrieval service"""
    
    def __init__(self):
        self.client = None
        self.db = None
        self.mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/dailymed")
    
    def is_connected(self) -> bool:
        """Check if database is connected"""
        if not self.client:
            return False
        try:
            self.client.admin.command('ping')
            return True
        except:
            return False
    
    def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = MongoClient(self.mongo_uri)
            # Extract database name from URI
            db_name = self.mongo_uri.split('/')[-1].split('?')[0]
            self.db = self.client[db_name]
            
            # Test connection
            self.client.admin.command('ping')
            print(f"✅ Connected to MongoDB: {db_name}")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            raise Exception(f"Database connection required. Error: {e}")
    
    def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("✅ MongoDB connection closed")
    
    def get_patient_health_data(self, patient_email: str) -> Optional[Dict[str, Any]]:
        """
        Fetch patient health data for hypertension prediction
        
        Args:
            patient_email: Patient's email address
            
        Returns:
            Dictionary with patient health metrics or None
        """
        if self.db is None:
            raise Exception("Database not connected. Cannot fetch patient data.")
        
        try:
            # Get user info
            user = self.db.users.find_one({"email": patient_email})
            if not user:
                return None
            
            # Get latest health data entries (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            health_data = list(self.db.healthdatas.find({
                "userEmail": patient_email,
                "createdAt": {"$gte": thirty_days_ago}
            }).sort("createdAt", -1).limit(100))
            
            if not health_data:
                return None
            
            # Calculate aggregates
            latest = health_data[0]
            
            # Average BP from recent readings
            bp_readings = [h for h in health_data if h.get("bloodPressure")]
            if bp_readings:
                systolic_values = [float(h["bloodPressure"]["systolic"]) for h in bp_readings if h.get("bloodPressure", {}).get("systolic")]
                diastolic_values = [float(h["bloodPressure"]["diastolic"]) for h in bp_readings if h.get("bloodPressure", {}).get("diastolic")]
                
                systolic_avg = sum(systolic_values) / len(systolic_values) if systolic_values else 120
                diastolic_avg = sum(diastolic_values) / len(diastolic_values) if diastolic_values else 80
            else:
                systolic_avg = 120
                diastolic_avg = 80
            
            # Extract patient profile data
            age = self._calculate_age(user.get("dateOfBirth"))
            
            return {
                "patient_id": str(user["_id"]),
                "email": patient_email,
                "age": age,
                "latest_systolic": systolic_avg,
                "latest_diastolic": diastolic_avg,
                "family_history": user.get("medicalConditions", {}).get("familyHistoryHypertension", False),
                "smoking_status": user.get("smokingStatus", False),
                "salt_intake": user.get("dietaryHabits", {}).get("saltIntake", 5.0),
                "stress_score": latest.get("stressLevel", 5),
                "exercise_level": user.get("exerciseLevel", "Moderate"),
                "health_data_count": len(health_data)
            }
            
        except Exception as e:
            print(f"Error fetching patient health data: {e}")
            return None
    
    def get_patient_glucose_data(self, patient_email: str) -> Optional[Dict[str, Any]]:
        """
        Fetch patient glucose data for prediction
        
        Args:
            patient_email: Patient's email address
            
        Returns:
            Dictionary with glucose history and metrics or None
        """
        if self.db is None:
            raise Exception("Database not connected. Cannot fetch glucose data.")
        
        try:
            # Get user info
            user = self.db.users.find_one({"email": patient_email})
            if not user:
                print(f"❌ USER NOT FOUND: {patient_email}")
                return None
            
            print(f"✅ Found user: {patient_email}, ID: {user['_id']}")
            
            # Get health data from last 30 days with blood sugar readings
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            health_data = list(self.db.healthdatas.find({
                "userEmail": patient_email,
                "bloodSugar": {"$exists": True},
                "createdAt": {"$gte": thirty_days_ago}
            }).sort("readingDate", -1).limit(200))
            
            print(f"📊 Found {len(health_data)} health records for {patient_email}")
            if health_data and len(health_data) > 0:
                sample = health_data[0]
                print(f"📝 Sample record: userEmail={sample.get('userEmail')}, bloodSugar={sample.get('bloodSugar')}")
            
            if not health_data:
                print(f"❌ NO HEALTH DATA FOUND for {patient_email}")
                return None
            
            # Extract glucose values and other metrics from health data
            # Priority: RANDOM readings (most representative of actual glucose levels)
            glucose_history_mgdl = []
            insulin_history = []
            carbs_history = []
            
            for h in health_data:
                blood_sugar = h.get("bloodSugar", {})
                # CHANGED: Use random first (most accurate), then postMeal, then fasting
                if blood_sugar.get("random"):
                    glucose_history_mgdl.append(float(blood_sugar["random"]))
                elif blood_sugar.get("postMeal"):
                    glucose_history_mgdl.append(float(blood_sugar["postMeal"]))
                elif blood_sugar.get("fasting"):
                    glucose_history_mgdl.append(float(blood_sugar["fasting"]))
                
                # Collect insulin and carbs data
                if h.get("insulinTaken") is not None:
                    insulin_history.append(float(h.get("insulinTaken", 0)))
                if h.get("carbsIntake") is not None:
                    carbs_history.append(float(h.get("carbsIntake", 0)))
            
            if not glucose_history_mgdl:
                return None
            
            # Convert mg/dL to mmol/L for model (divide by 18)
            glucose_history = [g / 18.0 for g in glucose_history_mgdl]
            
            # Calculate averages
            avg_glucose = sum(glucose_history) / len(glucose_history) if glucose_history else 5.5
            avg_insulin = sum(insulin_history) / len(insulin_history) if insulin_history else 0
            avg_carbs = sum(carbs_history) / len(carbs_history) if carbs_history else 10
            
            # Get treatment plan if exists
            treatment_plan = self.db.treatmentplans.find_one({
                "patientId": user["_id"],
                "status": "active"
            })
            
            # Use actual insulin data, fallback to treatment plan or default
            latest_insulin = insulin_history[0] if insulin_history else (treatment_plan.get("basalInsulinDose", 10) if treatment_plan else avg_insulin if avg_insulin > 0 else 0)
            
            # Store original mg/dL value for display
            latest_glucose_mgdl = glucose_history_mgdl[0] if glucose_history_mgdl else 100
            latest_carbs = carbs_history[0] if carbs_history else avg_carbs
            
            return {
                "patient_id": str(user["_id"]),
                "email": patient_email,
                "latest_glucose": glucose_history[0] if glucose_history else 5.5,  # mmol/L
                "latest_glucose_mgdl": latest_glucose_mgdl,  # Original mg/dL for reference
                "avg_glucose": avg_glucose,
                "glucose_history": glucose_history[:20],  # Last 20 readings in mmol/L
                "glucose_history_mgdl": glucose_history_mgdl[:20],  # Original mg/dL values
                "latest_insulin": latest_insulin,
                "avg_insulin": avg_insulin,
                "avg_carbs": avg_carbs,
                "latest_carbs": latest_carbs,
                "avg_exercise": user.get("exerciseMinutesPerDay", 30),
                "data_points": len(glucose_history)
            }
            
        except Exception as e:
            print(f"Error fetching glucose data: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def save_model_run(
        self,
        patient_email: str,
        model_name: str,
        prediction_type: str,
        input_features: Dict[str, Any],
        output_prediction: Dict[str, Any]
    ) -> Optional[str]:
        """
        Save ML model prediction to database
        
        Returns:
            Model run ID or None
        """
        if self.db is None:
            return None
        
        try:
            # Get user
            user = self.db.users.find_one({"email": patient_email})
            if not user:
                return None
            
            # Create model run document
            model_run = {
                "userId": user["_id"],
                "modelName": model_name,
                "predictionType": prediction_type,
                "inputFeatures": input_features,
                "outputPrediction": output_prediction,
                "createdAt": datetime.utcnow(),
                "confidence": output_prediction.get("risk_score") or output_prediction.get("confidence", 0.5)
            }
            
            result = self.db.modelruns.insert_one(model_run)
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"Error saving model run: {e}")
            return None
    
    def save_dosage_suggestion(
        self,
        patient_email: str,
        current_dose: float,
        suggested_dose: float,
        reasoning: str,
        model_run_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Save insulin dosage suggestion to database
        
        Returns:
            Suggestion ID or None
        """
        if self.db is None:
            return None
        
        try:
            # Get user and doctor
            user = self.db.users.find_one({"email": patient_email})
            if not user:
                return None
            
            doctor = None
            if user.get("assignedDoctorEmail"):
                doctor = self.db.users.find_one({"email": user["assignedDoctorEmail"]})
            
            # Create dosage suggestion document
            suggestion = {
                "patientId": user["_id"],
                "doctorId": doctor["_id"] if doctor else None,
                "currentDose": current_dose,
                "suggestedDose": suggested_dose,
                "adjustmentType": "increase" if suggested_dose > current_dose else "decrease" if suggested_dose < current_dose else "maintain",
                "reasoning": reasoning,
                "status": "pending_approval",
                "generatedBy": "ml_model",
                "modelRunId": ObjectId(model_run_id) if model_run_id else None,
                "createdAt": datetime.utcnow()
            }
            
            result = self.db.dosagesuggestions.insert_one(suggestion)
            
            # Create notification for doctor if assigned
            if doctor:
                notification = {
                    "userId": doctor["_id"],
                    "type": "dosage_suggestion_pending",
                    "message": f"New AI-generated dosage suggestion for patient {user.get('name', patient_email)}",
                    "relatedId": result.inserted_id,
                    "isRead": False,
                    "createdAt": datetime.utcnow()
                }
                self.db.notifications.insert_one(notification)
            
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"Error saving dosage suggestion: {e}")
            return None
    
    def get_patient_health_data_list(self, patient_email: str) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch patient health data as a list of dictionaries for ML prediction
        
        Args:
            patient_email: Patient's email address
            
        Returns:
            List of health data entries with bloodSugar, insulinDose, carbsIntake, etc.
        """
        if self.db is None:
            raise Exception("Database not connected. Cannot fetch patient data.")
        
        try:
            # Get user info
            user = self.db.users.find_one({"email": patient_email})
            if not user:
                print(f"❌ User not found: {patient_email}")
                return None
            
            # Get health data from last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            health_data = list(self.db.healthdatas.find({
                "userEmail": patient_email,
                "bloodSugar": {"$exists": True},
                "createdAt": {"$gte": thirty_days_ago}
            }).sort("readingDate", -1).limit(200))
            
            if not health_data:
                print(f"❌ No health data found for {patient_email}")
                return None
            
            # Transform to expected format for ML models
            result = []
            for h in health_data:
                blood_sugar = h.get("bloodSugar", {})
                
                # Get glucose value (priority: random > postMeal > fasting)
                glucose_value = None
                if blood_sugar.get("random"):
                    glucose_value = float(blood_sugar["random"])
                elif blood_sugar.get("postMeal"):
                    glucose_value = float(blood_sugar["postMeal"])
                elif blood_sugar.get("fasting"):
                    glucose_value = float(blood_sugar["fasting"])
                
                if glucose_value is None:
                    continue
                
                # Build entry dict
                entry = {
                    "bloodSugar": blood_sugar,
                    "bloodGlucose": glucose_value,  # Alias for convenience
                    "insulinDose": float(h.get("insulinTaken", 0) or h.get("insulinDose", 0) or 0),
                    "carbsIntake": float(h.get("carbsIntake", 0) or 0),
                    "readingDate": h.get("readingDate") or h.get("createdAt"),
                    "createdAt": h.get("createdAt")
                }
                result.append(entry)
            
            print(f"📊 Retrieved {len(result)} health records for {patient_email}")
            return result if result else None
            
        except Exception as e:
            print(f"Error fetching health data list: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _calculate_age(self, date_of_birth) -> int:
        """Calculate age from date of birth"""
        if not date_of_birth:
            return 30  # Default age
        
        if isinstance(date_of_birth, str):
            dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))
        else:
            dob = date_of_birth
        
        today = datetime.utcnow()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
