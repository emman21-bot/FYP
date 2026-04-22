"""
Script to export trained models from Jupyter notebooks to ML service
Run this after training models in the ai_models/ folder
"""

import os
import sys
import shutil

def check_notebook_outputs():
    """Check if model files exist in ai_models folder"""
    print("🔍 Checking for trained model files...")
    
    ai_models_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'ai_models')
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    
    # Create models directory if it doesn't exist
    os.makedirs(models_dir, exist_ok=True)
    
    files_to_check = [
        ('xgb_hypertension_dailyMed.pkl', 'XGBoost Hypertension Model'),
        ('xgb_hypertension_dailyMed.json', 'XGBoost Model (JSON)'),
        ('catboost_bg_model.cbm', 'CatBoost Glucose Model')
    ]
    
    found_files = []
    
    for filename, description in files_to_check:
        source_path = os.path.join(ai_models_dir, filename)
        if os.path.exists(source_path):
            found_files.append((source_path, filename, description))
            print(f"✅ Found: {description} ({filename})")
        else:
            print(f"❌ Not found: {description} ({filename})")
    
    return found_files, models_dir


def copy_models(found_files, models_dir):
    """Copy model files to ml-service/models directory"""
    if not found_files:
        print("\n⚠️ No model files found!")
        print("\nPlease run the Jupyter notebooks to train and export models:")
        print("1. Open ai_models/SVM.ipynb")
        print("2. Run all cells to train XGBoost model")
        print("3. Run the export cell:")
        print("   import joblib")
        print("   joblib.dump(xgb, 'xgb_hypertension_dailyMed.pkl')")
        print("\n4. Open ai_models/Blood_Glucose_Prediction.ipynb")
        print("5. Run all cells to train CatBoost model")
        print("6. Run the export cell:")
        print("   model.save_model('catboost_bg_model.cbm')")
        return False
    
    print(f"\n📦 Copying models to {models_dir}...")
    
    for source_path, filename, description in found_files:
        dest_path = os.path.join(models_dir, filename)
        try:
            shutil.copy2(source_path, dest_path)
            file_size = os.path.getsize(dest_path) / 1024  # KB
            print(f"✅ Copied {description}: {file_size:.1f} KB")
        except Exception as e:
            print(f"❌ Error copying {filename}: {e}")
            return False
    
    return True


def verify_models():
    """Verify that models can be loaded"""
    print("\n🧪 Verifying models...")
    
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    
    # Try to load XGBoost model
    xgb_path = os.path.join(models_dir, 'xgb_hypertension_dailyMed.pkl')
    if os.path.exists(xgb_path):
        try:
            import joblib
            model = joblib.load(xgb_path)
            print(f"✅ XGBoost model loaded successfully")
            if hasattr(model, 'feature_names_in_'):
                print(f"   Features: {len(model.feature_names_in_)}")
        except Exception as e:
            print(f"❌ Error loading XGBoost model: {e}")
    
    # Try to load CatBoost model
    catboost_path = os.path.join(models_dir, 'catboost_bg_model.cbm')
    if os.path.exists(catboost_path):
        try:
            from catboost import CatBoostRegressor
            model = CatBoostRegressor()
            model.load_model(catboost_path)
            print(f"✅ CatBoost model loaded successfully")
            if hasattr(model, 'feature_names_'):
                print(f"   Features: {len(model.feature_names_)}")
        except Exception as e:
            print(f"❌ Error loading CatBoost model: {e}")


def main():
    """Main export function"""
    print("=" * 60)
    print("  DailyMed ML Model Export Utility")
    print("=" * 60)
    
    found_files, models_dir = check_notebook_outputs()
    
    if found_files:
        success = copy_models(found_files, models_dir)
        if success:
            verify_models()
            print("\n🎉 Model export complete!")
            print(f"\nModels are ready in: {models_dir}")
            print("\nYou can now start the ML service:")
            print("  cd ml-service")
            print("  python main.py")
        else:
            print("\n❌ Model export failed!")
    else:
        print("\n💡 Next steps:")
        print("1. Train models in Jupyter notebooks")
        print("2. Export model files to ai_models/ directory")
        print("3. Run this script again")


if __name__ == "__main__":
    main()
