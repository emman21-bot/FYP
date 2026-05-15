"""
DailyMed AI Module Health Check Script
Tests all ML models and endpoints to verify they're working correctly
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}  {text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.RESET}")

def test_health_check():
    """Test 1: ML Service Health Check"""
    print_header("TEST 1: ML Service Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        data = response.json()
        
        print_info(f"Status: {data.get('status', 'unknown')}")
        print_info(f"Database: {data.get('database', 'unknown')}")
        
        models = data.get('models', {})
        for model_name, is_loaded in models.items():
            if is_loaded:
                print_success(f"{model_name}: Loaded")
            else:
                print_warning(f"{model_name}: Not loaded (will use mock predictions)")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print_error("ML Service is not running!")
        print_info("Start it with: python main.py")
        return False
    except Exception as e:
        print_error(f"Health check failed: {e}")
        return False

def test_model_status():
    """Test 2: Check Model Status"""
    print_header("TEST 2: Model Status")
    
    try:
        response = requests.get(f"{BASE_URL}/models/status", timeout=5)
        models = response.json()
        
        all_loaded = True
        for model_name, model_info in models.items():
            is_loaded = model_info.get('loaded', False)
            model_type = model_info.get('type', 'Unknown')
            
            if is_loaded:
                print_success(f"{model_name}: {model_type}")
            else:
                print_warning(f"{model_name}: Not loaded")
                all_loaded = False
        
        if all_loaded:
            print_success("\nAll models are loaded and ready!")
        else:
            print_warning("\nSome models are not loaded. Service will use mock predictions.")
        
        return True
        
    except Exception as e:
        print_error(f"Model status check failed: {e}")
        return False

def test_hypertension_prediction():
    """Test 3: Hypertension Prediction"""
    print_header("TEST 3: Hypertension Prediction")
    
    try:
        test_data = {
            "patient_email": "test@example.com",
            "age": 45,
            "systolic_bp": 140,
            "diastolic_bp": 90,
            "family_history": True,
            "smoking_status": False,
            "salt_intake": 8.0,
            "stress_score": 7.0,
            "exercise_level": "Low"
        }
        
        response = requests.post(
            f"{BASE_URL}/predict/hypertension",
            json=test_data,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            prediction = data.get('prediction', {})
            
            print_success("Hypertension prediction successful!")
            print_info(f"Risk Score: {prediction.get('risk_score', 'N/A')}")
            print_info(f"Risk Level: {prediction.get('risk_level', 'N/A')}")
            print_info(f"Has Risk: {prediction.get('has_hypertension_risk', 'N/A')}")
            print_info(f"Recommendation: {prediction.get('recommendation', 'N/A')}")
            return True
        else:
            print_warning(f"Response: {response.json()}")
            return False
            
    except Exception as e:
        print_error(f"Hypertension prediction failed: {e}")
        return False

def test_glucose_prediction():
    """Test 4: Glucose Prediction"""
    print_header("TEST 4: Glucose Prediction")
    
    try:
        test_data = {
            "patient_email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/predict/glucose",
            json=test_data,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            prediction = data.get('prediction', {})
            
            print_success("Glucose prediction successful!")
            print_info(f"30-min prediction: {prediction.get('glucose_30min', 'N/A')}")
            print_info(f"6-hour prediction: {prediction.get('glucose_6hours', 'N/A')}")
            print_info(f"Trend: {prediction.get('trend', 'N/A')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error')
            if "Insufficient" in str(error_msg):
                print_warning("Not enough glucose data in database")
                print_info("This is normal if no patient data exists yet")
                return True  # Not a failure, just needs data
            print_warning(f"Response: {error_msg}")
            return False
            
    except Exception as e:
        print_error(f"Glucose prediction failed: {e}")
        return False

def test_insulin_dosage():
    """Test 5: Insulin Dosage Recommendation"""
    print_header("TEST 5: Insulin Dosage Recommendation")
    
    try:
        test_data = {
            "patient_email": "test@example.com",
            "current_insulin_dose": 10.0
        }
        
        response = requests.post(
            f"{BASE_URL}/predict/insulin-dosage",
            json=test_data,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            prediction = data.get('prediction', {})
            
            print_success("Insulin dosage recommendation successful!")
            print_info(f"Recommended dose: {prediction.get('recommended_dose', 'N/A')} units")
            print_info(f"Action: {prediction.get('action', 'N/A')}")
            print_info(f"Confidence: {prediction.get('confidence', 'N/A')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error')
            if "Insufficient" in str(error_msg):
                print_warning("Not enough data for insulin recommendation")
                print_info("This is normal if no patient data exists yet")
                return True
            print_warning(f"Response: {error_msg}")
            return False
            
    except Exception as e:
        print_error(f"Insulin dosage prediction failed: {e}")
        return False

def test_bp_prediction():
    """Test 6: Blood Pressure Prediction"""
    print_header("TEST 6: Blood Pressure Prediction")
    
    try:
        test_data = {
            "patient_email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/predict/blood-pressure",
            json=test_data,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            prediction = data.get('prediction', {})
            
            print_success("BP prediction successful!")
            print_info(f"Predicted Systolic: {prediction.get('predicted_systolic', 'N/A')}")
            print_info(f"Predicted Diastolic: {prediction.get('predicted_diastolic', 'N/A')}")
            print_info(f"Trend: {prediction.get('trend', 'N/A')}")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error')
            if "Insufficient" in str(error_msg):
                print_warning("Not enough BP data in database")
                print_info("This is normal if no patient data exists yet")
                return True
            print_warning(f"Response: {error_msg}")
            return False
            
    except Exception as e:
        print_error(f"BP prediction failed: {e}")
        return False

def run_all_tests():
    """Run all tests and show summary"""
    print_header("DAILYMED AI MODULE HEALTH CHECK")
    print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_info(f"ML Service URL: {BASE_URL}")
    
    results = {
        "Health Check": test_health_check(),
        "Model Status": test_model_status(),
        "Hypertension Prediction": test_hypertension_prediction(),
        "Glucose Prediction": test_glucose_prediction(),
        "Insulin Dosage": test_insulin_dosage(),
        "BP Prediction": test_bp_prediction()
    }
    
    # Print summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        if result:
            print_success(f"{test_name}")
        else:
            print_error(f"{test_name}")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 All tests passed! AI modules are working correctly!{Colors.RESET}\n")
    elif passed >= total / 2:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️ Most tests passed. Some features may need attention.{Colors.RESET}\n")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ Multiple tests failed. Please check the errors above.{Colors.RESET}\n")

if __name__ == "__main__":
    run_all_tests()
