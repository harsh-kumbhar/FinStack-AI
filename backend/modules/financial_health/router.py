from fastapi import APIRouter
from fastapi import Depends
from common.database import get_current_user
from modules.financial_health.history_service import HistoryService
from fastapi import HTTPException
from modules.financial_health.rag.chatbot import FinancialChatbot

from modules.financial_health.schema import (
    FinancialProfileData,
    PredictionResult,
    HistoryReport,
    HistoryReportList,
    ChatRequest,
    ChatResponse,
)

from modules.financial_health.ml_predictor import (
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
        "ml_health_score": result["ml_health_score"],
        "final_health_score": result["ml_health_score"],
        "rule_health_score": result["ml_health_score"],
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

    ml_health_score=result["ml_health_score"],

    health_status=result["health_status"],

    model_version="XGBoost v1.0",

    strengths=result["strengths"],

    weaknesses=result["weaknesses"],

    risks=result["risks"],

    recommendations=result["recommendations"],

    metrics=result["metrics"],
    
    score_breakdown=result["score_breakdown"],

    persona=result["persona"],  

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
@router.post(
    "/chat",
    response_model=ChatResponse,
)
def financial_health_chat(
    request: ChatRequest,
    user=Depends(get_current_user),
):

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    answer = FinancialChatbot.chat(
        question=request.question,
        report=request.report,
    )

    return ChatResponse(
        answer=answer
    )