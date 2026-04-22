@echo off
echo ========================================
echo   DailyMed ML Service Launcher
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [OK] Python is installed
python --version
echo.

REM Check if we're in the correct directory
if not exist "main.py" (
    echo [ERROR] main.py not found
    echo Please run this script from the ml-service directory
    echo.
    pause
    exit /b 1
)

echo [OK] Found main.py
echo.

REM Check if dependencies are installed
echo Checking dependencies...
python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Dependencies not installed
    echo Installing dependencies...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

echo [OK] Dependencies installed
echo.

REM Check for model files
echo Checking for model files...
if exist "models\xgb_hypertension_dailyMed.pkl" (
    echo [OK] Found hypertension model
) else (
    echo [WARNING] Hypertension model not found - will use mock predictor
)

if exist "models\catboost_bg_model.cbm" (
    echo [OK] Found glucose model
) else (
    echo [WARNING] Glucose model not found - will use mock predictor
)
echo.

REM Create models directory if it doesn't exist
if not exist "models" mkdir models

echo Starting ML Service...
echo.
echo Service will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.

REM Start the service
python main.py

pause
