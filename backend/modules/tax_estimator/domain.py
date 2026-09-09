from pydantic import BaseModel, Field, field_validator
from typing import Optional
from decimal import Decimal

class TaxEstimatorInput(BaseModel):
    financial_year: str = Field(..., description="Financial year (e.g., '2024-25')")
    age: int = Field(default=30, ge=0, le=120, description="Age of the taxpayer")
    gross_salary: Decimal = Field(default=Decimal('0.0'), ge=Decimal('0.0'))
    other_income: Decimal = Field(default=Decimal('0.0'), ge=Decimal('0.0'))
    
    # Deductions (mostly applicable to Old Regime)
    deduction_80c: Decimal = Field(default=Decimal('0.0'), ge=Decimal('0.0'), description="Section 80C deductions")
    deduction_80d: Decimal = Field(default=Decimal('0.0'), ge=Decimal('0.0'), description="Section 80D deductions")
    deduction_80tta: Decimal = Field(default=Decimal('0.0'), ge=Decimal('0.0'), description="Section 80TTA deductions")
    home_loan_interest: Decimal = Field(default=Decimal('0.0'), ge=Decimal('0.0'), description="Section 24(b) Home loan interest")
    
    @field_validator('gross_salary', 'other_income', 'deduction_80c', 'deduction_80d', 'deduction_80tta', 'home_loan_interest', mode='before')
    @classmethod
    def validate_monetary_values(cls, v):
        if v is None:
            return Decimal('0.0')
        val = Decimal(str(v))
        if val < 0:
            raise ValueError("Monetary values cannot be negative")
        return val

class RegimeCalculationResult(BaseModel):
    regime_name: str
    gross_income: Decimal
    standard_deduction: Decimal
    total_chapter_vi_a_deductions: Decimal
    taxable_income: Decimal
    tax_on_income: Decimal
    rebate_87a: Decimal
    tax_after_rebate: Decimal
    surcharge: Decimal
    health_and_education_cess: Decimal
    total_tax_liability: Decimal

class TaxCalculationResult(BaseModel):
    financial_year: str
    old_regime: RegimeCalculationResult
    new_regime: RegimeCalculationResult
    recommended_regime: str
    tax_savings: Decimal
