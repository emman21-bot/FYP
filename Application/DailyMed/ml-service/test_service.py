#!/usr/bin/env python3
"""
Quick test script to verify ML service is working
Run this after starting the service
"""

import requests
import json
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

BASE_URL = "http://localhost:8000"

def print_header(text):
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"{Fore.CYAN}{text.center(60)}")
    print(f"{Fore.CYAN}{'='*60}\n")

def print_success(text):
    print(f"{Fore.GREEN}✅ {text}")

def print_error(text):
    print(f"{Fore.RED}❌ {text}")

def print_warning(text):
    print(f"{Fore.YELLOW}⚠️  {text}")

def print_json(data):
    print(json.dumps(data, indent=2))

def test_health_check():
    """Test service health endpoint"""
    print_header("Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success("Service is running!")
            print_json(data)
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to ML service. Is it running?")
        print_warning("Start the service with: python main.py")
        return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_hypertension_prediction():
    """Test hypertension prediction endpoint"""
    print_header("Hypertension Prediction Test")
    
    payload = {
        "patient_email": "test@example.com",
        "age": 55,
        "systolic_bp": 155,
        "diastolic_bp": 95,
        "family_history": True,
        "smoking_status": True,
        "salt_intake": 8.0,
        "stress_score": 8,
        "exercise_level": "Low"
    }
    
    print(f"{Fore.CYAN}Request:")
    print_json(payload)
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict/hypertension",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Prediction successful!")
            print(f"\n{Fore.CYAN}Response:")
            print_json(data)
            
            # Extract key info
            prediction = data.get('prediction', {})
            risk_score = prediction.get('risk_score', 0)
            risk_level = prediction.get('risk_level', 'Unknown')
            
            print(f"\n{Fore.YELLOW}Risk Score: {risk_score:.2%}")
            print(f"{Fore.YELLOW}Risk Level: {risk_level}")
            
            return True
        else:
            print_error(f"Prediction failed with status {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_glucose_prediction():
    """Test glucose prediction endpoint"""
    print_header("Glucose Prediction Test")
    
    payload = {
        "patient_email": "test@example.com",
        "current_glucose": 8.5,
        "carbohydrate_intake": 65,
        "insulin_dose": 10,
        "exercise_minutes": 20
    }
    
    print(f"{Fore.CYAN}Request:")
    print_json(payload)
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict/glucose",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Prediction successful!")
            print(f"\n{Fore.CYAN}Response:")
            print_json(data)
            
            # Extract key info
            prediction = data.get('prediction', {})
            predicted_glucose = prediction.get('predicted_glucose', 0)
            trend = prediction.get('trend', 'Unknown')
            risk_zone = prediction.get('risk_zone', 'Unknown')
            
            print(f"\n{Fore.YELLOW}Predicted Glucose: {predicted_glucose} mmol/L")
            print(f"{Fore.YELLOW}Trend: {trend}")
            print(f"{Fore.YELLOW}Risk Zone: {risk_zone}")
            
            return True
        else:
            print_error(f"Prediction failed with status {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def test_insulin_recommendation():
    """Test insulin dosage recommendation endpoint"""
    print_header("Insulin Recommendation Test")
    
    payload = {
        "patient_email": "test@example.com",
        "current_insulin_dose": 12
    }
    
    print(f"{Fore.CYAN}Request:")
    print_json(payload)
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict/insulin-dosage",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Recommendation successful!")
            print(f"\n{Fore.CYAN}Response:")
            print_json(data)
            
            # Extract key info
            prediction = data.get('prediction', {})
            action = prediction.get('action', 'Unknown')
            current_dose = prediction.get('current_dose', 0)
            suggested_dose = prediction.get('suggested_dose', 0)
            
            print(f"\n{Fore.YELLOW}Action: {action}")
            print(f"{Fore.YELLOW}Current Dose: {current_dose} units")
            print(f"{Fore.YELLOW}Suggested Dose: {suggested_dose} units")
            
            return True
        else:
            print_error(f"Recommendation failed with status {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def main():
    """Run all tests"""
    print(f"{Fore.MAGENTA}{Style.BRIGHT}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║         DailyMed ML Service - Test Suite                  ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    results = []
    
    # Test 1: Health Check
    results.append(("Health Check", test_health_check()))
    
    if not results[0][1]:
        print_error("\nService is not running. Please start it first.")
        print_warning("Run: python main.py")
        return
    
    # Test 2: Hypertension Prediction
    results.append(("Hypertension Prediction", test_hypertension_prediction()))
    
    # Test 3: Glucose Prediction
    results.append(("Glucose Prediction", test_glucose_prediction()))
    
    # Test 4: Insulin Recommendation
    results.append(("Insulin Recommendation", test_insulin_recommendation()))
    
    # Summary
    print_header("Test Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Fore.GREEN}PASSED" if result else f"{Fore.RED}FAILED"
        print(f"{test_name:.<50} {status}")
    
    print(f"\n{Fore.CYAN}Results: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n{Fore.GREEN}{Style.BRIGHT}🎉 All tests passed! ML Service is working correctly!")
    else:
        print(f"\n{Fore.YELLOW}{Style.BRIGHT}⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Fore.YELLOW}Tests interrupted by user")
    except Exception as e:
        print(f"\n{Fore.RED}Unexpected error: {e}")
