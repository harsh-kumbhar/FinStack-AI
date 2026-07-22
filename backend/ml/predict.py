"""
=========================================================
ML Prediction Engine
---------------------------------------------------------
Loads the trained Financial Health Model and predicts
the Financial Health Score for new user profiles.
=========================================================
"""

from pathlib import Path

import joblib
import pandas as pd
from xgboost import XGBRegressor


# =========================================================
# Paths
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "models" / "financial_health_model.json"
FEATURES_PATH = BASE_DIR / "models" / "model_features.pkl"


# =========================================================
# Lazy Loaded Objects
# =========================================================

_model = None
_model_features = None


# =========================================================
# Load Model
# =========================================================

def load_model():
    """
    Loads the trained XGBoost model only once.
    """

    global _model

    if _model is None:
        _model = XGBRegressor()
        _model.load_model(MODEL_PATH)

    return _model


# =========================================================
# Load Feature List
# =========================================================

def load_feature_columns():
    """
    Loads the feature column names used during training.
    """

    global _model_features

    if _model_features is None:
        _model_features = joblib.load(FEATURES_PATH)

    return _model_features


# =========================================================
# Prepare Features
# =========================================================

def prepare_features(feature_dict: dict) -> pd.DataFrame:
    """
    Converts engineered features into the exact format
    expected by the trained ML model.
    """

    # Create dataframe from dictionary
    df = pd.DataFrame([feature_dict])

    # One-hot encode categorical columns
    df = pd.get_dummies(
        df,
        columns=[
            "persona",
            "employment_status",
            "financial_goal",
        ],
    )

    # Load training feature list
    model_features = load_feature_columns()

    # Add any missing columns
    for column in model_features:
        if column not in df.columns:
            df[column] = 0

    # Remove unexpected columns
    df = df[model_features]

    return df


# =========================================================
# Predict Financial Health Score
# =========================================================

def predict_score(feature_dict: dict) -> float:
    """
    Predicts Financial Health Score.

    Returns:
        float
    """

    model = load_model()

    prepared_df = prepare_features(feature_dict)

    prediction = model.predict(prepared_df)
    print(prediction)
    return round(float(prediction[0]), 2)