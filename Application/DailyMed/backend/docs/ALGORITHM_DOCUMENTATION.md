# Algorithm Documentation for DailyMed AI System

This document provides detailed documentation of all algorithms used in the DailyMed AI system, including their names, inputs, and pseudocode implementations.

## Table of Contents
1. [Hypertension Risk Prediction Algorithm](#1-hypertension-risk-prediction-algorithm)
2. [Blood Glucose Forecasting Algorithm](#2-blood-glucose-forecasting-algorithm)
3. [Insulin Dosage Recommendation Algorithm](#3-insulin-dosage-recommendation-algorithm)
4. [Blood Pressure Trend Analysis Algorithm](#4-blood-pressure-trend-analysis-algorithm)

---

## 1. Hypertension Risk Prediction Algorithm

### Algorithm Name
XGBoost Hypertension Classifier

### Purpose
Predict the risk of hypertension for patients based on various health metrics.

### Inputs
- Age (int): Patient's age in years (0-120)
- Salt Intake (float): Daily salt consumption in grams
- Stress Score (int): Stress level on a scale of 0-10
- Sleep Duration (float): Hours of sleep per night (0-24)
- BMI (float): Body Mass Index (10-60)
- Family History (int): Binary indicator (0 or 1) for family history of hypertension
- Smoking Status (int): Smoking status (0=Non-smoker, 1=Former smoker, 2=Current smoker)
- Exercise Level (int): Exercise frequency (0-5 scale)
- BP History (int): Binary indicator (0 or 1) for previous BP issues
- Systolic BP (int): Current systolic blood pressure (70-250 mmHg)
- Diastolic BP (int): Current diastolic blood pressure (40-150 mmHg)

### Algorithm Pseudocode

```
FUNCTION predict_hypertension(features):
    // Preprocessing step
    scaled_features = scale_features(features)
    
    // Prediction using XGBoost model
    prediction = xgboost_model.predict(scaled_features)
    probabilities = xgboost_model.predict_proba(scaled_features)
    confidence = probabilities[prediction]
    
    // Risk factor identification
    risk_factors = identify_risk_factors(features, prediction)
    
    // Recommendation generation
    recommendation = generate_recommendation(prediction, risk_factors, features)
    
    RETURN {
        prediction: prediction,
        confidence: confidence,
        risk_factors: risk_factors,
        recommendation: recommendation
    }

FUNCTION identify_risk_factors(features, prediction):
    risk_factors = []
    IF prediction == 1 THEN:
        IF bmi >= 30 THEN:
            ADD 'bmi' TO risk_factors
        END IF
        IF stress_score >= 7 THEN:
            ADD 'stress_score' TO risk_factors
        END IF
        IF sleep_duration < 6 THEN:
            ADD 'sleep_duration' TO risk_factors
        END IF
        IF salt_intake >= 3 THEN:
            ADD 'salt_intake' TO risk_factors
        END IF
        IF smoking_status >= 1 THEN:
            ADD 'smoking_status' TO risk_factors
        END IF
        IF exercise_level <= 1 THEN:
            ADD 'exercise_level' TO risk_factors
        END IF
        IF systolic_bp >= 140 OR diastolic_bp >= 90 THEN:
            ADD 'blood_pressure' TO risk_factors
        END IF
    END IF
    RETURN risk_factors

FUNCTION generate_recommendation(prediction, risk_factors, features):
    IF prediction == 1 THEN:
        recommendation = "High hypertension risk detected. Recommendations:"
        IF 'bmi' IN risk_factors THEN:
            recommendation += "- Reduce BMI through diet and exercise"
        END IF
        IF 'stress_score' IN risk_factors THEN:
            recommendation += "- Practice stress management techniques"
        END IF
        IF 'salt_intake' IN risk_factors THEN:
            recommendation += "- Reduce salt intake to <2g/day"
        END IF
        IF 'sleep_duration' IN risk_factors THEN:
            recommendation += "- Aim for 7-8 hours of sleep"
        END IF
        recommendation += "- Consult your doctor for detailed assessment"
    ELSE:
        recommendation = "Low hypertension risk. Continue healthy lifestyle practices."
    END IF
    RETURN recommendation
```

---

## 2. Blood Glucose Forecasting Algorithm

### Algorithm Name
LSTM Blood Glucose Forecaster

### Purpose
Predict future blood glucose levels for the next 6 hours using time-series data.

### Inputs
- Sequence (List of GlucoseRecord objects): Historical glucose data with:
  - BG (float): Blood glucose level (20-600 mg/dL)
  - Insulin (float): Insulin dose (≥0)
  - Carbs (float): Carbohydrate intake (≥0)
  - HR (float): Heart rate (≥0)
  - Steps (float): Step count (≥0)
  - Calories (float): Calorie intake (≥0)
  - Activity (float): Activity level (≥0)
- Forecast Horizon (int): Number of hours to forecast (1-12)

### Algorithm Pseudocode

```
FUNCTION forecast_glucose(sequence, forecast_horizon):
    // Convert to numpy array
    sequence_array = convert_to_array(sequence)
    
    // Normalize data
    mean = calculate_mean(sequence_array)
    std = calculate_std(sequence_array)
    sequence_normalized = normalize(sequence_array, mean, std)
    
    // Prepare input for LSTM
    IF length(sequence_normalized) < WINDOW_SIZE THEN:
        sequence_normalized = pad_sequence(sequence_normalized, WINDOW_SIZE)
    ELSE:
        sequence_normalized = take_last_elements(sequence_normalized, WINDOW_SIZE)
    END IF
    
    // Reshape for LSTM: (batch, timesteps, features)
    X = reshape_for_lstm(sequence_normalized)
    
    // Forecast
    predictions = []
    current_sequence = copy(X)
    
    // Forecast horizon in 5-min steps
    steps = forecast_horizon * 12
    
    FOR i = 1 TO steps:
        pred = lstm_model.predict(current_sequence)
        ADD pred[0] TO predictions
        
        // Update sequence with prediction
        new_step = create_new_step(pred[0])
        current_sequence = update_sequence(current_sequence, new_step)
    END FOR
    
    // Denormalize predictions
    predictions_denorm = denormalize(predictions, mean, std)
    
    // Calculate confidence
    confidence = calculate_confidence(predictions_denorm)
    
    // Determine trend
    trend = determine_trend(predictions_denorm)
    
    // Generate timestamps
    timestamps = generate_timestamps(forecast_horizon, steps)
    
    RETURN {
        forecast: predictions_denorm,
        timestamps: timestamps,
        confidence: confidence,
        trend: trend
    }

FUNCTION calculate_confidence(predictions):
    variance = calculate_variance(predictions)
    confidence = 1 / (1 + variance / 100)
    RETURN clamp(confidence, 0.5, 0.95)

FUNCTION determine_trend(predictions):
    start_avg = calculate_average(first_6_elements(predictions))
    end_avg = calculate_average(last_6_elements(predictions))
    diff = end_avg - start_avg
    
    IF diff > 20 THEN:
        RETURN 'rising'
    ELSE IF diff < -20 THEN:
        RETURN 'falling'
    ELSE:
        RETURN 'stable'
    END IF
```

---

## 3. Insulin Dosage Recommendation Algorithm

### Algorithm Name
Rule-Based Insulin Advisor

### Purpose
Calculate optimal insulin dosage recommendations based on current glucose levels, treatment plans, and recent health data.

### Inputs
- Current Glucose (float): Current blood glucose level (20-600 mg/dL)
- Target Glucose (float): Target blood glucose level (70-180 mg/dL)
- Recent Glucose Series (List[float]): Recent glucose measurements
- Recent Insulin (List[float]): Recent insulin doses
- Recent Carbs (List[float]): Recent carbohydrate intake
- Meals (List[Meal]): Recent meals with:
  - Time (string): Meal time
  - Carbs (float): Carbohydrate content
- Activity (string): Current activity level ('low', 'moderate', 'high')
- Treatment Plan (TreatmentPlan): Patient's treatment plan with:
  - Basal Dose (float): Basal insulin dose
  - Carb Ratio (float): Carbohydrate-to-insulin ratio
  - Correction Factor (float): Correction factor for hyperglycemia
  - Insulin Type (string): Type of insulin used

### Algorithm Pseudocode

```
FUNCTION calculate_dosage(input_data):
    current_bg = input_data.current_glucose
    target_bg = input_data.target_glucose
    carb_ratio = input_data.treatment_plan.carb_ratio
    correction_factor = input_data.treatment_plan.correction_factor
    
    // Calculate correction dose
    correction_dose = 0
    IF current_bg > target_bg THEN:
        correction_dose = (current_bg - target_bg) / correction_factor
    END IF
    
    // Calculate carb coverage
    carb_dose = 0
    total_carbs = sum(meal.carbs FOR meal IN input_data.meals)
    IF total_carbs > 0 THEN:
        carb_dose = total_carbs / carb_ratio
    END IF
    
    // Total bolus
    total_bolus = correction_dose + carb_dose
    
    // Activity adjustment
    IF input_data.activity == 'high' THEN:
        total_bolus = total_bolus * 0.8  // Reduce by 20%
    ELSE IF input_data.activity == 'low' THEN:
        total_bolus = total_bolus * 1.1  // Increase by 10%
    END IF
    
    // Check insulin on board (IOB)
    recent_insulin_total = sum(last_6_elements(input_data.recent_insulin))
    IF recent_insulin_total > 0 THEN:
        total_bolus = total_bolus - (recent_insulin_total * 0.5)  // Subtract 50%
    END IF
    
    // Round to nearest 0.5 units
    total_bolus = round_to_nearest_half(max(0, total_bolus))
    
    // Generate reasoning
    reasoning = generate_reasoning(
        current_bg, target_bg, correction_dose, carb_dose,
        total_carbs, total_bolus, input_data.activity
    )
    
    // Determine suggestion type
    IF total_bolus >= 1 THEN:
        suggestion_type = 'bolus'
        timing = 'now'
    ELSE IF current_bg > target_bg + 50 THEN:
        suggestion_type = 'bolus'
        timing = 'now'
        total_bolus = max(1, total_bolus)
    ELSE:
        suggestion_type = 'no_change'
        timing = 'monitor'
    END IF
    
    // Calculate confidence
    glucose_variance = calculate_variance(last_12_elements(input_data.recent_glucose_series))
    confidence = 1 / (1 + glucose_variance / 500)
    confidence = clamp(confidence, 0.6, 0.95)
    
    RETURN {
        suggestion: {
            type: suggestion_type,
            timing: timing,
            amount: total_bolus,
            units: 'units',
            reasoning: reasoning
        },
        confidence: confidence,
        reasoning: reasoning
    }

FUNCTION generate_reasoning(current_bg, target_bg, correction_dose, carb_dose, 
                           total_carbs, total_bolus, activity):
    reasoning = []
    
    IF current_bg > target_bg THEN:
        ADD "Current glucose (${current_bg} mg/dL) is above target (${target_bg} mg/dL). 
              Correction dose: ${correction_dose} units." TO reasoning
    END IF
    
    IF total_carbs > 0 THEN:
        ADD "Carbohydrate coverage for ${total_carbs}g carbs: ${carb_dose} units." TO reasoning
    END IF
    
    IF activity != 'moderate' THEN:
        ADD "Dose adjusted for ${activity} activity level." TO reasoning
    END IF
    
    ADD "Recommended bolus: ${total_bolus} units." TO reasoning
    
    RETURN join_strings(reasoning, " ")
```

---

## 4. Blood Pressure Trend Analysis Algorithm

### Algorithm Name
Statistical Trend Analyzer for Blood Pressure

### Purpose
Predict future blood pressure values based on historical trends using statistical methods.

### Inputs
- BP History (List[Dict]): Historical BP readings with:
  - Systolic (float): Systolic blood pressure
  - Diastolic (float): Diastolic blood pressure
  - Timestamp (datetime): Time of measurement

### Algorithm Pseudocode

```
FUNCTION predict_bp(bp_history):
    IF length(bp_history) < 3 THEN:
        RETURN {
            success: false,
            message: "Insufficient BP data. Need at least 3 readings.",
            predicted_systolic: null,
            predicted_diastolic: null
        }
    END IF
    
    // Extract values
    systolic_values = [reading.systolic FOR reading IN bp_history]
    diastolic_values = [reading.diastolic FOR reading IN bp_history]
    
    // Calculate trends using linear regression
    systolic_pred = predict_value(systolic_values)
    diastolic_pred = predict_value(diastolic_values)
    
    // Calculate confidence
    confidence = calculate_confidence(systolic_values, diastolic_values)
    
    // Analyze trend direction
    systolic_trend = analyze_trend(systolic_values)
    diastolic_trend = analyze_trend(diastolic_values)
    
    // Generate recommendation
    recommendation = generate_recommendation(
        systolic_pred, diastolic_pred,
        systolic_trend, diastolic_trend
    )
    
    // Risk assessment
    risk_level = assess_risk(systolic_pred, diastolic_pred)
    
    RETURN {
        success: true,
        predicted_systolic: round(systolic_pred, 1),
        predicted_diastolic: round(diastolic_pred, 1),
        systolic_trend: systolic_trend,
        diastolic_trend: diastolic_trend,
        confidence: round(confidence, 2),
        risk_level: risk_level,
        recommendation: recommendation,
        method: "statistical_trend_analysis",
        data_points: length(bp_history)
    }

FUNCTION predict_value(values):
    n = length(values)
    
    // Weighted moving average
    weights = [i + 1 FOR i IN range(n)]
    weights = normalize_weights(weights)
    wma = dot_product(values, weights)
    
    // Calculate trend (linear regression)
    x = [i FOR i IN range(n)]
    y = values
    
    x_mean = calculate_mean(x)
    y_mean = calculate_mean(y)
    
    numerator = sum((x[i] - x_mean) * (y[i] - y_mean) FOR i IN range(n))
    denominator = sum((x[i] - x_mean)^2 FOR i IN range(n))
    
    IF denominator != 0 THEN:
        slope = numerator / denominator
    ELSE:
        slope = 0
    END IF
    
    // Predict next value
    prediction = wma + slope
    
    // Apply safety bounds
    avg = calculate_mean(values)
    std = calculate_std(values)
    lower_bound = avg - 2 * std
    upper_bound = avg + 2 * std
    prediction = clamp(prediction, lower_bound, upper_bound)
    
    RETURN prediction

FUNCTION analyze_trend(values):
    IF length(values) < 2 THEN:
        RETURN 'stable'
    END IF
    
    // Calculate slope using linear regression
    n = length(values)
    x = [i FOR i IN range(n)]
    y = values
    
    coefficients = polyfit(x, y, 1)
    slope = coefficients[0]
    
    // Threshold for trend detection
    threshold = calculate_mean(values) * 0.02
    
    IF slope > threshold THEN:
        RETURN 'increasing'
    ELSE IF slope < -threshold THEN:
        RETURN 'decreasing'
    ELSE:
        RETURN 'stable'
    END IF

FUNCTION calculate_confidence(systolic, diastolic):
    // Calculate coefficient of variation
    systolic_cv = calculate_std(systolic) / calculate_mean(systolic)
    diastolic_cv = calculate_std(diastolic) / calculate_mean(diastolic)
    
    // Average CV
    avg_cv = (systolic_cv + diastolic_cv) / 2
    
    // Convert CV to confidence
    confidence = max(0.5, 1 - avg_cv * 2)
    
    // Adjust for sample size
    n = length(systolic)
    IF n < 5 THEN:
        confidence = confidence * 0.8
    ELSE IF n >= 10 THEN:
        confidence = min(1.0, confidence * 1.1)
    END IF
    
    RETURN confidence

FUNCTION assess_risk(systolic, diastolic):
    IF systolic >= 180 OR diastolic >= 120 THEN:
        RETURN 'crisis'
    ELSE IF systolic >= 140 OR diastolic >= 90 THEN:
        RETURN 'hypertension_stage_2'
    ELSE IF systolic >= 130 OR diastolic >= 80 THEN:
        RETURN 'hypertension_stage_1'
    ELSE IF systolic >= 120 AND diastolic < 80 THEN:
        RETURN 'elevated'
    ELSE:
        RETURN 'normal'
    END IF
```