from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


# =============================================================
# API REQUEST SCHEMA
# =============================================================

class TaxCalculateRequest(BaseModel):
    """
    API request body for POST /tax-estimator/calculate.
    Fields correspond exactly to the inputs supported by the
    V1 calculation engine. No unsupported fields are accepted.
    """
    financial_year: str = Field(
        ...,
        description="Financial year string, e.g. '2024-25'",
        examples=["2024-25"]
    )
    gross_salary: float = Field(
        default=0.0,
        ge=0,
        description="Annual gross salary income in INR"
    )
    other_income: float = Field(
        default=0.0,
        ge=0,
        description="Annual other income (e.g. savings interest) in INR"
    )
    deduction_80c: float = Field(
        default=0.0,
        ge=0,
        description="Section 80C investments (Old Regime only). Capped at ₹1,50,000."
    )
    deduction_80d: float = Field(
        default=0.0,
        ge=0,
        description="Section 80D health insurance premium (Old Regime only). Capped at ₹25,000."
    )
    deduction_80tta: float = Field(
        default=0.0,
        ge=0,
        description="Section 80TTA savings interest (Old Regime only). Capped at ₹10,000."
    )


# =============================================================
# REGIME BREAKDOWN SCHEMA (nested in response)
# =============================================================

class RegimeBreakdownResponse(BaseModel):
    regime_name: str
    gross_income: float
    standard_deduction: float
    total_chapter_vi_a_deductions: float
    taxable_income: float
    tax_on_income: float
    rebate_87a: float
    tax_after_rebate: float
    surcharge: float
    health_and_education_cess: float
    total_tax_liability: float


# =============================================================
# API RESPONSE SCHEMA
# =============================================================

class TaxCalculateResponse(BaseModel):
    """
    Structured API response including full breakdown for both regimes.
    DISCLAIMER: This is an estimate only and does not constitute an
    official tax assessment or professional tax advice.
    """
    assessment_id: str
    financial_year: str
    old_regime: RegimeBreakdownResponse
    new_regime: RegimeBreakdownResponse
    recommended_regime: str
    estimated_tax_savings: float
    disclaimer: str = (
        "This is an estimate based on the information provided and applicable "
        "tax rules for the selected financial year. It is not an official tax "
        "assessment and does not constitute professional tax advice."
    )


# =============================================================
# HISTORY LIST ITEM
# =============================================================

class TaxAssessmentSummary(BaseModel):
    id: str
    financial_year: str
    old_regime_total_tax: float
    new_regime_total_tax: float
    recommended_regime: str
    estimated_tax_savings: float
    created_at: datetime


class TaxAssessmentHistoryResponse(BaseModel):
    assessments: List[TaxAssessmentSummary]


# =============================================================
# ASSESSMENT DETAIL RESPONSE (GET by ID)
# =============================================================

class TaxAssessmentDetailResponse(BaseModel):
    id: str
    financial_year: str
    gross_salary: float
    other_income: float
    deduction_80c: float
    deduction_80d: float
    deduction_80tta: float
    old_regime: RegimeBreakdownResponse
    new_regime: RegimeBreakdownResponse
    recommended_regime: str
    estimated_tax_savings: float
    created_at: datetime
    disclaimer: str = (
        "This is an estimate based on the information provided and applicable "
        "tax rules for the selected financial year. It is not an official tax "
        "assessment and does not constitute professional tax advice."
    )
