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
from typing import Optional, Dict, Any, Union, List
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
        vault_records: Optional[List[Dict[str, Any]]] = None,
        financial_year: str = "2024-25"
    ) -> NormalizedTaxInput:
        """
        Extracts candidate fields from user profiles AND confirmed Document Vault records.
        Prioritizes Document Vault data over basic profile estimates.
        """
        user_profile = user_profile or {}
        financial_profile = financial_profile or {}
        vault_records = vault_records or []

        field_sources: Dict[str, FieldProvenance] = {}
        
        # Base defaults
        age = 30
        gross_salary = 0.0
        other_income = 0.0
        deduction_80c = 0.0
        deduction_80d = 0.0
        deduction_80tta = 0.0

        field_sources["financial_year"] = FieldProvenance(
            source=TaxInputSource.DEFAULT, raw_value=financial_year, confidence=1.0, notes="Default FY"
        )

        # 1. Age (From User Profile)
        dob = user_profile.get("date_of_birth")
        calculated_age = cls.calculate_age_from_dob(dob)
        if calculated_age is not None:
            age = calculated_age
            field_sources["age"] = FieldProvenance(
                source=TaxInputSource.FINSTACK_PROFILE, raw_value=str(dob), confidence=1.0, notes=f"Calculated from DOB"
            )
        else:
            field_sources["age"] = FieldProvenance(
                source=TaxInputSource.DEFAULT, raw_value=None, confidence=1.0, notes="Default age 30"
            )

        # 2. Parse Document Vault Records (High Priority)
        for record in vault_records:
            r_type = record.get("record_type")
            data = record.get("record_data", {})

            if r_type == "salary_slip" and data.get("gross_salary"):
                gross_salary = float(data["gross_salary"]) * 12 # Assuming monthly slip for prototype
                field_sources["gross_salary"] = FieldProvenance(
                    source=TaxInputSource.DOCUMENT_EXTRACTED, raw_value=gross_salary, confidence=0.95, 
                    notes="Annualized from verified Salary Slip in Document Vault"
                )
            
            elif r_type == "itr":
                if data.get("gross_total_income"):
                    gross_salary = float(data["gross_total_income"])
                    field_sources["gross_salary"] = FieldProvenance(
                        source=TaxInputSource.DOCUMENT_EXTRACTED, raw_value=gross_salary, confidence=0.99, 
                        notes="Extracted directly from verified ITR Document"
                    )

            elif r_type == "investment" and data.get("total_amount"):
                deduction_80c = min(150000.0, float(data["total_amount"]))
                field_sources["deduction_80c"] = FieldProvenance(
                    source=TaxInputSource.DOCUMENT_EXTRACTED, raw_value=deduction_80c, confidence=0.90, 
                    notes="Sourced from verified Investment Proofs"
                )
                
            elif r_type == "insurance" and data.get("premium"):
                deduction_80d = min(25000.0, float(data["premium"]))
                field_sources["deduction_80d"] = FieldProvenance(
                    source=TaxInputSource.DOCUMENT_EXTRACTED, raw_value=deduction_80d, confidence=0.95, 
                    notes="Sourced from verified Insurance Premium Receipt"
                )

        # 3. Fallback to Financial Profile (Low Priority) if Vault didn't have data
        if "gross_salary" not in field_sources and financial_profile.get("monthly_income"):
            gross_salary = float(financial_profile["monthly_income"]) * 12.0
            field_sources["gross_salary"] = FieldProvenance(
                source=TaxInputSource.FINSTACK_PROFILE, raw_value=gross_salary, confidence=0.80, 
                notes="Estimated from basic FinStack profile monthly income."
            )
        elif "gross_salary" not in field_sources:
             field_sources["gross_salary"] = FieldProvenance(
                source=TaxInputSource.DEFAULT, raw_value=None, confidence=1.0, notes="No salary data found."
            )

        if "deduction_80c" not in field_sources:
             field_sources["deduction_80c"] = FieldProvenance(source=TaxInputSource.DEFAULT, raw_value=None, confidence=1.0, notes="No 80C data found.")
        
        if "deduction_80d" not in field_sources:
             field_sources["deduction_80d"] = FieldProvenance(source=TaxInputSource.DEFAULT, raw_value=None, confidence=1.0, notes="No 80D data found.")
             
        field_sources["other_income"] = FieldProvenance(source=TaxInputSource.DEFAULT, raw_value=0.0, confidence=1.0, notes="No other income found.")
        field_sources["deduction_80tta"] = FieldProvenance(source=TaxInputSource.DEFAULT, raw_value=0.0, confidence=1.0, notes="No 80TTA data found.")

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
