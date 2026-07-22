from fastapi import APIRouter

from schemas.financial_health import (
    FinancialProfileData,
    PredictionResult,
)

from services.ml_predictor import (
    MLPredictorService,
)

router = APIRouter(
    prefix="/financial-health",
    tags=["Financial Health"],
)


@router.post(
    "/predict",
    response_model=PredictionResult,
)
def predict_financial_health(
    profile: FinancialProfileData,
):

    result = MLPredictorService.predict(profile)

    return PredictionResult(
        ml_health_score=result["score"],
        health_status=result["health_status"],
        model_version="XGBoost v1.0",
        strengths=result["strengths"],
        weaknesses=result["weaknesses"],
        risks=result["risks"],
        recommendations=result["recommendations"],
        ai_summary=result["ai_summary"],

    )