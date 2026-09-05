from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
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
    home_loan_interest: float = Field(
        default=0.0,
        ge=0,
        description="Section 24(b) Home loan interest on self-occupied property (Old Regime only). Capped at ₹2,00,000."
    )
    field_sources: Optional[Dict[str, str]] = Field(
        default=None,
        description="Field data provenance mapping (e.g. FINSTACK_PROFILE, USER_ENTERED)"
    )
    user_overrides: Optional[List[str]] = Field(
        default=None,
        description="List of field names manually overridden by user"
    )
    missing_fields: Optional[List[str]] = Field(
        default=None,
        description="List of fields noted as unentered or missing"
    )
    is_user_confirmed: bool = Field(
        default=True,
        description="Indicates whether all inputs (especially document extracted) were reviewed/confirmed by human user"
    )
    document_id: Optional[str] = Field(
        default=None,
        description="Optional Document Vault reference ID if input derived from confirmed document"
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
# COMPARISON SUMMARY & INSIGHTS
# =============================================================

class RegimeComparisonSummary(BaseModel):
    recommended_regime: str
    recommendation_message: str
    estimated_tax_difference: float
    old_regime_tax: float
    new_regime_tax: float
    old_applicable_deductions: float
    new_applicable_deductions: float
    taxable_income_old: float
    taxable_income_new: float
    is_equal: bool = False


# =============================================================
# TRANSPARENCY & TRUST SCHEMAS (MODULE 4)
# =============================================================

class CalculationFlowStep(BaseModel):
    step_key: str
    step_name: str
    old_regime_value: float
    new_regime_value: float
    difference: float
    description: str
    formula_hint: Optional[str] = None


class DeductionBreakdownItem(BaseModel):
    section: str
    label: str
    declared_amount: float
    considered_amount: float
    statutory_limit: Optional[float] = None
    applicable_regime: str
    why_included: str
    why_not_included: Optional[str] = None


class WhyThisRegimeExplanation(BaseModel):
    headline: str
    recommended_regime: str
    estimated_savings: float
    primary_driver: str
    old_regime_deductions_total: float
    breakeven_deduction_estimate: Optional[float] = None
    bullets: List[str]


class TrustMetadata(BaseModel):
    financial_year: str
    recommended_regime: str
    data_sources: Dict[str, str]
    user_overrides: List[str]
    assumptions: List[str]
    missing_information: List[str]
    disclaimer: str


# =============================================================
# WHAT-IF SCENARIOS & TAX OPPORTUNITIES (MODULE 5)
# =============================================================

class ScenarioOverrides(BaseModel):
    salary_change_amount: Optional[float] = Field(default=None, description="Delta (+/-) applied to gross salary")
    new_gross_salary: Optional[float] = Field(default=None, ge=0, description="Direct override for gross salary")
    additional_80c: Optional[float] = Field(default=0.0, ge=0, description="Simulated additional 80C investment")
    additional_80d: Optional[float] = Field(default=0.0, ge=0, description="Simulated additional 80D health insurance")
    home_loan_interest: Optional[float] = Field(default=None, ge=0, description="Section 24(b) home loan interest override/simulated")
    forced_regime: Optional[str] = Field(default=None, description="Force comparison against 'OLD' or 'NEW' regime")


class TaxWhatIfRequest(BaseModel):
    base_input: TaxCalculateRequest
    scenario_type: str = Field(
        ...,
        description="Type of what-if scenario: 'salary_change', 'additional_deductions', 'home_loan_interest', 'regime_switch', or 'custom'"
    )
    scenario_title: Optional[str] = None
    overrides: ScenarioOverrides


class ScenarioResultSnapshot(BaseModel):
    regime_name: str
    gross_income: float
    standard_deduction: float
    total_deductions: float
    taxable_income: float
    tax_on_income: float
    rebate_87a: float
    surcharge: float
    health_and_education_cess: float
    total_tax: float
    effective_tax_rate: float
    recommended_regime: str


class TaxWhatIfDelta(BaseModel):
    tax_difference: float
    taxable_income_difference: float
    effective_rate_difference: float
    summary_sentence: str
    explanation_points: List[str]


class TaxOpportunityItem(BaseModel):
    id: str
    title: str
    section: str
    status: str  # 'potentially_missing', 'missing_information', 'eligible_gap', 'optimization'
    why_it_appears: str
    potential_tax_impact: float
    missing_fields_required: List[str]
    cautionary_note: str


class TaxWhatIfResponse(BaseModel):
    scenario_type: str
    scenario_title: str
    current: ScenarioResultSnapshot
    scenario: ScenarioResultSnapshot
    delta: TaxWhatIfDelta
    opportunities: List[TaxOpportunityItem]
    does_mutate_profile: bool = False
    disclaimer: str = (
        "What-if simulations are temporary educational projections calculated by the FinStack tax engine. "
        "They do not alter your profile or saved tax records and do not constitute financial advice."
    )


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
    recommendation_message: Optional[str] = None
    comparison_summary: Optional[RegimeComparisonSummary] = None
    explanation: Optional[List[str]] = None
    opportunity_insights: Optional[List[str]] = None
    opportunities: Optional[List[TaxOpportunityItem]] = None
    calculation_flow: Optional[List[CalculationFlowStep]] = None
    deduction_breakdown: Optional[List[DeductionBreakdownItem]] = None
    why_this_regime: Optional[WhyThisRegimeExplanation] = None
    trust_metadata: Optional[TrustMetadata] = None
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
    gross_income: float = 0.0
    recommended_regime: str
    estimated_tax: float = 0.0
    estimated_difference: float = 0.0
    # Retain for backward compatibility with existing tests
    old_regime_total_tax: float = 0.0
    new_regime_total_tax: float = 0.0
    estimated_tax_savings: float = 0.0
    created_at: datetime


class TaxAssessmentHistoryResponse(BaseModel):
    assessments: List[TaxAssessmentSummary]


class TaxAssessmentComparisonRequest(BaseModel):
    assessment_id_1: str
    assessment_id_2: str


class TaxAssessmentComparisonDelta(BaseModel):
    gross_income_diff: float
    taxable_income_diff: float
    tax_difference: float
    regime_transition: str
    summary_notes: List[str]



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
    home_loan_interest: float = 0.0
    old_regime: RegimeBreakdownResponse
    new_regime: RegimeBreakdownResponse
    recommended_regime: str
    estimated_tax_savings: float
    recommendation_message: Optional[str] = None
    comparison_summary: Optional[RegimeComparisonSummary] = None
    explanation: Optional[List[str]] = None
    opportunity_insights: Optional[List[str]] = None
    opportunities: Optional[List[TaxOpportunityItem]] = None
    calculation_flow: Optional[List[CalculationFlowStep]] = None
    deduction_breakdown: Optional[List[DeductionBreakdownItem]] = None
    why_this_regime: Optional[WhyThisRegimeExplanation] = None
    trust_metadata: Optional[TrustMetadata] = None
    created_at: datetime
    disclaimer: str = (
        "This is an estimate based on the information provided and applicable "
        "tax rules for the selected financial year. It is not an official tax "
        "assessment and does not constitute professional tax advice."
    )


class TaxAssessmentComparisonResponse(BaseModel):
    assessment_1: TaxAssessmentDetailResponse
    assessment_2: TaxAssessmentDetailResponse
    delta: TaxAssessmentComparisonDelta


class TaxJourneyMilestone(BaseModel):
    has_assessment: bool
    latest_assessment_id: Optional[str] = None
    financial_year: Optional[str] = None
    gross_income: Optional[float] = None
    estimated_tax: Optional[float] = None
    recommended_regime: Optional[str] = None
    estimated_savings: Optional[float] = None
    milestone_status: str
    action_deep_link: str = "/tax-estimator"
    updated_at: Optional[datetime] = None
    notes: str = "Tax Estimator remains an independent modular component within FinStack."



# =============================================================
# TAX EDUCATION & KNOWLEDGE BASE SCHEMAS (MODULE 6)
# =============================================================

class TaxSlabDisplay(BaseModel):
    slab_range: str
    rate_percent: float
    tax_rate_label: str


class RegimeRulesSummary(BaseModel):
    regime_name: str
    statutory_basis: str
    is_default: bool
    standard_deduction: float
    rebate_87a_limit: float
    rebate_87a_max: float
    slabs: List[TaxSlabDisplay]
    deductions_allowed: List[str]
    key_features: List[str]


class StatutoryDeductionLimit(BaseModel):
    code: str
    name: str
    statutory_section: str
    limit_amount: float
    applicable_regime: str
    description: str
    eligible_instruments: List[str]


class GlossaryTerm(BaseModel):
    term: str
    short_definition: str
    detailed_explanation: str
    category: str
    statutory_reference: Optional[str] = None
    example: Optional[str] = None


class CalculationFlowStage(BaseModel):
    stage_number: int
    title: str
    subtitle: str
    description: str
    formula: str


class TaxEducationResponse(BaseModel):
    financial_year: str
    assessment_year: str
    fy_date_span: str
    ay_date_span: str
    standard_deduction: float
    cess_rate_percent: float
    new_regime: RegimeRulesSummary
    old_regime: RegimeRulesSummary
    deduction_limits: List[StatutoryDeductionLimit]
    calculation_flow_stages: List[CalculationFlowStage]
    glossary: List[GlossaryTerm]
    disclaimer: str


# =============================================================
# NORMALIZED TAX INPUT MODELS (re-exported)
# =============================================================

from .normalized_input import (
    TaxInputSource,
    FieldProvenance,
    NormalizedTaxInput,
    ProfileDefaultsResponse,
)

from .document_boundary import (
    DocumentType,
    ReviewStatus,
    ExtractedFieldCandidate,
    DocumentStagedPayload,
    FieldReviewDecision,
    DocumentReviewConfirmationRequest,
    ConfirmedDocumentTaxInputResponse,
)

