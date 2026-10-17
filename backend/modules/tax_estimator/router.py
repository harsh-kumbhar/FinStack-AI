from fastapi import APIRouter, Depends, HTTPException
from common.database import get_current_user
from .schema import TaxInterviewRequest
from .interview_service import TaxInterviewService, InterviewResponse
from .schema import (
    TaxCalculateRequest,
    TaxCalculateResponse,
    TaxAssessmentHistoryResponse,
    TaxAssessmentDetailResponse,
    ProfileDefaultsResponse,
    TaxWhatIfRequest,
    TaxWhatIfResponse,
    TaxEducationResponse,
    TaxAssessmentComparisonRequest,
    TaxAssessmentComparisonResponse,
    TaxJourneyMilestone,
    ConfirmedDocumentTaxInputResponse,
)
from .service import TaxEstimatorService

router = APIRouter(
    prefix="/tax-estimator",
    tags=["Tax Estimator"],
)


@router.get("/tax-education", response_model=TaxEducationResponse)
def get_tax_education(financial_year: str = "2024-25"):
    """
    Retrieve centralized tax education data, slab breakdowns, statutory deduction limits,
    visual calculation flow stages, and glossary definitions for a financial year.
    Authoritative, versioned, and beginner-friendly.
    """
    return TaxEstimatorService.get_tax_education(financial_year)



@router.get("/profile-defaults", response_model=ProfileDefaultsResponse)
def get_profile_defaults(financial_year: str = "2024-25", user=Depends(get_current_user)):
    """Retrieve pre-filled tax input defaults derived from user's FinStack profile with source provenance."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.get_profile_defaults(user.id, financial_year)

@router.post("/interview/chat", response_model=InterviewResponse)
async def tax_interview_chat_endpoint(request: TaxInterviewRequest, user=Depends(get_current_user)):
    """
    State Machine Chatbot Endpoint.
    Receives chat history and current slots, passes them to DeepSeek, 
    and returns the assistant's reply along with updated slot extraction.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
        
    # Convert Pydantic message objects into plain dictionaries for the LLM
    messages_list = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Process through the AI Service
    response = await TaxInterviewService.process_chat(
        messages=messages_list,
        current_slots=request.current_slots
    )
    
    return response

@router.post("/calculate", response_model=TaxCalculateResponse)
def calculate_tax(request: TaxCalculateRequest, user=Depends(get_current_user)):
    """Calculate tax estimate for the authenticated user and persist the assessment."""
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.calculate_and_save(user.id, request)


@router.post("/what-if", response_model=TaxWhatIfResponse)
def simulate_what_if(request: TaxWhatIfRequest, user=Depends(get_current_user)):
    """
    Run interactive What-If scenario simulations (salary change, additional deductions,
    home loan interest, regime switch). Evaluated transiently in-memory using the SAME
    authoritative tax engine. Never mutates or overwrites user assessments or profile.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.simulate_what_if(request)


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


@router.post("/history/{assessment_id}/recalculate", response_model=TaxCalculateResponse)
def recalculate_assessment(assessment_id: str, user=Depends(get_current_user)):
    """
    Re-run calculation engine with the exact inputs from a past assessment
    under current statutory rules, persisting a new assessment.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.recalculate_assessment(user.id, assessment_id)


@router.post("/history/compare", response_model=TaxAssessmentComparisonResponse)
def compare_assessments(request: TaxAssessmentComparisonRequest, user=Depends(get_current_user)):
    """
    Compare two historical tax assessments side-by-side with full delta breakdown.
    Enforces user isolation on both assessment records.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.compare_assessments(user.id, request.assessment_id_1, request.assessment_id_2)


@router.get("/journey/milestone", response_model=TaxJourneyMilestone)
def get_journey_milestone(user=Depends(get_current_user)):
    """
    Retrieve decoupled tax assessment status for Financial Journey integration.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthenticated")
    return TaxEstimatorService.get_journey_milestone(user.id)


