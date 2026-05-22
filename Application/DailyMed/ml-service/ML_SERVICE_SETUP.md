# ML Service Setup & Deployment Guide

## Overview

The ML Service is a Python FastAPI microservice that provides AI-powered health predictions for the DailyMed platform:
- **Hypertension Risk Prediction** (XGBoost classifier)
- **Blood Glucose Forecasting** (LSTM neural network)
- **Insulin Dosage Recommendations** (Rule-based with ML)
- **Blood Pressure Trend Analysis** (Statistical forecasting)

## Prerequisites

- Python 3.8+
- pip (Python package manager)
- MongoDB running and accessible
- Backend server running on port 5000 (for data sync)

## Installation & Setup

### Step 1: Install Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

**Key dependencies:**
- `fastapi>=0.115.0` - Web framework
- `uvicorn[standard]>=0.32.0` - ASGI server
- `tensorflow>=2.15.0` - LSTM models
- `xgboost>=2.0.0` - Gradient boosting
- `pymongo>=4.10.0` - MongoDB driver
- `python-dotenv>=1.0.0` - Environment configuration
- `requests>=2.31.0` - HTTP client for testing

### Step 2: Configure Environment

The `.env` file is already configured with:
- `MONGO_URI` - MongoDB connection string
- `ML_SERVICE_PORT` - Port for the service (default: 8000)

**To customize:**
```bash
# Edit .env file
MONGO_URI=your_mongodb_connection_string
ML_SERVICE_PORT=8000
DEBUG=False
```

### Step 3: Verify Model Files

Ensure all trained models exist in `/models`:
- `xgb_hypertension_dailyMed.pkl` - Hypertension predictor
- `glucose_lstm_model.h5` - Glucose LSTM
- `glucose_lstm_best.h5` - Alternative glucose model
- `insulin_xgb_model.pkl` - Insulin recommendation

**Note:** If models are missing, the service will use mock predictions and log warnings.

## Running the Service

### Development Mode (with auto-reload)

```bash
python main.py
```

Expected output:
```
[2024-XX-XX XX:XX:XX] INFO:     Uvicorn running on http://0.0.0.0:8000
[2024-XX-XX XX:XX:XX] INFO:     Application startup complete
```

### Production Mode (with Gunicorn)

```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

### Using Provided Batch File (Windows)

```bash
start-ml-service.bat
```

## Testing the Service

### Quick Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "models": {
    "hypertension": true,
    "glucose_insulin": true
  },
  "database": true,
  "timestamp": "2024-XX-XXTHH:MM:SS"
}
```

### Run Full Test Suite

```bash
python test-all.py
```

This tests:
1. Service health check
2. Hypertension prediction
3. Glucose forecasting
4. Insulin recommendations
5. Blood pressure predictions

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and model availability.

### Hypertension Prediction
```
POST /predict/hypertension
Content-Type: application/json

{
  "patient_email": "patient@example.com",
  "age": 45,
  "systolic_bp": 140,
  "diastolic_bp": 90,
  "family_history": true,
  "smoking_status": false
}
```

### Glucose Prediction
```
POST /predict/glucose
Content-Type: application/json

{
  "patient_email": "patient@example.com",
  "current_glucose": 150
}
```

### Insulin Recommendation
```
POST /predict/insulin-dosage
Content-Type: application/json

{
  "patient_email": "patient@example.com",
  "current_insulin_dose": 10
}
```

### Blood Pressure Prediction
```
POST /predict/blood-pressure
Content-Type: application/json

{
  "patient_email": "patient@example.com"
}
```

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'tensorflow'"

**Solution:**
```bash
pip install tensorflow>=2.15.0
```

### Issue: "Connection refused" error

**Solution:** Ensure MongoDB is running:
```bash
# Windows
mongod

# macOS/Linux
brew services start mongodb-community
```

### Issue: Models not loading

**Solution:** Check if model files exist and are readable:
```bash
ls -la models/
```

If missing, models will fall back to mock predictions (logged as warnings).

### Issue: "pymongo.errors.ServerSelectionTimeoutError"

**Solution:** Verify MongoDB connection string in `.env`:
```bash
# Test connection
python -c "from pymongo import MongoClient; MongoClient('your_connection_string')"
```

## Performance & Scaling

### Model Loading
- Models are loaded once at startup
- LSTM model (~150MB) takes ~5 seconds to load
- All models cached in memory for fast predictions

### Prediction Latency
- Hypertension: ~50ms
- Glucose (30 min): ~100ms
- Glucose (6 hour): ~200ms
- Insulin: ~100ms
- BP: ~50ms

### Database Queries
- Health data queries optimized with indices
- Results cached in memory when possible
- MongoDB connection pooling enabled

## Integration with Backend

The backend service (`backend/server.js`) calls ML endpoints:

```javascript
// In backend controllers
const mlServiceURL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const prediction = await axios.post(`${mlServiceURL}/predict/hypertension`, data);
```

### Configure Backend Connection

In `backend/.env`:
```
ML_SERVICE_URL=http://localhost:8000
```

## Deployment on Production

### Docker Deployment

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

### Environment Variables
Set these in your production environment:
- `MONGO_URI` - Production MongoDB cluster
- `ML_SERVICE_PORT` - 8000 (or your preferred port)
- `DEBUG` - False (disable debug mode)

### HTTPS/SSL
Use reverse proxy (Nginx, Apache) with SSL certificate pointing to `localhost:8000`

## Security Recommendations

1. **MongoDB Security:**
   - Use strong credentials in production
   - Enable IP whitelist
   - Use connection pooling

2. **API Security:**
   - Add rate limiting on /predict endpoints
   - Implement API key authentication
   - Use HTTPS in production

3. **Model Security:**
   - Verify model integrity (checksums)
   - Log all predictions for audit
   - Implement prediction feedback loop

## Monitoring & Logging

### Application Logs
```bash
# Tail logs (if using systemd)
journalctl -u ml-service -f
```

### Model Performance
- Monitor prediction accuracy
- Track inference latency
- Log failed predictions

### Database Health
- Monitor MongoDB connection pool
- Check query performance
- Verify index usage

## License

Part of DailyMed FYP - Healthcare Microservice Architecture
