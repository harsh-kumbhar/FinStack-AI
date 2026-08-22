from fastapi import APIRouter, Depends, HTTPException
from common.database import get_current_user

from .schema import (
    TaxCalculateRequest,
    TaxCalculateResponse,
    TaxAssessmentHistoryResponse,
    TaxAssessmentDetailResponse,
)
from .service import TaxEstimatorService

router = APIRouter(
    prefix="/tax-estimator",
    tags=["Tax Estimator"],
)


@router.post("/calculate", response_model=TaxCalculateResponse)
def calculate_tax(request: TaxCalculateRequest, user=Depends(get_current_user)):
    """Calculate tax estimate for the authenticated user and persist the assessment."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.calculate_and_save(user.id, request)


@router.get("/history", response_model=TaxAssessmentHistoryResponse)
def get_assessment_history(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.get_history(user.id)


@router.get("/history/{assessment_id}", response_model=TaxAssessmentDetailResponse)
def get_assessment_detail(assessment_id: str, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.get_assessment(assessment_id, user.id)
