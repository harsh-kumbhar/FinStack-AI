from fastapi import APIRouter
from fastapi import Depends
from database import get_current_user
from services.history_service import HistoryService
from fastapi import HTTPException

from schemas.financial_health import (
    FinancialProfileData,
    PredictionResult,
    HistoryReport,
    HistoryReportList,
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
    user=Depends(get_current_user),
):

    result = MLPredictorService.predict(profile)
    saved_report = HistoryService.save_report(
    user_id=user.id,
    prediction={
        "ml_health_score": result["score"],
        "final_health_score": result["score"],
        "rule_health_score": result["score"],
        "health_status": result["health_status"],
        "strengths": result["strengths"],
        "weaknesses": result["weaknesses"],
        "risks": result["risks"],
        "recommendations": result["recommendations"],
        "ai_summary": result["ai_summary"],
    },
    engineered_features=result["engineered_features"],
)

    return PredictionResult(
    report_id=saved_report["id"],

    ml_health_score=result["score"],

    health_status=result["health_status"],

    model_version="XGBoost v1.0",

    strengths=result["strengths"],

    weaknesses=result["weaknesses"],

    risks=result["risks"],

    recommendations=result["recommendations"],

    ai_summary=result["ai_summary"],
)

@router.get(
    "/history",
    response_model=HistoryReportList,
)
def get_history(
    user=Depends(get_current_user),
):

    reports = HistoryService.get_user_reports(user.id)

    return {
        "reports": reports
    }


@router.get(
    "/history/{report_id}",
)
def get_report(
    report_id: str,
    user=Depends(get_current_user),
):

    report = HistoryService.get_report(report_id)

    if report["user_id"] != user.id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized",
        )

    return report


@router.delete(
    "/history/{report_id}",
)
def delete_report(
    report_id: str,
    user=Depends(get_current_user),
):

    report = HistoryService.get_report(report_id)

    if report["user_id"] != user.id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized",
        )

    HistoryService.delete_report(report_id)

    return {
        "message": "Report deleted successfully"
    }