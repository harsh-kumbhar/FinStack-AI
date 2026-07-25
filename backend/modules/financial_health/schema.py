from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ==========================================================
# Raw Financial Profile (Fetched from Supabase)
# ==========================================================

class FinancialProfileData(BaseModel):
    age: int = Field(..., ge=18, le=100)

    employment_status: str

    monthly_income: float = Field(..., ge=0)

    monthly_expenses: float = Field(..., ge=0)

    monthly_savings: float = Field(..., ge=0)

    emergency_fund: float = Field(..., ge=0)

    total_debt: float = Field(..., ge=0)

    investments: float = Field(..., ge=0)

    insurance_cover: float = Field(..., ge=0)

    financial_goal: str


# ==========================================================
# Engineered Features
# (Generated from FinancialProfileData)
# ==========================================================

class FinancialHealthFeatures(BaseModel):

    savings_rate: float

    expense_ratio: float

    disposable_income: float

    debt_to_income_ratio: float

    emergency_fund_months: float

    investment_ratio: float

    insurance_ratio: float

    net_monthly_cashflow: float


# ==========================================================
# ML Prediction Result
# ==========================================================

class PredictionResult(BaseModel):

    report_id: str

    ml_health_score: float

    health_status: str

    model_version: str

    strengths: list[str]

    weaknesses: list[str]

    risks: list[str]

    recommendations: list[str]

    ai_summary: str | None = None

# ==========================================================
# Final Financial Health Report
# ==========================================================

class FinancialHealthReport(BaseModel):

    prediction: PredictionResult

    features: FinancialHealthFeatures

    ai_summary: Optional[str] = None

    strengths: list[str] = []

    weaknesses: list[str] = []

    risks: list[str] = []

    recommendations: list[str] = []

    next_steps: list[str] = []



class HistoryReport(BaseModel):

    id: str

    created_at: datetime

    ml_health_score: float

    final_health_score: float

    rule_health_score: float

    health_status: str

    ai_summary: str | None = None


class HistoryReportList(BaseModel):

    reports: list[HistoryReport]