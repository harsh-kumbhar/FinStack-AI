from datetime import datetime
from typing import List, Optional, Dict

from pydantic import BaseModel, Field


# ==========================================================
# Raw Financial Profile
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
# Financial Metric
# ==========================================================

class FinancialMetric(BaseModel):

    name: str

    value: float | int

    unit: str

    status: str

    severity: str

    recommended: str

    description: str


# ==========================================================
# Recommendation
# ==========================================================

class Recommendation(BaseModel):

    id: str

    title: str

    priority: str

    current_value: str

    recommended_value: str

    reason: str

    impact: str


# ==========================================================
# Persona
# ==========================================================

class FinancialPersona(BaseModel):

    title: str

    emoji: str

    description: str

    strength: str

    focus_area: str

    risk_level: str


# ==========================================================
# Prediction Result
# ==========================================================

class PredictionResult(BaseModel):

    report_id: str

    ml_health_score: float

    health_status: str

    model_version: str

    metrics: Dict[str, FinancialMetric]

    score_breakdown: Dict[str, int]

    persona: FinancialPersona

    strengths: List[str]

    weaknesses: List[str]

    risks: List[str]

    recommendations: List[Recommendation]

    ai_summary: Optional[str] = None


# ==========================================================
# Final Financial Report
# ==========================================================

class FinancialHealthReport(BaseModel):

    prediction: PredictionResult

    features: FinancialHealthFeatures

    ai_summary: Optional[str] = None

    strengths: List[str] = []

    weaknesses: List[str] = []

    risks: List[str] = []

    recommendations: List[Recommendation] = []

    next_steps: List[str] = []


# ==========================================================
# History
# ==========================================================

class HistoryReport(BaseModel):

    id: str

    created_at: datetime

    ml_health_score: float

    final_health_score: float

    rule_health_score: float

    health_status: str

    ai_summary: Optional[str] = None


class HistoryReportList(BaseModel):

    reports: List[HistoryReport]

class ChatRequest(BaseModel):
    question: str
    report: dict


class ChatResponse(BaseModel):
    answer: str

class PDFReportRequest(BaseModel):
    report: PredictionResult