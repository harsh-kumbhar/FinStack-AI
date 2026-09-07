from fastapi import APIRouter, HTTPException, Depends
from .schemas import LoanRiskRequest, LoanRiskResponse
from .service import loan_risk_service
from common.database import get_current_user, supabase

router = APIRouter(prefix="/api/v1/loan-risk", tags=["Loan Risk"])

@router.post("/predict", response_model=LoanRiskResponse)
def predict_loan_risk(payload: LoanRiskRequest, user=Depends(get_current_user)):
    try:
        result = loan_risk_service.assess_risk(payload)

        # Save to Supabase
        try:
            supabase.table("loan_risk_history").insert({
                "user_id": user.id,
                "income": payload.AnnualIncome,
                "loan_amount": payload.LoanAmount,
                "monthly_debt": payload.MonthlyDebtPayments,
                "credit_score": payload.CreditScore,
                "risk_prediction": result["risk_prediction"],
                "risk_probability": result["risk_probability"],
                "status": result["status"]
            }).execute()
        except Exception as db_err:
            print(f"Warning: Failed to save to Supabase. Make sure 'loan_risk_history' table exists. Error: {db_err}")

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
