"""
=========================================================
ML Prediction Engine (Pipeline Version)
=========================================================
"""

from pathlib import Path

import joblib
import pandas as pd

# =========================================================
# Paths
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_PATH = BASE_DIR / "models" / "financial_pipeline.joblib"

_pipeline = None


# =========================================================
# Load Pipeline
# =========================================================

def load_pipeline():

    global _pipeline

    if _pipeline is None:

        print(f"Loading Pipeline from: {PIPELINE_PATH}")

        _pipeline = joblib.load(PIPELINE_PATH)

    return _pipeline


# =========================================================
# Prediction
# =========================================================

def predict_score(feature_dict: dict) -> float:

    pipeline = load_pipeline()

    df = pd.DataFrame([feature_dict])

    prediction = pipeline.predict(df)

    print("\n===== PIPELINE INPUT =====")
    print(df)

    print("\nPrediction:", prediction)

    return round(float(prediction[0]), 2)