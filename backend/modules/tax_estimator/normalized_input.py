"""
Normalized Tax Input Layer
===========================
Reconciles multiple data sources into a canonical, normalized tax input:
1. FINSTACK_PROFILE: Pre-filled from user_profile and financial_profile
2. USER_ENTERED: Explicitly input or overridden by the taxpayer
3. DOCUMENT_EXTRACTED: Extracted via OCR/document intelligence (Form 16, ITR, Salary Slip)
4. DEFAULT: Safe fallback defaults

Precedence hierarchy:
USER_ENTERED > DOCUMENT_EXTRACTED > FINSTACK_PROFILE > DEFAULT

Critical semantic rules:
- financial_profile.monthly_income is monthly; annualized as (monthly_income * 12).
  Marked with confidence 0.80 since bonuses/allowances/net-vs-gross may differ.
- financial_profile.investments is cumulative portfolio wealth, NOT annual 80C flow.
  Does NOT map directly to deduction_80c.
- financial_profile.insurance_cover is sum assured (life/term), NOT health premium.
  Does NOT map directly to deduction_80d.
- user_profile.date_of_birth is used to accurately compute the taxpayer's age.
"""

from enum import Enum
from typing import Optional, Dict, Any, Union
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator

from .domain import TaxEstimatorInput


class TaxInputSource(str, Enum):
    FINSTACK_PROFILE = "FINSTACK_PROFILE"
    USER_ENTERED = "USER_ENTERED"
    DOCUMENT_EXTRACTED = "DOCUMENT_EXTRACTED"
    DEFAULT = "DEFAULT"


class FieldProvenance(BaseModel):
    """Metadata tracking the origin and confidence of each normalized input field."""
    source: TaxInputSource = TaxInputSource.DEFAULT
    raw_value: Optional[Any] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    notes: Optional[str] = None


class NormalizedTaxInput(BaseModel):
    """
    Canonical normalized input representing all tax calculation variables
    together with source provenance for auditability and transparency.
    """
    financial_year: str = Field(default="2024-25", description="Financial year")
    age: int = Field(default=30, ge=0, le=120, description="Taxpayer age in years")
    gross_salary: float = Field(default=0.0, ge=0.0, description="Annual gross salary income in INR")
    other_income: float = Field(default=0.0, ge=0.0, description="Annual other income in INR")
    deduction_80c: float = Field(default=0.0, ge=0.0, description="Section 80C deductions in INR")
    deduction_80d: float = Field(default=0.0, ge=0.0, description="Section 80D health insurance premium in INR")
    deduction_80tta: float = Field(default=0.0, ge=0.0, description="Section 80TTA savings interest deduction in INR")
    
    # Provenance tracking for each candidate field
    field_sources: Dict[str, FieldProvenance] = Field(default_factory=dict)

    @field_validator('gross_salary', 'other_income', 'deduction_80c', 'deduction_80d', 'deduction_80tta', mode='before')
    @classmethod
    def validate_non_negative(cls, v):
        if v is None:
            return 0.0
        val = float(v)
        if val < 0:
            raise ValueError("Monetary values cannot be negative")
        return val

    def to_domain_input(self) -> TaxEstimatorInput:
        """Converts normalized input into the authoritative domain engine input model."""
        return TaxEstimatorInput(
            financial_year=self.financial_year,
            age=self.age,
            gross_salary=Decimal(str(self.gross_salary)),
            other_income=Decimal(str(self.other_income)),
            deduction_80c=Decimal(str(self.deduction_80c)),
            deduction_80d=Decimal(str(self.deduction_80d)),
            deduction_80tta=Decimal(str(self.deduction_80tta)),
        )


class ProfileDefaultsResponse(BaseModel):
    """
    API Response model exposing profile-derived pre-fill values and provenance.
    Allows frontend to present intelligent defaults without hardcoding calculations.
    """
    financial_year: str
    age: int
    gross_salary: float
    other_income: float
    deduction_80c: float
    deduction_80d: float
    deduction_80tta: float
    has_profile_data: bool
    field_sources: Dict[str, FieldProvenance]
    disclaimer: str = (
        "Pre-filled values are estimates derived from your FinStack profile. "
        "Please review and verify all values before calculating your tax."
    )


class TaxInputNormalizer:
    """
    Reconciliation engine for normalizing tax inputs from multiple sources
    while enforcing strict semantic checks and precedence rules.
    """

    @staticmethod
    def calculate_age_from_dob(dob: Optional[Union[str, date]], ref_date: Optional[date] = None) -> Optional[int]:
        """Calculates age in whole years from date of birth."""
        if not dob:
            return None
        if ref_date is None:
            ref_date = date.today()
        if isinstance(dob, str):
            try:
                dob = datetime.strptime(dob[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                return None
        if not isinstance(dob, date):
            return None

        years = ref_date.year - dob.year
        if (ref_date.month, ref_date.day) < (dob.month, dob.day):
            years -= 1
        return max(0, min(120, years))

    @classmethod
    def normalize_from_profiles(
        cls,
        user_profile: Optional[Dict[str, Any]] = None,
        financial_profile: Optional[Dict[str, Any]] = None,
        financial_year: str = "2024-25"
    ) -> NormalizedTaxInput:
        """
        Extracts candidate fields from user_profile and financial_profile.
        Adheres strictly to semantic verification:
        - Annualizes monthly_income to estimate annual gross salary.
        - Avoids semantic corruption: does NOT map cumulative portfolio investments to 80C.
        - Avoids semantic corruption: does NOT map life sum assured to 80D.
        - Computes age from date_of_birth.
        """
        user_profile = user_profile or {}
        financial_profile = financial_profile or {}

        field_sources: Dict[str, FieldProvenance] = {}
        has_any_data = bool(user_profile or financial_profile)

        # 1. Financial Year
        field_sources["financial_year"] = FieldProvenance(
            source=TaxInputSource.DEFAULT,
            raw_value=financial_year,
            confidence=1.0,
            notes="Default supported financial year"
        )

        # 2. Age / Date of Birth
        dob = user_profile.get("date_of_birth")
        calculated_age = cls.calculate_age_from_dob(dob)
        if calculated_age is not None:
            age = calculated_age
            field_sources["age"] = FieldProvenance(
                source=TaxInputSource.FINSTACK_PROFILE,
                raw_value=str(dob),
                confidence=1.0,
                notes=f"Calculated from date of birth ({dob}) in user profile"
            )
        else:
            age = 30
            field_sources["age"] = FieldProvenance(
                source=TaxInputSource.DEFAULT,
                raw_value=None,
                confidence=1.0,
                notes="Default age 30 (no date of birth found in profile)"
            )

        # 3. Gross Salary (Monthly Income -> Annualized)
        raw_monthly_income = financial_profile.get("monthly_income")
        if raw_monthly_income is not None and float(raw_monthly_income) > 0:
            monthly_val = float(raw_monthly_income)
            gross_salary = round(monthly_val * 12.0, 2)
            field_sources["gross_salary"] = FieldProvenance(
                source=TaxInputSource.FINSTACK_PROFILE,
                raw_value=monthly_val,
                confidence=0.80,
                notes=(
                    f"Annualized estimate (₹{monthly_val:,.2f}/month × 12) from FinStack financial profile. "
                    "Verify against your Form 16 / salary slip."
                )
            )
        else:
            gross_salary = 0.0
            field_sources["gross_salary"] = FieldProvenance(
                source=TaxInputSource.DEFAULT,
                raw_value=None,
                confidence=1.0,
                notes="Default 0.0 (no monthly income recorded in profile)"
            )

        # 4. Other Income
        field_sources["other_income"] = FieldProvenance(
            source=TaxInputSource.DEFAULT,
            raw_value=0.0,
            confidence=1.0,
            notes="Default 0.0. Enter interest or other non-salary taxable income if applicable."
        )
        other_income = 0.0

        # 5. Section 80C Deductions (Semantic check: portfolio vs annual contribution)
        raw_investments = financial_profile.get("investments")
        if raw_investments is not None and float(raw_investments) > 0:
            inv_val = float(raw_investments)
            # Semantic separation: do NOT blindly set deduction_80c = inv_val
            field_sources["deduction_80c"] = FieldProvenance(
                source=TaxInputSource.DEFAULT,
                raw_value=inv_val,
                confidence=0.50,
                notes=(
                    f"Profile records ₹{inv_val:,.2f} total portfolio investments, but Section 80C requires "
                    "eligible contributions made during this financial year (capped at ₹1,50,000). Please enter FY contributions."
                )
            )
        else:
            field_sources["deduction_80c"] = FieldProvenance(
                source=TaxInputSource.DEFAULT,
                raw_value=None,
                confidence=1.0,
                notes="Default 0.0. Enter eligible Section 80C contributions (PPF, ELSS, EPF, etc.)."
            )
        deduction_80c = 0.0

        # 6. Section 80D Deductions (Semantic check: life cover vs health premium)
        raw_insurance = financial_profile.get("insurance_cover")
        if raw_insurance is not None and float(raw_insurance) > 0:
            ins_val = float(raw_insurance)
            # Semantic separation: sum assured is NOT health premium
            field_sources["deduction_80d"] = FieldProvenance(
                source=TaxInputSource.DEFAULT,
                raw_value=ins_val,
                confidence=0.50,
                notes=(
                    f"Profile records ₹{ins_val:,.2f} life/term insurance cover (sum assured). Section 80D requires "
                    "health insurance premium paid (capped at ₹25,000 for non-seniors). Please enter annual health premium."
                )
            )
        else:
            field_sources["deduction_80d"] = FieldProvenance(
                source=TaxInputSource.DEFAULT,
                raw_value=None,
                confidence=1.0,
                notes="Default 0.0. Enter medical insurance premium paid."
            )
        deduction_80d = 0.0

        # 7. Section 80TTA Deductions
        field_sources["deduction_80tta"] = FieldProvenance(
            source=TaxInputSource.DEFAULT,
            raw_value=None,
            confidence=1.0,
            notes="Default 0.0. Enter savings account interest deduction (capped at ₹10,000)."
        )
        deduction_80tta = 0.0

        return NormalizedTaxInput(
            financial_year=financial_year,
            age=age,
            gross_salary=gross_salary,
            other_income=other_income,
            deduction_80c=deduction_80c,
            deduction_80d=deduction_80d,
            deduction_80tta=deduction_80tta,
            field_sources=field_sources,
        )

    @classmethod
    def merge_inputs(
        cls,
        base: NormalizedTaxInput,
        user_inputs: Optional[Dict[str, Any]] = None,
        document_inputs: Optional[Dict[str, Any]] = None,
    ) -> NormalizedTaxInput:
        """
        Applies strict precedence:
        USER_ENTERED > DOCUMENT_EXTRACTED > FINSTACK_PROFILE > DEFAULT
        """
        user_inputs = user_inputs or {}
        document_inputs = document_inputs or {}

        merged_data = base.model_dump()
        sources = dict(base.field_sources)

        # Fields subject to merging
        candidate_fields = [
            "financial_year",
            "age",
            "gross_salary",
            "other_income",
            "deduction_80c",
            "deduction_80d",
            "deduction_80tta",
        ]

        # 1. Apply DOCUMENT_EXTRACTED (lower priority than USER_ENTERED)
        for field in candidate_fields:
            if field in document_inputs and document_inputs[field] is not None:
                val = document_inputs[field]
                merged_data[field] = val
                sources[field] = FieldProvenance(
                    source=TaxInputSource.DOCUMENT_EXTRACTED,
                    raw_value=val,
                    confidence=0.95,
                    notes="Extracted from uploaded tax document (e.g. Form 16 / Salary Slip)"
                )

        # 2. Apply USER_ENTERED (highest priority)
        for field in candidate_fields:
            if field in user_inputs and user_inputs[field] is not None:
                val = user_inputs[field]
                merged_data[field] = val
                sources[field] = FieldProvenance(
                    source=TaxInputSource.USER_ENTERED,
                    raw_value=val,
                    confidence=1.0,
                    notes="Directly entered or overridden by user"
                )

        merged_data["field_sources"] = sources
        return NormalizedTaxInput(**merged_data)
