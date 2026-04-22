"""
Export trained models from Jupyter notebooks for ML service deployment
Run this script to generate model files for production use
"""
import sys
import os

# Check if running from Colab/notebook environment
try:
    from google.colab import files
    IN_COLAB = True
except ImportError:
    IN_COLAB = False

def export_hypertension_model():
    """Export XGBoost hypertension prediction model"""
    print("📊 Exporting Hypertension Model...")
    
    # You need to run cells from SVM.ipynb up to the model training
    # Then run these lines to export:
    """
    import joblib
    from xgboost import XGBClassifier
    
    # After training the xgb model in your notebook, save it:
    joblib.dump(xgb, 'xgb_hypertension_dailyMed.pkl')
    print("✅ Saved: xgb_hypertension_dailyMed.pkl")
    
    # Download if in Colab
    if IN_COLAB:
        files.download('xgb_hypertension_dailyMed.pkl')
    """
    
def export_glucose_model():
    """Export CatBoost glucose prediction model"""
    print("📊 Exporting Glucose Prediction Model...")
    
    # You need to run cells from Blood_Glucose_Prediction.ipynb up to the model training
    # Then run these lines to export:
    """
    from catboost import CatBoostRegressor
    
    # After training the catboost model in your notebook, save it:
    catboost_model.save_model('/content/catboost_bg_model.cbm')
    print("✅ Saved: catboost_bg_model.cbm")
    
    # Download if in Colab
    if IN_COLAB:
        files.download('catboost_bg_model.cbm')
    """

if __name__ == "__main__":
    print("=" * 60)
    print("🤖 DailyMed Model Export Utility")
    print("=" * 60)
    print()
    print("INSTRUCTIONS:")
    print("-" * 60)
    print("1. Open your Jupyter notebooks (SVM.ipynb and Blood_Glucose_Prediction.ipynb)")
    print("2. Run all cells up to and including model training")
    print("3. In SVM.ipynb, add a new cell and run:")
    print("   ┌────────────────────────────────────────┐")
    print("   │ import joblib                          │")
    print("   │ joblib.dump(xgb, 'xgb_hypertension_dailyMed.pkl') │")
    print("   │ from google.colab import files         │")
    print("   │ files.download('xgb_hypertension_dailyMed.pkl')   │")
    print("   └────────────────────────────────────────┘")
    print()
    print("4. In Blood_Glucose_Prediction.ipynb, add a new cell and run:")
    print("   ┌────────────────────────────────────────┐")
    print("   │ catboost_model.save_model('catboost_bg_model.cbm') │")
    print("   │ from google.colab import files         │")
    print("   │ files.download('catboost_bg_model.cbm')│")
    print("   └────────────────────────────────────────┘")
    print()
    print("5. Move both downloaded files to:")
    print("   📁 d:\\SaadFYP\\Application\\DailyMed\\ml-service\\models\\")
    print()
    print("6. Restart the ML service")
    print("=" * 60)
