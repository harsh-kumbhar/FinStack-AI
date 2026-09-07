from pydantic import BaseModel, Field

class LoanRiskRequest(BaseModel):
    """
    Reduced request schema. Only asks for essential raw values.
    """
    EmploymentStatus: str = Field(..., example="Employed")
    EducationLevel: str = Field(..., example="Bachelor")
    
    AnnualIncome: float = Field(..., ge=0, example=800000.0) # INR
    SavingsAccountBalance: float = Field(..., ge=0, example=250000.0) # INR
    
    LoanAmount: float = Field(..., ge=0, example=150000.0) # INR
    LoanDuration: float = Field(..., gt=0, example=36)
    BaseInterestRate: float = Field(..., ge=0, example=8.5)
    
    CreditScore: float = Field(..., ge=300, le=850, example=720)
    
    MonthlyDebtPayments: float = Field(..., ge=0, example=15000.0) # INR


class LoanRiskResponse(BaseModel):
    risk_prediction: int = Field(..., description="0 for Low Risk, 1 for High Risk")
    risk_probability: float = Field(..., description="Risk Score (e.g. 0-100 or 0-1 from regressor)")
    approval_confidence: float = Field(..., description="Probability of approval from classifier")
    debt_to_income_ratio: float = Field(..., description="Calculated DTI ratio")
    monthly_payment_estimate: float = Field(..., description="Estimated monthly loan payment")
    status: str
