"""
Tax Estimator Service Layer
Handles authenticated context, calculation invocation, persistence, and retrieval.
The deterministic calculation engine remains independent of this layer.
Architecture: Router → Service → Engine → Rules
               Service → Supabase (persistence)
"""
from decimal import Decimal
from typing import Optional, Dict, List
from fastapi import HTTPException

from common.database import supabase
from modules.tax_estimator.engine import calculate_tax
from modules.tax_estimator.domain import TaxEstimatorInput, RegimeCalculationResult
from modules.tax_estimator.schema import (
    TaxCalculateRequest,
    TaxCalculateResponse,
    RegimeBreakdownResponse,
    RegimeComparisonSummary,
    TaxAssessmentDetailResponse,
    TaxAssessmentSummary,
    TaxAssessmentHistoryResponse,
    ProfileDefaultsResponse,
    CalculationFlowStep,
    DeductionBreakdownItem,
    WhyThisRegimeExplanation,
    TrustMetadata,
    ScenarioOverrides,
    TaxWhatIfRequest,
    ScenarioResultSnapshot,
    TaxWhatIfDelta,
    TaxOpportunityItem,
    TaxWhatIfResponse,
    TaxEducationResponse,
    RegimeRulesSummary,
    TaxSlabDisplay,
    StatutoryDeductionLimit,
    GlossaryTerm,
    CalculationFlowStage,
    TaxAssessmentComparisonRequest,
    TaxAssessmentComparisonDelta,
    TaxAssessmentComparisonResponse,
    TaxJourneyMilestone,
)
from modules.tax_estimator.rules.registry import get_tax_rules
from modules.tax_estimator.document_boundary import (
    DocumentBoundaryService,
    DocumentStagedPayload,
    DocumentReviewConfirmationRequest,
    ConfirmedDocumentTaxInputResponse,
)
from modules.tax_estimator.normalized_input import (
    TaxInputNormalizer,
    NormalizedTaxInput,
    TaxInputSource,
)

TABLE = "tax_assessments"


def _build_comparison_and_insights(result, domain_input):
    """
    Builds non-claimant, educational recommendation messages, regime comparison summary,
    and What-If opportunity simulations using the ONE authoritative calculate_tax engine.
    """
    old = result.old_regime
    new = result.new_regime
    diff = float(result.tax_savings)
    is_equal = (old.total_tax_liability == new.total_tax_liability)

    # Recommendation wording adhering strictly to spec:
    # "New Regime may be more beneficial", never claiming guaranteed savings/liability!
    if is_equal:
        rec_msg = f"Both regimes result in an identical estimated tax liability of ₹{float(new.total_tax_liability):,.2f} for your profile."
    elif result.recommended_regime == "New Regime":
        rec_msg = f"New Regime may be more beneficial based on your current inputs, with an estimated difference of ₹{diff:,.2f}."
    else:
        rec_msg = f"Old Regime may be more beneficial based on your current inputs, with an estimated difference of ₹{diff:,.2f}."

    old_deductions = float(old.standard_deduction + old.total_chapter_vi_a_deductions)
    new_deductions = float(new.standard_deduction)

    comparison_summary = RegimeComparisonSummary(
        recommended_regime=result.recommended_regime,
        recommendation_message=rec_msg,
        estimated_tax_difference=diff,
        old_regime_tax=float(old.total_tax_liability),
        new_regime_tax=float(new.total_tax_liability),
        old_applicable_deductions=old_deductions,
        new_applicable_deductions=new_deductions,
        taxable_income_old=float(old.taxable_income),
        taxable_income_new=float(new.taxable_income),
        is_equal=is_equal,
    )

    # Structured, non-expert friendly explanation
    explanation = []
    if domain_input.gross_salary > Decimal('0'):
        std_ded = float(min(domain_input.gross_salary, Decimal('50000')))
        explanation.append(f"Standard deduction of ₹{std_ded:,.2f} applies to your salary income under both regimes.")

    if old.total_chapter_vi_a_deductions > Decimal('0'):
        c_val = float(min(domain_input.deduction_80c, Decimal('150000')))
        d_val = float(min(domain_input.deduction_80d, Decimal('25000')))
        explanation.append(
            f"Under the Old Regime, you claimed ₹{float(old.total_chapter_vi_a_deductions):,.2f} in Chapter VI-A deductions "
            f"(Section 80C: ₹{c_val:,.2f}, Section 80D: ₹{d_val:,.2f})."
        )
    else:
        explanation.append("Under the Old Regime, no Chapter VI-A deductions (80C / 80D) were claimed.")

    if new.rebate_87a > Decimal('0'):
        explanation.append(f"Under the New Regime, a Section 87A rebate of ₹{float(new.rebate_87a):,.2f} was applied.")
    if old.rebate_87a > Decimal('0'):
        explanation.append(f"Under the Old Regime, a Section 87A rebate of ₹{float(old.rebate_87a):,.2f} was applied.")

    explanation.append("A 4% Health & Education Cess is calculated on the total tax liability after rebate and surcharge.")

    # Opportunity calculations (What-If simulations using the SAME authoritative engine)
    opportunity_insights = []
    if domain_input.gross_salary > Decimal('0'):
        has_maxed = (domain_input.deduction_80c >= Decimal('150000') and domain_input.deduction_80d >= Decimal('25000'))
        if not has_maxed:
            simulated_input = TaxEstimatorInput(
                financial_year=domain_input.financial_year,
                age=domain_input.age,
                gross_salary=domain_input.gross_salary,
                other_income=domain_input.other_income,
                deduction_80c=Decimal('150000'),
                deduction_80d=Decimal('25000'),
                deduction_80tta=domain_input.deduction_80tta,
            )
            sim_res = calculate_tax(simulated_input)
            sim_old_tax = float(sim_res.old_regime.total_tax_liability)
            curr_new_tax = float(new.total_tax_liability)

            if sim_old_tax < curr_new_tax:
                pot_save = curr_new_tax - sim_old_tax
                opportunity_insights.append(
                    f"What-If Opportunity: If you maximize Section 80C (₹1,50,000) and Section 80D (₹25,000) under the Old Regime, "
                    f"your estimated Old Regime tax could decrease to ₹{sim_old_tax:,.2f}, which may save an estimated ₹{pot_save:,.2f} compared to the New Regime."
                )
            else:
                opportunity_insights.append(
                    f"Regime Resilience: Even if you maximize Section 80C (₹1,50,000) and Section 80D (₹25,000) under the Old Regime "
                    f"(estimated Old Regime tax: ₹{sim_old_tax:,.2f}), the New Regime remains more beneficial by an estimated ₹{sim_old_tax - curr_new_tax:,.2f} due to lower baseline slab rates."
                )

    return rec_msg, comparison_summary, explanation, opportunity_insights


def _build_transparency_and_trust(result, domain_input, request: Optional[TaxCalculateRequest] = None):
    """
    Builds the Module 4 Transparency and Trust layer:
    1. Expandable calculation flow:
       Gross Income -> Exemptions/Deductions -> Taxable Income -> Tax Slabs -> Surcharge -> Cess -> Estimated Tax
       (Values produced directly by backend calculation engine; React does not compute tax math).
    2. Deduction breakdown for user's actual situation (considered, limit, why included/excluded, applicable regime).
    3. Deterministic 'Why This Regime?' explanation comparing actual numbers without generic AI or LLMs.
    4. Trust metadata (sources, overrides, assumptions, missing info, disclaimer).
    """
    old = result.old_regime
    new = result.new_regime
    rec = result.recommended_regime
    diff = float(result.tax_savings)
    is_equal = (old.total_tax_liability == new.total_tax_liability)

    # ─────────────────────────────────────────────────────────────
    # 1. Expandable Calculation Flow
    # ─────────────────────────────────────────────────────────────
    old_ded = float(old.standard_deduction + old.total_chapter_vi_a_deductions)
    new_ded = float(new.standard_deduction)

    calculation_flow = [
        CalculationFlowStep(
            step_key="gross_income",
            step_name="1. Gross Total Income",
            old_regime_value=float(old.gross_income),
            new_regime_value=float(new.gross_income),
            difference=0.0,
            description=f"Total gross income from salary (₹{float(domain_input.gross_salary):,.2f}) and other income (₹{float(domain_input.other_income):,.2f}).",
            formula_hint="Gross Salary + Other Taxable Income",
        ),
        CalculationFlowStep(
            step_key="deductions",
            step_name="2. Exemptions & Deductions",
            old_regime_value=old_ded,
            new_regime_value=new_ded,
            difference=abs(old_ded - new_ded),
            description=f"Old Regime: Standard deduction (₹{float(old.standard_deduction):,.2f}) + Chapter VI-A deductions (₹{float(old.total_chapter_vi_a_deductions):,.2f}). New Regime: Standard deduction (₹{float(new.standard_deduction):,.2f}) only.",
            formula_hint="Standard Deduction + Permissible Deductions",
        ),
        CalculationFlowStep(
            step_key="taxable_income",
            step_name="3. Net Taxable Income",
            old_regime_value=float(old.taxable_income),
            new_regime_value=float(new.taxable_income),
            difference=abs(float(old.taxable_income) - float(new.taxable_income)),
            description="Net income subjected to slab tax rates after subtracting permissible deductions.",
            formula_hint="Gross Income − Permissible Deductions",
        ),
        CalculationFlowStep(
            step_key="tax_slabs",
            step_name="4. Tax on Slabs (Pre-Rebate)",
            old_regime_value=float(old.tax_on_income),
            new_regime_value=float(new.tax_on_income),
            difference=abs(float(old.tax_on_income) - float(new.tax_on_income)),
            description="Tax computed across applicable slab rates under the Finance Act 2024 before tax rebates.",
            formula_hint="Sum of (Taxable amount in bracket × Slab rate)",
        ),
        CalculationFlowStep(
            step_key="rebate_87a",
            step_name="5. Section 87A Tax Rebate",
            old_regime_value=float(old.rebate_87a),
            new_regime_value=float(new.rebate_87a),
            difference=abs(float(old.rebate_87a) - float(new.rebate_87a)),
            description="Tax rebate up to ₹25,000 for taxable income <= ₹7,00,000 (New Regime, with marginal relief) or up to ₹12,500 for taxable income <= ₹5,00,000 (Old Regime).",
            formula_hint="Relief u/s 87A",
        ),
        CalculationFlowStep(
            step_key="surcharge",
            step_name="6. Surcharge",
            old_regime_value=float(old.surcharge),
            new_regime_value=float(new.surcharge),
            difference=abs(float(old.surcharge) - float(new.surcharge)),
            description="Applicable surcharge on high taxable incomes exceeding ₹50,00,000.",
            formula_hint="Tax after rebate × Surcharge %",
        ),
        CalculationFlowStep(
            step_key="cess",
            step_name="7. Health & Education Cess (4%)",
            old_regime_value=float(old.health_and_education_cess),
            new_regime_value=float(new.health_and_education_cess),
            difference=abs(float(old.health_and_education_cess) - float(new.health_and_education_cess)),
            description="Mandatory 4% statutory health and education cess applied to aggregate of tax and surcharge.",
            formula_hint="4% × (Tax after rebate + Surcharge)",
        ),
        CalculationFlowStep(
            step_key="total_tax",
            step_name="8. Final Estimated Tax Liability",
            old_regime_value=float(old.total_tax_liability),
            new_regime_value=float(new.total_tax_liability),
            difference=diff,
            description="Final estimated tax liability rounded to the nearest ₹10 as required by Section 288B.",
            formula_hint="Tax + Surcharge + Cess (Rounded to nearest ₹10)",
        ),
    ]

    # ─────────────────────────────────────────────────────────────
    # 2. Deduction Breakdown (Relevant to actual situation)
    # ─────────────────────────────────────────────────────────────
    deduction_breakdown = []

    # Standard Deduction (relevant if gross salary > 0)
    if domain_input.gross_salary > Decimal('0'):
        std_val = float(min(domain_input.gross_salary, Decimal('50000')))
        deduction_breakdown.append(
            DeductionBreakdownItem(
                section="Section 16(ia)",
                label="Standard Deduction",
                declared_amount=float(domain_input.gross_salary),
                considered_amount=std_val,
                statutory_limit=50000.0,
                applicable_regime="Both Regimes",
                why_included="Statutory flat deduction available to all salaried employees against gross salary.",
                why_not_included=None,
            )
        )

    # Section 80C
    if domain_input.deduction_80c > Decimal('0'):
        c_val = float(min(domain_input.deduction_80c, Decimal('150000')))
        deduction_breakdown.append(
            DeductionBreakdownItem(
                section="Section 80C",
                label="Specified Investments (EPF, PPF, ELSS, Life Insurance)",
                declared_amount=float(domain_input.deduction_80c),
                considered_amount=c_val,
                statutory_limit=150000.0,
                applicable_regime="Old Regime Only",
                why_included="Allowed under Old Regime up to the statutory cap of ₹1,50,000.",
                why_not_included="Disallowed under Section 115BAC (New Regime) in exchange for lower baseline slab rates.",
            )
        )

    # Section 80D
    if domain_input.deduction_80d > Decimal('0'):
        d_val = float(min(domain_input.deduction_80d, Decimal('25000')))
        deduction_breakdown.append(
            DeductionBreakdownItem(
                section="Section 80D",
                label="Medical & Health Insurance Premium",
                declared_amount=float(domain_input.deduction_80d),
                considered_amount=d_val,
                statutory_limit=25000.0,
                applicable_regime="Old Regime Only",
                why_included="Allowed under Old Regime for health insurance premiums paid for self and family, capped at ₹25,000.",
                why_not_included="Disallowed under Section 115BAC (New Regime).",
            )
        )

    # Section 80TTA
    if domain_input.deduction_80tta > Decimal('0'):
        tta_val = float(min(domain_input.deduction_80tta, Decimal('10000'), domain_input.other_income))
        deduction_breakdown.append(
            DeductionBreakdownItem(
                section="Section 80TTA",
                label="Savings Bank Account Interest",
                declared_amount=float(domain_input.deduction_80tta),
                considered_amount=tta_val,
                statutory_limit=10000.0,
                applicable_regime="Old Regime Only",
                why_included="Allowed under Old Regime for interest earned on savings bank accounts, capped at ₹10,000 or savings interest earned.",
                why_not_included="Disallowed under Section 115BAC (New Regime).",
            )
        )

    # If no Chapter VI-A deductions were declared, add contextual note
    if (domain_input.deduction_80c == Decimal('0') and
        domain_input.deduction_80d == Decimal('0') and
        domain_input.deduction_80tta == Decimal('0')):
        deduction_breakdown.append(
            DeductionBreakdownItem(
                section="Chapter VI-A (80C, 80D, 80TTA)",
                label="Investments & Health Premium",
                declared_amount=0.0,
                considered_amount=0.0,
                statutory_limit=185000.0,
                applicable_regime="Old Regime Only",
                why_included="No Chapter VI-A deductions declared in your input profile.",
                why_not_included="Without Chapter VI-A deductions declared, taxable income under Old Regime remains unreduced.",
            )
        )

    # ─────────────────────────────────────────────────────────────
    # 3. Deterministic "Why This Regime?" Explanation
    # ─────────────────────────────────────────────────────────────
    bullets = []
    bullets.append(
        "New Regime (Section 115BAC) features lower slab tax rates (5% up to ₹7L, 10% up to ₹10L, 15% up to ₹12L) but disallows Chapter VI-A deductions."
    )
    bullets.append(
        "Old Regime offers standard deduction and Chapter VI-A deductions (80C, 80D, 80TTA), but steeper slab rates (20% above ₹5L, 30% above ₹10L)."
    )

    if is_equal:
        headline = "Both regimes result in an identical estimated tax liability."
        primary_driver = "Section 87A full tax rebate applies equally under both regimes (zero net liability)."
        bullets.append(
            "Your taxable income qualifies for complete tax rebate under Section 87A under both regimes, resulting in ₹0 tax liability."
        )
    elif rec == "New Regime":
        headline = f"New Regime may be more beneficial by an estimated ₹{diff:,.2f}."
        if old.total_chapter_vi_a_deductions == Decimal('0'):
            primary_driver = "Zero Chapter VI-A deductions claimed under Old Regime, making New Regime slab rates more favorable."
        else:
            primary_driver = f"Old Regime deductions claimed (₹{old_ded:,.2f}) are insufficient to overcome New Regime's wider concessional slabs."

        bullets.append(
            f"You claimed ₹{float(old.total_chapter_vi_a_deductions):,.2f} in Chapter VI-A deductions under the Old Regime. This leaves Old Regime taxable income at ₹{float(old.taxable_income):,.2f}."
        )
        if float(old.gross_income) <= 750000.0:
            bullets.append(
                "Under the New Regime, income up to ₹7,50,000 for salaried employees is completely tax-free thanks to the ₹50,000 standard deduction and Section 87A rebate."
            )
        else:
            bullets.append(
                f"The New Regime produces a total tax liability of ₹{float(new.total_tax_liability):,.2f} compared to ₹{float(old.total_tax_liability):,.2f} under the Old Regime."
            )
    else:
        headline = f"Old Regime may be more beneficial by an estimated ₹{diff:,.2f}."
        primary_driver = f"Substantial Chapter VI-A deductions (₹{float(old.total_chapter_vi_a_deductions):,.2f}) lower Old Regime taxable income below the New Regime benefit threshold."
        bullets.append(
            f"Your declared deductions of ₹{float(old.total_chapter_vi_a_deductions):,.2f} combined with standard deduction (₹{float(old.standard_deduction):,.2f}) reduce Old Regime taxable income down to ₹{float(old.taxable_income):,.2f}."
        )
        bullets.append(
            f"This substantial tax base reduction lowers your Old Regime liability to ₹{float(old.total_tax_liability):,.2f}, saving an estimated ₹{diff:,.2f} over the New Regime."
        )

    why_this_regime = WhyThisRegimeExplanation(
        headline=headline,
        recommended_regime=rec,
        estimated_savings=diff,
        primary_driver=primary_driver,
        old_regime_deductions_total=old_ded,
        bullets=bullets,
    )

    # ─────────────────────────────────────────────────────────────
    # 4. Trust Metadata
    # ─────────────────────────────────────────────────────────────
    if request and request.field_sources:
        data_sources = dict(request.field_sources)
    else:
        data_sources = {
            "gross_salary": "USER_ENTERED" if domain_input.gross_salary > Decimal('0') else "DEFAULT",
            "other_income": "USER_ENTERED" if domain_input.other_income > Decimal('0') else "DEFAULT",
            "deduction_80c": "USER_ENTERED" if domain_input.deduction_80c > Decimal('0') else "DEFAULT",
            "deduction_80d": "USER_ENTERED" if domain_input.deduction_80d > Decimal('0') else "DEFAULT",
            "deduction_80tta": "USER_ENTERED" if domain_input.deduction_80tta > Decimal('0') else "DEFAULT",
        }

    if request and request.user_overrides:
        user_overrides = list(request.user_overrides)
    else:
        user_overrides = [f for f, src in data_sources.items() if src == "USER_ENTERED"]

    if request and request.missing_fields:
        missing_info = list(request.missing_fields)
    else:
        missing_info = []
        if domain_input.gross_salary == Decimal('0'):
            missing_info.append("Gross salary was not declared or entered as ₹0.")
        if domain_input.deduction_80c == Decimal('0') and domain_input.deduction_80d == Decimal('0'):
            missing_info.append("No Chapter VI-A deductions (80C / 80D) were declared.")

    assumptions = [
        "Individual taxpayer is a tax resident of India under 60 years of age for FY 2024-25 (AY 2025-26).",
        "Salaried income receives a flat standard deduction of ₹50,000 under Section 16(ia) across both regimes.",
        "Chapter VI-A deductions (Sections 80C, 80D, 80TTA) apply exclusively to the Old Tax Regime.",
        "Section 87A rebate applies up to ₹7,00,000 taxable income under New Regime (with marginal relief) and up to ₹5,00,000 under Old Regime.",
        "Statutory Health & Education Cess of 4% applies to the total tax after rebates plus surcharge.",
        "Final tax liability is rounded to the nearest multiple of ₹10 in accordance with Section 288B.",
        "Unentered exemptions (such as HRA exemption u/s 10(13A), LTA u/s 10(5), Home Loan Interest u/s 24(b)) are assumed to be ₹0 in this estimate."
    ]

    disclaimer = (
        "This estimate is generated for educational and planning purposes only under the Income Tax Act, 1961. "
        "It is not an official tax assessment and does not constitute professional tax or financial advice. "
        "Official tax liability is determined upon filing the Income Tax Return (ITR) with the Income Tax Department."
    )

    trust_metadata = TrustMetadata(
        financial_year=domain_input.financial_year,
        recommended_regime=rec,
        data_sources=data_sources,
        user_overrides=user_overrides,
        assumptions=assumptions,
        missing_information=missing_info,
        disclaimer=disclaimer,
    )

    return calculation_flow, deduction_breakdown, why_this_regime, trust_metadata


def _build_opportunities(result, domain_input: TaxEstimatorInput, request=None) -> List[TaxOpportunityItem]:
    """
    Constructs data-driven, personalized tax planning opportunities based on
    actual taxpayer numbers.
    STRICT COMPLIANCE:
    - Never pushes financial products simply to save tax (includes cautionary notes).
    - Labels missing/unverified items explicitly as 'missing_information' or 'potentially_missing'.
    - Explains exactly why each opportunity appears based on user data.
    - Uses the SAME authoritative calculate_tax engine to evaluate financial impact.
    """
    opportunities: List[TaxOpportunityItem] = []
    gross = domain_input.gross_salary + domain_input.other_income

    # 1. Section 80C Opportunity (EPF, PPF, ELSS, Insurance)
    if gross > Decimal('500000'):
        sim_80c_input = TaxEstimatorInput(
            financial_year=domain_input.financial_year,
            gross_salary=domain_input.gross_salary,
            other_income=domain_input.other_income,
            deduction_80c=Decimal('150000'),
            deduction_80d=domain_input.deduction_80d,
            deduction_80tta=domain_input.deduction_80tta,
            home_loan_interest=domain_input.home_loan_interest,
        )
        sim_80c_res = calculate_tax(sim_80c_input)
        impact_80c = max(0.0, float(result.old_regime.total_tax_liability - sim_80c_res.old_regime.total_tax_liability))

        if domain_input.deduction_80c == Decimal('0'):
            opportunities.append(TaxOpportunityItem(
                id="opp_80c_missing",
                title="Section 80C Tax-Saver Deductions",
                section="Section 80C",
                status="missing_information",
                why_it_appears="You have declared ₹0 in Section 80C deductions. If you make statutory EPF contributions through payroll, PPF, life insurance premiums, or ELSS investments, you may be eligible to deduct up to ₹1,50,000 under the Old Regime.",
                potential_tax_impact=round(impact_80c, 2),
                missing_fields_required=[
                    "Employee Provident Fund (EPF) annual statement / salary slips",
                    "Public Provident Fund (PPF) deposit receipts",
                    "Life insurance premium receipts",
                    "Equity Linked Savings Scheme (ELSS) investment statements",
                ],
                cautionary_note="Do not purchase investment or insurance products solely to reduce tax liability. Most 80C instruments have 3 to 15-year lock-in periods. Ensure all allocations fit your family liquidity needs and overall financial plan.",
            ))
        elif domain_input.deduction_80c < Decimal('150000'):
            headroom = float(Decimal('150000') - domain_input.deduction_80c)
            opportunities.append(TaxOpportunityItem(
                id="opp_80c_headroom",
                title="Section 80C Headroom Utilization",
                section="Section 80C",
                status="eligible_gap",
                why_it_appears=f"You declared ₹{float(domain_input.deduction_80c):,.0f} under Section 80C, leaving ₹{headroom:,.0f} in unutilized headroom against the statutory ₹1,50,000 ceiling.",
                potential_tax_impact=round(impact_80c, 2),
                missing_fields_required=["Documentation for additional qualifying investments up to ₹1,50,000"],
                cautionary_note="Ensure any incremental savings fit your liquidity requirements before committing funds to lock-in products.",
            ))

    # 2. Section 80D Health Insurance Opportunity
    if gross > Decimal('500000'):
        sim_80d_input = TaxEstimatorInput(
            financial_year=domain_input.financial_year,
            gross_salary=domain_input.gross_salary,
            other_income=domain_input.other_income,
            deduction_80c=domain_input.deduction_80c,
            deduction_80d=Decimal('25000'),
            deduction_80tta=domain_input.deduction_80tta,
            home_loan_interest=domain_input.home_loan_interest,
        )
        sim_80d_res = calculate_tax(sim_80d_input)
        impact_80d = max(0.0, float(result.old_regime.total_tax_liability - sim_80d_res.old_regime.total_tax_liability))

        if domain_input.deduction_80d == Decimal('0'):
            opportunities.append(TaxOpportunityItem(
                id="opp_80d_missing",
                title="Section 80D Health Insurance Relief",
                section="Section 80D",
                status="missing_information",
                why_it_appears="No health insurance premium was declared. If you pay health insurance premiums for yourself, spouse, or dependent children, up to ₹25,000 (higher for senior parents) is deductible under the Old Regime.",
                potential_tax_impact=round(impact_80d, 2),
                missing_fields_required=[
                    "Health insurance policy premium payment certificate (Section 80D statement)",
                    "Preventive health check-up receipts (eligible up to ₹5,000 within ₹25,000 cap)",
                ],
                cautionary_note="Health insurance provides essential financial security against medical emergencies. Secure health coverage for adequate protection, never solely for tax deductions.",
            ))
        elif domain_input.deduction_80d < Decimal('25000'):
            headroom_d = float(Decimal('25000') - domain_input.deduction_80d)
            opportunities.append(TaxOpportunityItem(
                id="opp_80d_headroom",
                title="Section 80D Remaining Cap",
                section="Section 80D",
                status="eligible_gap",
                why_it_appears=f"You declared ₹{float(domain_input.deduction_80d):,.0f} under Section 80D. Up to ₹{headroom_d:,.0f} of additional premium or preventive health check-up expense could be deducted under the Old Regime.",
                potential_tax_impact=round(impact_80d, 2),
                missing_fields_required=["Receipts for medical insurance or preventive health check-ups"],
                cautionary_note="Do not purchase extra or duplicate policies merely to exhaust the deduction limit.",
            ))

    # 3. Section 24(b) Home Loan Interest Opportunity
    if gross > Decimal('700000') and domain_input.home_loan_interest == Decimal('0'):
        sim_24b_input = TaxEstimatorInput(
            financial_year=domain_input.financial_year,
            gross_salary=domain_input.gross_salary,
            other_income=domain_input.other_income,
            deduction_80c=domain_input.deduction_80c,
            deduction_80d=domain_input.deduction_80d,
            deduction_80tta=domain_input.deduction_80tta,
            home_loan_interest=Decimal('200000'),
        )
        sim_24b_res = calculate_tax(sim_24b_input)
        impact_24b = max(0.0, float(result.old_regime.total_tax_liability - sim_24b_res.old_regime.total_tax_liability))

        opportunities.append(TaxOpportunityItem(
            id="opp_24b_missing",
            title="Section 24(b) Housing Loan Interest Relief",
            section="Section 24(b)",
            status="missing_information",
            why_it_appears="If you are servicing a residential housing loan for a self-occupied property, interest payments of up to ₹2,00,000 per financial year can be deducted from your taxable income under the Old Regime.",
            potential_tax_impact=round(impact_24b, 2),
            missing_fields_required=[
                "Provisional or final Home Loan Interest Certificate from lending bank / NBFC",
                "Proof of ownership and possession of self-occupied residential property",
            ],
            cautionary_note="A housing loan is a major multi-year financial liability involving substantial interest outflow. Avail a home loan solely for genuine homeownership needs, never for tax incentives.",
        ))

    # 4. Regime Optimization / Break-even Strategy
    is_new = (result.recommended_regime == "New Regime")
    savings = float(result.tax_savings)
    if is_new and savings > 0:
        opportunities.append(TaxOpportunityItem(
            id="opp_regime_optimization",
            title="Default New Regime Optimization",
            section="Regime Selection",
            status="optimization",
            why_it_appears=f"With your current deductions, the New Regime saves an estimated ₹{savings:,.2f} over the Old Regime due to lower slab rates.",
            potential_tax_impact=round(savings, 2),
            missing_fields_required=[],
            cautionary_note="The New Regime avoids the need to lock funds into tax-saving schemes. Choose based on your actual recurring commitments rather than forced spending.",
        ))
    elif not is_new and savings > 0:
        opportunities.append(TaxOpportunityItem(
            id="opp_old_regime_benefit",
            title="Old Regime Deduction Benefit",
            section="Regime Selection",
            status="optimization",
            why_it_appears=f"Your eligible deductions successfully overcome the higher Old Regime slab rates, saving an estimated ₹{savings:,.2f}.",
            potential_tax_impact=round(savings, 2),
            missing_fields_required=[],
            cautionary_note="Maintain receipts and certificates for all claimed deductions for return filing and verification.",
        ))

    return opportunities


def _regime_to_response(r: RegimeCalculationResult) -> RegimeBreakdownResponse:
    """Map domain result → API response model."""
    return RegimeBreakdownResponse(
        regime_name=r.regime_name,
        gross_income=float(r.gross_income),
        standard_deduction=float(r.standard_deduction),
        total_chapter_vi_a_deductions=float(r.total_chapter_vi_a_deductions),
        taxable_income=float(r.taxable_income),
        tax_on_income=float(r.tax_on_income),
        rebate_87a=float(r.rebate_87a),
        tax_after_rebate=float(r.tax_after_rebate),
        surcharge=float(r.surcharge),
        health_and_education_cess=float(r.health_and_education_cess),
        total_tax_liability=float(r.total_tax_liability),
    )


class TaxEstimatorService:

    @staticmethod
    def calculate_and_save(user_id: str, request: TaxCalculateRequest) -> TaxCalculateResponse:
        """
        1. Build domain input from API request.
        2. Invoke deterministic calculation engine.
        3. Persist assessment linked to authenticated user_id.
        4. Return structured response.

        user_id is ALWAYS derived from the authenticated token — never from
        the request body.
        """
        # --- Architectural Guardrail: DOCUMENT_EXTRACTED values must never silently become trusted inputs ---
        DocumentBoundaryService.assert_no_unconfirmed_document_data(
            request.field_sources,
            getattr(request, 'is_user_confirmed', True)
        )

        # --- Build engine input ---
        try:
            domain_input = TaxEstimatorInput(
                financial_year=request.financial_year,
                gross_salary=Decimal(str(request.gross_salary)),
                other_income=Decimal(str(request.other_income)),
                deduction_80c=Decimal(str(request.deduction_80c)),
                deduction_80d=Decimal(str(request.deduction_80d)),
                deduction_80tta=Decimal(str(request.deduction_80tta)),
                home_loan_interest=Decimal(str(getattr(request, 'home_loan_interest', 0.0))),
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # --- Invoke calculation engine ---
        try:
            result = calculate_tax(domain_input)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # --- Persist to Supabase ---
        record = {
            "user_id": user_id,
            "financial_year": request.financial_year,
            "gross_salary": float(request.gross_salary),
            "other_income": float(request.other_income),
            "deduction_80c": float(request.deduction_80c),
            "deduction_80d": float(request.deduction_80d),
            "deduction_80tta": float(request.deduction_80tta),
            # Old regime breakdown
            "old_gross_income": float(result.old_regime.gross_income),
            "old_standard_deduction": float(result.old_regime.standard_deduction),
            "old_chapter_vi_deductions": float(result.old_regime.total_chapter_vi_a_deductions),
            "old_taxable_income": float(result.old_regime.taxable_income),
            "old_tax_on_income": float(result.old_regime.tax_on_income),
            "old_rebate_87a": float(result.old_regime.rebate_87a),
            "old_tax_after_rebate": float(result.old_regime.tax_after_rebate),
            "old_surcharge": float(result.old_regime.surcharge),
            "old_cess": float(result.old_regime.health_and_education_cess),
            "old_total_tax": float(result.old_regime.total_tax_liability),
            # New regime breakdown
            "new_gross_income": float(result.new_regime.gross_income),
            "new_standard_deduction": float(result.new_regime.standard_deduction),
            "new_chapter_vi_deductions": float(result.new_regime.total_chapter_vi_a_deductions),
            "new_taxable_income": float(result.new_regime.taxable_income),
            "new_tax_on_income": float(result.new_regime.tax_on_income),
            "new_rebate_87a": float(result.new_regime.rebate_87a),
            "new_tax_after_rebate": float(result.new_regime.tax_after_rebate),
            "new_surcharge": float(result.new_regime.surcharge),
            "new_cess": float(result.new_regime.health_and_education_cess),
            "new_total_tax": float(result.new_regime.total_tax_liability),
            # Comparison
            "recommended_regime": result.recommended_regime,
            "estimated_tax_savings": float(result.tax_savings),
        }

        try:
            response = supabase.table(TABLE).insert(record).execute()
            if not response.data:
                raise Exception("Insert returned no data")
            saved = response.data[0]
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail="Failed to save assessment. Please try again."
            )

        rec_msg, comparison_summary, explanation, opportunity_insights = _build_comparison_and_insights(result, domain_input)
        flow, ded_breakdown, why_regime, trust_meta = _build_transparency_and_trust(result, domain_input, request)
        opportunities = _build_opportunities(result, domain_input, request)

        return TaxCalculateResponse(
            assessment_id=saved["id"],
            financial_year=result.financial_year,
            old_regime=_regime_to_response(result.old_regime),
            new_regime=_regime_to_response(result.new_regime),
            recommended_regime=result.recommended_regime,
            estimated_tax_savings=float(result.tax_savings),
            recommendation_message=rec_msg,
            comparison_summary=comparison_summary,
            explanation=explanation,
            opportunity_insights=opportunity_insights,
            opportunities=opportunities,
            calculation_flow=flow,
            deduction_breakdown=ded_breakdown,
            why_this_regime=why_regime,
            trust_metadata=trust_meta,
        )

    @staticmethod
    def get_history(user_id: str) -> TaxAssessmentHistoryResponse:
        """Return all assessments for the authenticated user with full metrics, newest first."""
        try:
            response = (
                supabase.table(TABLE)
                .select(
                    "id, financial_year, gross_salary, other_income, old_gross_income, "
                    "new_gross_income, old_total_tax, new_total_tax, "
                    "recommended_regime, estimated_tax_savings, created_at"
                )
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to retrieve assessment history.")

        assessments = []
        for row in (response.data or []):
            rec_regime = row.get("recommended_regime", "New Regime")
            old_tax = float(row.get("old_total_tax", 0.0) or 0.0)
            new_tax = float(row.get("new_total_tax", 0.0) or 0.0)
            est_tax = new_tax if rec_regime == "New Regime" else old_tax
            diff = float(row.get("estimated_tax_savings", 0.0) or 0.0)
            gross = float(
                row.get("old_gross_income", 0.0)
                or (float(row.get("gross_salary", 0.0) or 0.0) + float(row.get("other_income", 0.0) or 0.0))
            )

            assessments.append(
                TaxAssessmentSummary(
                    id=row["id"],
                    financial_year=row["financial_year"],
                    gross_income=gross,
                    recommended_regime=rec_regime,
                    estimated_tax=est_tax,
                    estimated_difference=diff,
                    old_regime_total_tax=old_tax,
                    new_regime_total_tax=new_tax,
                    estimated_tax_savings=diff,
                    created_at=row["created_at"],
                )
            )
        return TaxAssessmentHistoryResponse(assessments=assessments)

    @staticmethod
    def get_assessment(assessment_id: str, user_id: str) -> TaxAssessmentDetailResponse:
        """
        Return a single assessment by ID.
        Enforces user ownership: raises 403 if the record does not belong
        to the authenticated user. Returns 404 if not found.
        """
        try:
            response = (
                supabase.table(TABLE)
                .select("*")
                .eq("id", assessment_id)
                .single()
                .execute()
            )
        except Exception:
            raise HTTPException(status_code=404, detail="Assessment not found.")

        row = response.data
        if not row:
            raise HTTPException(status_code=404, detail="Assessment not found.")

        # Ownership check — server enforced, never trust client-supplied user_id
        if row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized.")

        old = RegimeBreakdownResponse(
            regime_name="Old Regime",
            gross_income=row["old_gross_income"],
            standard_deduction=row["old_standard_deduction"],
            total_chapter_vi_a_deductions=row["old_chapter_vi_deductions"],
            taxable_income=row["old_taxable_income"],
            tax_on_income=row["old_tax_on_income"],
            rebate_87a=row["old_rebate_87a"],
            tax_after_rebate=row["old_tax_after_rebate"],
            surcharge=row["old_surcharge"],
            health_and_education_cess=row["old_cess"],
            total_tax_liability=row["old_total_tax"],
        )
        new = RegimeBreakdownResponse(
            regime_name="New Regime",
            gross_income=row["new_gross_income"],
            standard_deduction=row["new_standard_deduction"],
            total_chapter_vi_a_deductions=row["new_chapter_vi_deductions"],
            taxable_income=row["new_taxable_income"],
            tax_on_income=row["new_tax_on_income"],
            rebate_87a=row["new_rebate_87a"],
            tax_after_rebate=row["new_tax_after_rebate"],
            surcharge=row["new_surcharge"],
            health_and_education_cess=row["new_cess"],
            total_tax_liability=row["new_total_tax"],
        )

        # Reconstruct domain input for enriched explanation, what-if insights, and transparency flow
        try:
            d_in = TaxEstimatorInput(
                financial_year=row["financial_year"],
                gross_salary=Decimal(str(row["gross_salary"])),
                other_income=Decimal(str(row["other_income"])),
                deduction_80c=Decimal(str(row["deduction_80c"])),
                deduction_80d=Decimal(str(row["deduction_80d"])),
                deduction_80tta=Decimal(str(row["deduction_80tta"])),
                home_loan_interest=Decimal(str(row.get("home_loan_interest", 0.0) or 0.0)),
            )
            calc_res = calculate_tax(d_in)
            rec_msg, comparison_summary, explanation, opportunity_insights = _build_comparison_and_insights(
                calc_res, d_in
            )
            flow, ded_breakdown, why_regime, trust_meta = _build_transparency_and_trust(
                calc_res, d_in
            )
            opps = _build_opportunities(calc_res, d_in)
        except Exception:
            rec_msg, comparison_summary, explanation, opportunity_insights = None, None, None, None
            flow, ded_breakdown, why_regime, trust_meta = None, None, None, None
            opps = None

        return TaxAssessmentDetailResponse(
            id=row["id"],
            financial_year=row["financial_year"],
            gross_salary=row["gross_salary"],
            other_income=row["other_income"],
            deduction_80c=row["deduction_80c"],
            deduction_80d=row["deduction_80d"],
            deduction_80tta=row["deduction_80tta"],
            home_loan_interest=float(row.get("home_loan_interest", 0.0) or 0.0),
            old_regime=old,
            new_regime=new,
            recommended_regime=row["recommended_regime"],
            estimated_tax_savings=row["estimated_tax_savings"],
            recommendation_message=rec_msg,
            comparison_summary=comparison_summary,
            explanation=explanation,
            opportunity_insights=opportunity_insights,
            opportunities=opps,
            calculation_flow=flow,
            deduction_breakdown=ded_breakdown,
            why_this_regime=why_regime,
            trust_metadata=trust_meta,
            created_at=row["created_at"],
        )

    @staticmethod
    def recalculate_assessment(user_id: str, assessment_id: str) -> TaxCalculateResponse:
        """
        Loads the inputs of an existing assessment, validates user ownership,
        and re-runs the authoritative calculation engine against latest rules,
        persisting a fresh assessment.
        """
        # 1. Fetch past assessment ensuring ownership
        past = TaxEstimatorService.get_assessment(assessment_id, user_id)

        # 2. Construct calculation request from original inputs
        recalc_request = TaxCalculateRequest(
            financial_year=past.financial_year,
            gross_salary=past.gross_salary,
            other_income=past.other_income,
            deduction_80c=past.deduction_80c,
            deduction_80d=past.deduction_80d,
            deduction_80tta=past.deduction_80tta,
            home_loan_interest=past.home_loan_interest,
            field_sources={
                "gross_salary": "USER_ENTERED",
                "other_income": "USER_ENTERED",
                "deduction_80c": "USER_ENTERED",
                "deduction_80d": "USER_ENTERED",
                "deduction_80tta": "USER_ENTERED",
                "home_loan_interest": "USER_ENTERED",
            },
            user_overrides=[f"recalculated_from_{assessment_id}"],
            is_user_confirmed=True,
        )

        # 3. Calculate and save under authenticated user_id
        return TaxEstimatorService.calculate_and_save(user_id, recalc_request)

    @staticmethod
    def compare_assessments(user_id: str, assessment_id_1: str, assessment_id_2: str) -> TaxAssessmentComparisonResponse:
        """
        Compare two historical tax assessments side-by-side.
        Strictly enforces user ownership on both assessment records.
        Computes differences in gross income, taxable income, and tax liabilities.
        """
        # Fetch both assessments (get_assessment enforces user_id ownership, raising 404/403 on breach)
        a1 = TaxEstimatorService.get_assessment(assessment_id_1, user_id)
        a2 = TaxEstimatorService.get_assessment(assessment_id_2, user_id)

        g1 = a1.gross_salary + a1.other_income
        g2 = a2.gross_salary + a2.other_income
        gross_diff = round(g2 - g1, 2)

        # Determine active tax liability for each assessment based on its recommendation
        tax1 = a1.new_regime.total_tax_liability if a1.recommended_regime == "New Regime" else a1.old_regime.total_tax_liability
        tax2 = a2.new_regime.total_tax_liability if a2.recommended_regime == "New Regime" else a2.old_regime.total_tax_liability
        tax_diff = round(tax2 - tax1, 2)

        taxable1 = a1.new_regime.taxable_income if a1.recommended_regime == "New Regime" else a1.old_regime.taxable_income
        taxable2 = a2.new_regime.taxable_income if a2.recommended_regime == "New Regime" else a2.old_regime.taxable_income
        taxable_diff = round(taxable2 - taxable1, 2)

        if a1.recommended_regime != a2.recommended_regime:
            regime_trans = f"Shifted from {a1.recommended_regime} to {a2.recommended_regime}"
        else:
            regime_trans = f"Consistent recommendation: {a1.recommended_regime}"

        notes = []
        if gross_diff > 0:
            notes.append(f"Gross earnings increased by ₹{gross_diff:,.2f} between assessments.")
        elif gross_diff < 0:
            notes.append(f"Gross earnings decreased by ₹{abs(gross_diff):,.2f} between assessments.")
        else:
            notes.append("Gross income remained unchanged between assessments.")

        if tax_diff > 0:
            notes.append(f"Estimated tax liability increased by ₹{tax_diff:,.2f}.")
        elif tax_diff < 0:
            notes.append(f"Estimated tax liability reduced by ₹{abs(tax_diff):,.2f}.")
        else:
            notes.append("Estimated tax liability is identical in both assessments.")

        if a1.financial_year != a2.financial_year:
            notes.append(f"Cross-financial-year comparison: FY {a1.financial_year} vs FY {a2.financial_year}.")

        delta = TaxAssessmentComparisonDelta(
            gross_income_diff=gross_diff,
            taxable_income_diff=taxable_diff,
            tax_difference=tax_diff,
            regime_transition=regime_trans,
            summary_notes=notes,
        )

        return TaxAssessmentComparisonResponse(
            assessment_1=a1,
            assessment_2=a2,
            delta=delta,
        )

    @staticmethod
    def get_journey_milestone(user_id: str) -> TaxJourneyMilestone:
        """
        Clean, decoupled integration boundary for Financial Journey consumers.
        Returns the user's latest tax milestone status without exposing calculation internals.
        """
        try:
            response = (
                supabase.table(TABLE)
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            data = response.data or []
            if not data:
                return TaxJourneyMilestone(
                    has_assessment=False,
                    milestone_status="PENDING_ASSESSMENT",
                    notes="No tax assessment has been recorded yet. Start your first tax estimate.",
                )

            latest = data[0]
            rec_regime = latest.get("recommended_regime", "New Regime")
            old_tax = float(latest.get("old_total_tax", 0.0) or 0.0)
            new_tax = float(latest.get("new_total_tax", 0.0) or 0.0)
            est_tax = new_tax if rec_regime == "New Regime" else old_tax
            diff = float(latest.get("estimated_tax_savings", 0.0) or 0.0)
            gross = float(
                latest.get("old_gross_income", 0.0)
                or (float(latest.get("gross_salary", 0.0) or 0.0) + float(latest.get("other_income", 0.0) or 0.0))
            )

            return TaxJourneyMilestone(
                has_assessment=True,
                latest_assessment_id=latest["id"],
                financial_year=latest["financial_year"],
                gross_income=gross,
                estimated_tax=est_tax,
                recommended_regime=rec_regime,
                estimated_savings=diff,
                milestone_status="ESTIMATED",
                action_deep_link="/tax-estimator",
                updated_at=latest.get("created_at"),
                notes=f"Tax estimated for {latest['financial_year']}. Recommended: {rec_regime} (estimated diff ₹{diff:,.2f}).",
            )
        except Exception:
            return TaxJourneyMilestone(
                has_assessment=False,
                milestone_status="PENDING_ASSESSMENT",
                notes="Could not retrieve tax milestone status.",
            )

    @staticmethod
    def get_profile_defaults(user_id: str, financial_year: str = "2024-25") -> ProfileDefaultsResponse:
        """
        Extract profile-derived tax input defaults for the authenticated user.
        Independent and non-blocking: if profile tables are missing or empty,
        returns safe default values without raising errors.
        """
        user_profile_data = None
        financial_profile_data = None
        has_profile = False

        try:
            # 1. Fetch user_profile for date of birth / age
            u_res = supabase.table("user_profile").select("id, date_of_birth, full_name").eq("user_id", user_id).execute()
            if u_res and u_res.data and len(u_res.data) > 0:
                user_profile_data = u_res.data[0]
                has_profile = True
                u_id = user_profile_data.get("id")

                # 2. Fetch financial_profile for income / assets
                if u_id:
                    f_res = supabase.table("financial_profile").select("*").eq("user_profile_id", u_id).execute()
                    if f_res and f_res.data and len(f_res.data) > 0:
                        financial_profile_data = f_res.data[0]
        except Exception:
            # Resilient fallback: database failure or missing tables must not break Tax Estimator
            user_profile_data = None
            financial_profile_data = None
            has_profile = False

        normalized = TaxInputNormalizer.normalize_from_profiles(
            user_profile=user_profile_data,
            financial_profile=financial_profile_data,
            financial_year=financial_year,
        )

        return ProfileDefaultsResponse(
            financial_year=normalized.financial_year,
            age=normalized.age,
            gross_salary=normalized.gross_salary,
            other_income=normalized.other_income,
            deduction_80c=normalized.deduction_80c,
            deduction_80d=normalized.deduction_80d,
            deduction_80tta=normalized.deduction_80tta,
            has_profile_data=has_profile,
            field_sources=normalized.field_sources,
        )

    @staticmethod
    def simulate_what_if(request: TaxWhatIfRequest) -> TaxWhatIfResponse:
        """
        Executes interactive What-If scenario simulations using the SAME
        authoritative calculate_tax engine.
        CRITICAL ARCHITECTURAL GUARANTEE:
        - Scenarios NEVER mutate user assessment history or profile.
        - Calculations execute transiently in-memory through calculate_tax.
        - Clear separation between CURRENT and SCENARIO state.
        """
        base = request.base_input
        try:
            base_domain = TaxEstimatorInput(
                financial_year=base.financial_year,
                gross_salary=Decimal(str(base.gross_salary)),
                other_income=Decimal(str(base.other_income)),
                deduction_80c=Decimal(str(base.deduction_80c)),
                deduction_80d=Decimal(str(base.deduction_80d)),
                deduction_80tta=Decimal(str(base.deduction_80tta)),
                home_loan_interest=Decimal(str(getattr(base, 'home_loan_interest', 0.0))),
            )
            base_res = calculate_tax(base_domain)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid base tax input: {str(e)}")

        overrides = request.overrides or ScenarioOverrides()

        # 1. Salary override
        sim_salary = base_domain.gross_salary
        if overrides.new_gross_salary is not None:
            sim_salary = Decimal(str(overrides.new_gross_salary))
        elif overrides.salary_change_amount is not None:
            sim_salary = max(Decimal('0.0'), base_domain.gross_salary + Decimal(str(overrides.salary_change_amount)))
        elif request.scenario_type == "salary_change":
            sim_salary = base_domain.gross_salary + Decimal('100000')

        # 2. Deduction overrides
        sim_80c = base_domain.deduction_80c
        if overrides.additional_80c is not None and overrides.additional_80c > 0:
            sim_80c = base_domain.deduction_80c + Decimal(str(overrides.additional_80c))
        elif request.scenario_type == "additional_deductions" and (overrides.additional_80c is None or overrides.additional_80c == 0):
            sim_80c = Decimal('150000')

        sim_80d = base_domain.deduction_80d
        if overrides.additional_80d is not None and overrides.additional_80d > 0:
            sim_80d = base_domain.deduction_80d + Decimal(str(overrides.additional_80d))
        elif request.scenario_type == "additional_deductions" and (overrides.additional_80d is None or overrides.additional_80d == 0):
            sim_80d = Decimal('25000')

        # 3. Home loan interest u/s 24(b)
        sim_home_loan = base_domain.home_loan_interest
        if overrides.home_loan_interest is not None:
            sim_home_loan = Decimal(str(overrides.home_loan_interest))
        elif request.scenario_type == "home_loan_interest":
            sim_home_loan = Decimal('200000')

        # 4. Execute simulation using the SAME authoritative engine
        try:
            sim_domain = TaxEstimatorInput(
                financial_year=base_domain.financial_year,
                gross_salary=sim_salary,
                other_income=base_domain.other_income,
                deduction_80c=sim_80c,
                deduction_80d=sim_80d,
                deduction_80tta=base_domain.deduction_80tta,
                home_loan_interest=sim_home_loan,
            )
            sim_res = calculate_tax(sim_domain)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid simulation parameters: {str(e)}")

        # 5. Snapshot CURRENT state
        curr_is_new = (base_res.recommended_regime == "New Regime")
        c_active = base_res.new_regime if curr_is_new else base_res.old_regime
        c_gross = float(c_active.gross_income)
        c_tax = float(c_active.total_tax_liability)
        c_eff_rate = round((c_tax / c_gross * 100), 2) if c_gross > 0 else 0.0

        current_snapshot = ScenarioResultSnapshot(
            regime_name=c_active.regime_name,
            gross_income=c_gross,
            standard_deduction=float(c_active.standard_deduction),
            total_deductions=float(c_active.total_chapter_vi_a_deductions),
            taxable_income=float(c_active.taxable_income),
            tax_on_income=float(c_active.tax_on_income),
            rebate_87a=float(c_active.rebate_87a),
            surcharge=float(c_active.surcharge),
            health_and_education_cess=float(c_active.health_and_education_cess),
            total_tax=c_tax,
            effective_tax_rate=c_eff_rate,
            recommended_regime=base_res.recommended_regime,
        )

        # 6. Snapshot SCENARIO state
        if request.scenario_type == "regime_switch":
            # Direct switch comparison
            s_active = base_res.old_regime if curr_is_new else base_res.new_regime
            s_rec = "Old Regime" if curr_is_new else "New Regime"
        elif overrides.forced_regime == "OLD":
            s_active = sim_res.old_regime
            s_rec = sim_res.recommended_regime
        elif overrides.forced_regime == "NEW":
            s_active = sim_res.new_regime
            s_rec = sim_res.recommended_regime
        else:
            s_is_new = (sim_res.recommended_regime == "New Regime")
            s_active = sim_res.new_regime if s_is_new else sim_res.old_regime
            s_rec = sim_res.recommended_regime

        s_gross = float(s_active.gross_income)
        s_tax = float(s_active.total_tax_liability)
        s_eff_rate = round((s_tax / s_gross * 100), 2) if s_gross > 0 else 0.0

        scenario_snapshot = ScenarioResultSnapshot(
            regime_name=s_active.regime_name,
            gross_income=s_gross,
            standard_deduction=float(s_active.standard_deduction),
            total_deductions=float(s_active.total_chapter_vi_a_deductions),
            taxable_income=float(s_active.taxable_income),
            tax_on_income=float(s_active.tax_on_income),
            rebate_87a=float(s_active.rebate_87a),
            surcharge=float(s_active.surcharge),
            health_and_education_cess=float(s_active.health_and_education_cess),
            total_tax=s_tax,
            effective_tax_rate=s_eff_rate,
            recommended_regime=s_rec,
        )

        # 7. Compute Delta
        tax_difference = round(c_tax - s_tax, 2)  # positive = saved
        taxable_difference = round(float(c_active.taxable_income) - float(s_active.taxable_income), 2)
        rate_difference = round(c_eff_rate - s_eff_rate, 2)

        if tax_difference > 0:
            summary_sentence = f"This scenario reduces your estimated tax liability by ₹{tax_difference:,.2f}."
        elif tax_difference < 0:
            summary_sentence = f"This scenario increases your estimated tax liability by ₹{abs(tax_difference):,.2f}."
        else:
            summary_sentence = "This scenario results in no change in estimated tax liability."

        explanation_points: List[str] = []
        if request.scenario_type == "salary_change":
            sal_diff = float(sim_salary - base_domain.gross_salary)
            sign = "+" if sal_diff >= 0 else "-"
            explanation_points.append(
                f"Gross salary was adjusted by {sign}₹{abs(sal_diff):,.2f} (from ₹{float(base_domain.gross_salary):,.2f} to ₹{float(sim_salary):,.2f})."
            )
            if tax_difference < 0 and abs(sal_diff) > 0:
                marginal_tax = abs(tax_difference)
                effective_marginal_rate = round((marginal_tax / abs(sal_diff)) * 100, 1)
                explanation_points.append(f"Incremental tax on additional income is ₹{marginal_tax:,.2f} (effective marginal rate: {effective_marginal_rate}%).")
            explanation_points.append(f"Optimal regime for this income level is {sim_res.recommended_regime}.")

        elif request.scenario_type == "additional_deductions":
            add_c = float(sim_80c - base_domain.deduction_80c)
            add_d = float(sim_80d - base_domain.deduction_80d)
            explanation_points.append(
                f"Simulated additional Chapter VI-A deductions: Section 80C: +₹{add_c:,.2f}, Section 80D: +₹{add_d:,.2f}."
            )
            explanation_points.append(
                "These deductions apply strictly to the Old Tax Regime; New Regime liability remains unchanged under Section 115BAC."
            )
            if s_rec == "Old Regime":
                explanation_points.append("With these additional deductions, the Old Regime becomes more tax efficient.")
            else:
                explanation_points.append("Even with these simulated deductions, the New Regime remains more beneficial due to lower slab rates.")

        elif request.scenario_type == "home_loan_interest":
            hl_val = float(sim_home_loan)
            explanation_points.append(
                f"Simulated Section 24(b) home loan interest deduction of ₹{hl_val:,.2f} on self-occupied property."
            )
            explanation_points.append(
                "Under Old Regime, Section 24(b) allows up to ₹2,00,000 deduction from gross income. Under New Regime (Section 115BAC), set-off of housing loan interest is disallowed."
            )
            if tax_difference > 0:
                explanation_points.append(f"Section 24(b) deduction reduces taxable income under Old Regime, yielding ₹{tax_difference:,.2f} in tax relief.")

        elif request.scenario_type == "regime_switch":
            explanation_points.append(
                f"Comparing your active recommendation ({c_active.regime_name}) against the alternative {s_active.regime_name}."
            )
            if tax_difference < 0:
                explanation_points.append(
                    f"Switching to {s_active.regime_name} increases estimated tax liability by ₹{abs(tax_difference):,.2f}."
                )
            elif tax_difference > 0:
                explanation_points.append(
                    f"Switching to {s_active.regime_name} reduces estimated tax liability by ₹{tax_difference:,.2f}."
                )

        else:
            explanation_points.append("Custom scenario evaluated against official tax rules.")

        delta = TaxWhatIfDelta(
            tax_difference=tax_difference,
            taxable_income_difference=taxable_difference,
            effective_rate_difference=rate_difference,
            summary_sentence=summary_sentence,
            explanation_points=explanation_points,
        )

        # 8. Data-grounded personalized opportunities
        opportunities = _build_opportunities(base_res, base_domain, base)

        scenario_title = request.scenario_title or {
            "salary_change": "Salary Change Simulation",
            "additional_deductions": "Maximize Deductions (80C / 80D)",
            "home_loan_interest": "Home Loan Interest u/s 24(b)",
            "regime_switch": "Alternative Regime Switch",
            "custom": "Custom What-If Scenario",
        }.get(request.scenario_type, "What-If Scenario")

        return TaxWhatIfResponse(
            scenario_type=request.scenario_type,
            scenario_title=scenario_title,
            current=current_snapshot,
            scenario=scenario_snapshot,
            delta=delta,
            opportunities=opportunities,
            does_mutate_profile=False,
        )

    @staticmethod
    def get_tax_education(financial_year: str = "2024-25") -> TaxEducationResponse:
        """
        Dynamically returns authoritative tax education data, slab structures,
        statutory deduction caps, calculation flow stages, and glossary terms for the requested financial year.
        Uses versioned rules from the centralized tax rules registry.
        """
        try:
            rules = get_tax_rules(financial_year)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Dynamic Assessment Year and calendar spans
        parts = financial_year.split('-')
        if len(parts) == 2 and len(parts[0]) == 4:
            try:
                start_yr = int(parts[0])
                ay_start = start_yr + 1
                ay_end_suffix = str((ay_start + 1) % 100).zfill(2)
                assessment_year = f"{ay_start}-{ay_end_suffix}"
                fy_date_span = f"1 April {start_yr} – 31 March {start_yr + 1}"
                ay_date_span = f"1 April {ay_start} – 31 March {ay_start + 1}"
            except Exception:
                assessment_year = "2025-26"
                fy_date_span = "1 April 2024 – 31 March 2025"
                ay_date_span = "1 April 2025 – 31 March 2026"
        else:
            assessment_year = "2025-26"
            fy_date_span = "1 April 2024 – 31 March 2025"
            ay_date_span = "1 April 2025 – 31 March 2026"

        def _format_slabs_display(slab_tuples) -> List[TaxSlabDisplay]:
            displays = []
            prev_limit = Decimal('0')
            for limit, rate in slab_tuples:
                rate_pct = float(rate * 100)
                rate_label = f"{int(rate_pct)}%" if rate_pct > 0 else "Nil (0%)"
                if limit == Decimal('Infinity'):
                    slab_range = f"Above ₹{int(prev_limit):,}"
                elif prev_limit == Decimal('0'):
                    slab_range = f"Up to ₹{int(limit):,}"
                else:
                    slab_range = f"₹{int(prev_limit) + 1:,} to ₹{int(limit):,}"
                displays.append(TaxSlabDisplay(
                    slab_range=slab_range,
                    rate_percent=rate_pct,
                    tax_rate_label=rate_label
                ))
                prev_limit = limit
            return displays

        new_regime_slabs = _format_slabs_display(rules.NEW_REGIME_SLABS)
        old_regime_slabs = _format_slabs_display(rules.OLD_REGIME_SLABS)

        new_regime_summary = RegimeRulesSummary(
            regime_name="New Tax Regime",
            statutory_basis="Section 115BAC of Income Tax Act, 1961",
            is_default=True,
            standard_deduction=float(rules.STANDARD_DEDUCTION),
            rebate_87a_limit=float(rules.NEW_REGIME_REBATE_87A_LIMIT),
            rebate_87a_max=float(rules.NEW_REGIME_REBATE_87A_MAX),
            slabs=new_regime_slabs,
            deductions_allowed=[
                f"Standard Deduction of ₹{int(rules.STANDARD_DEDUCTION):,} on Salary",
                "Employer NPS contribution under Section 80CCD(2)",
            ],
            key_features=[
                "Default tax regime under Indian law starting FY 2023-24",
                f"Zero tax liability up to ₹{int(rules.NEW_REGIME_REBATE_87A_LIMIT):,} taxable income (Section 87A rebate)",
                "Concessional, streamlined slab rates",
                "No need to maintain rent receipts or investment paperwork",
            ],
        )

        old_regime_summary = RegimeRulesSummary(
            regime_name="Old Tax Regime",
            statutory_basis="Traditional graduated slab tax system",
            is_default=False,
            standard_deduction=float(rules.STANDARD_DEDUCTION),
            rebate_87a_limit=float(rules.OLD_REGIME_REBATE_87A_LIMIT),
            rebate_87a_max=float(rules.OLD_REGIME_REBATE_87A_MAX),
            slabs=old_regime_slabs,
            deductions_allowed=[
                f"Standard Deduction of ₹{int(rules.STANDARD_DEDUCTION):,} on Salary",
                f"Section 80C investments up to ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['80C']):,}",
                f"Section 80D medical insurance up to ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['80D']):,}",
                f"Section 24(b) home loan interest up to ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['24B']):,}",
                f"Section 80TTA savings interest up to ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['80TTA']):,}",
                "House Rent Allowance (HRA) exemption under Section 10(13A)",
            ],
            key_features=[
                "Beneficial for individuals with high itemized deductions (> ₹3.75 Lakhs)",
                f"Full tax rebate up to ₹{int(rules.OLD_REGIME_REBATE_87A_LIMIT):,} taxable income",
                "Requires submission and verification of investment proofs and rent agreements",
                "Higher slab tax rates (up to 30% above ₹10 Lakhs)",
            ],
        )

        deduction_limits = [
            StatutoryDeductionLimit(
                code="80C",
                name="Specified Investments & Savings",
                statutory_section="Section 80C",
                limit_amount=float(rules.DEDUCTION_LIMITS_OLD_REGIME['80C']),
                applicable_regime="Old Regime Only",
                description="Deduction for specified long-term investments, provident fund contributions, and tuition fees.",
                eligible_instruments=[
                    "Employee Provident Fund (EPF / VPF)",
                    "Public Provident Fund (PPF)",
                    "Equity Linked Savings Scheme (ELSS) Mutual Funds",
                    "Life Insurance Premiums",
                    "National Savings Certificates (NSC)",
                    "Home Loan Principal Repayment",
                    "Sukanya Samriddhi Account",
                    "5-Year Tax Saving Bank Fixed Deposits",
                ],
            ),
            StatutoryDeductionLimit(
                code="80D",
                name="Health Insurance Premiums & Medical Checkup",
                statutory_section="Section 80D",
                limit_amount=float(rules.DEDUCTION_LIMITS_OLD_REGIME['80D']),
                applicable_regime="Old Regime Only",
                description="Deduction for premiums paid towards health insurance policies covering self, spouse, dependent children, and parents.",
                eligible_instruments=[
                    "Individual or Family Floater Mediclaim (₹25,000)",
                    "Health insurance for Senior Citizen Parents (up to ₹50,000)",
                    "Preventive health check-up (up to ₹5,000 sub-limit)",
                ],
            ),
            StatutoryDeductionLimit(
                code="24B",
                name="Interest on Housing Loan",
                statutory_section="Section 24(b)",
                limit_amount=float(rules.DEDUCTION_LIMITS_OLD_REGIME['24B']),
                applicable_regime="Old Regime Only",
                description="Deduction on interest payable on borrowed capital for acquisition or construction of self-occupied residential property.",
                eligible_instruments=[
                    "Home Loan Interest Certificate from Bank / Housing Finance Company",
                    "Pre-construction loan interest (deductible in 5 equal annual installments)",
                ],
            ),
            StatutoryDeductionLimit(
                code="80TTA",
                name="Interest on Savings Bank Accounts",
                statutory_section="Section 80TTA",
                limit_amount=float(rules.DEDUCTION_LIMITS_OLD_REGIME['80TTA']),
                applicable_regime="Old Regime Only",
                description="Deduction on interest income earned from savings bank accounts held with banks, post offices, or co-operative banks.",
                eligible_instruments=[
                    "Savings Bank Account Interest",
                    "Post Office Savings Interest",
                    "Co-operative Bank Savings Interest",
                ],
            ),
        ]

        calculation_flow_stages = [
            CalculationFlowStage(
                stage_number=1,
                title="Gross Income",
                subtitle="Aggregate Total Earnings",
                description="Sum total of all earnings received across all heads of income: Salary, House Property, Capital Gains, Business/Profession, and Other Sources.",
                formula="Gross Income = Gross Salary + Other Income",
            ),
            CalculationFlowStage(
                stage_number=2,
                title="Exemptions & Deductions",
                subtitle="Statutory Tax Relief",
                description=f"Standard Deduction (₹{int(rules.STANDARD_DEDUCTION):,} in both regimes) plus allowable Chapter VI-A deductions (80C, 80D, 24(b), etc.) under Old Regime.",
                formula="Total Deductions = Standard Deduction + Chapter VI-A (80C, 80D, 24(b))",
            ),
            CalculationFlowStage(
                stage_number=3,
                title="Taxable Income",
                subtitle="Net Income Subject to Slabs",
                description="The exact income threshold upon which progressive tax slab rates are evaluated.",
                formula="Taxable Income = Gross Income - Allowable Deductions",
            ),
            CalculationFlowStage(
                stage_number=4,
                title="Tax Slabs Calculation",
                subtitle="Progressive Rate Computation",
                description="Income is partitioned into progressive brackets with ascending tax percentages according to the selected regime.",
                formula="Base Tax = Sum(Bracket Amount × Slab Rate %)",
            ),
            CalculationFlowStage(
                stage_number=5,
                title="Section 87A Rebate",
                subtitle="Low & Middle Income Relief",
                description=f"Full tax waiver for resident individuals if net taxable income does not exceed ₹{int(rules.NEW_REGIME_REBATE_87A_LIMIT):,} (New) or ₹{int(rules.OLD_REGIME_REBATE_87A_LIMIT):,} (Old).",
                formula="Tax After Rebate = Max(0, Base Tax - Section 87A Rebate)",
            ),
            CalculationFlowStage(
                stage_number=6,
                title="Surcharge (If Applicable)",
                subtitle="High Net-Worth Levy",
                description="Additional progressive percentage levied only on high earners whose taxable income exceeds ₹50 Lakhs.",
                formula="Surcharge = Tax After Rebate × Surcharge % (0% if income ≤ ₹50L)",
            ),
            CalculationFlowStage(
                stage_number=7,
                title="Health & Education Cess",
                subtitle=f"Statutory {int(rules.CESS_RATE * 100)}% Levy",
                description="A mandatory 4% cess calculated on total tax liability and surcharge to fund public healthcare and education programs.",
                formula=f"Cess = (Tax After Rebate + Surcharge) × {int(rules.CESS_RATE * 100)}%",
            ),
            CalculationFlowStage(
                stage_number=8,
                title="Estimated Tax Liability",
                subtitle="Final Calculated Payable Amount",
                description="The comprehensive annual tax liability prior to adjustment for TDS (Tax Deducted at Source) and advance tax payments.",
                formula="Estimated Tax = Tax After Rebate + Surcharge + Cess",
            ),
        ]

        glossary = [
            GlossaryTerm(
                term="Gross Income",
                short_definition="Total aggregate income earned from all sources before subtracting any deductions or exemptions.",
                detailed_explanation="Gross Income combines earnings across all 5 statutory heads of income (Salary, House Property, Capital Gains, Business/Profession, Other Sources). In FinStack, this includes your gross salary, bonus, interest income, and freelance/consulting earnings before applying any tax reliefs.",
                category="Income & Deductions",
                example="If your gross salary is ₹12,00,000 and you earned ₹25,000 in savings bank interest, your Gross Income is ₹12,25,000.",
            ),
            GlossaryTerm(
                term="Taxable Income",
                short_definition="The net income amount on which progressive tax slab rates are calculated after allowable deductions.",
                detailed_explanation="Under Section 2(45) of the Income Tax Act, Taxable Income (also called Net Total Income) is the figure remaining after subtracting all eligible exemptions (like HRA) and statutory deductions (Standard Deduction, Section 80C, Section 80D) from Gross Total Income.",
                category="Income & Deductions",
                example="Gross Income of ₹12,00,000 minus ₹50,000 Standard Deduction and ₹1,50,000 Section 80C yields ₹10,00,000 Taxable Income.",
            ),
            GlossaryTerm(
                term="Standard Deduction",
                short_definition=f"A flat statutory deduction of ₹{int(rules.STANDARD_DEDUCTION):,} from salary income with no investment proof required.",
                detailed_explanation="Governed by Section 16(ia) of the Income Tax Act. It provides flat, proof-free tax relief for salaried individuals and pensioners to account for work-related expenses. Available under BOTH Old and New Regimes.",
                category="Income & Deductions",
                statutory_reference="Section 16(ia)",
                example=f"A salaried individual with ₹8,00,000 gross salary pays tax on at most ₹{int(800000 - rules.STANDARD_DEDUCTION):,} before other deductions.",
            ),
            GlossaryTerm(
                term="HRA",
                short_definition="House Rent Allowance exemption for salaried employees paying rent for residential accommodation.",
                detailed_explanation="Under Section 10(13A) and Rule 2A, salaried employees receiving HRA from their employer can claim tax exemption based on actual rent paid, basic salary, and city of residence (50% for metro cities, 40% for non-metro). Permitted strictly under the Old Tax Regime.",
                category="Income & Deductions",
                statutory_reference="Section 10(13A) & Rule 2A",
                example="Paying ₹18,000/month rent in Mumbai with ₹50,000/month basic salary exempts eligible rent payments from taxable salary.",
            ),
            GlossaryTerm(
                term="80C",
                short_definition=f"Tax deduction up to ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['80C']):,} for eligible long-term investments and savings.",
                detailed_explanation="The most popular deduction section under the Old Tax Regime. Allows up to ₹1,50,000 reduction in taxable income for qualifying investments including EPF, PPF, ELSS mutual funds, Life Insurance Premiums, NSC, SSY, and principal repayment on residential home loans.",
                category="Income & Deductions",
                statutory_reference="Section 80C",
                example=f"Investing ₹1,50,000 across PPF and ELSS reduces your Old Regime taxable income by ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['80C']):,}, saving up to ₹46,800 in taxes in the 30% bracket.",
            ),
            GlossaryTerm(
                term="80D",
                short_definition=f"Tax deduction for health insurance premiums paid for self, family, and parents (up to ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['80D']):,}+).",
                detailed_explanation="Deduction under Chapter VI-A for mediclaim policies and preventive medical check-ups (up to ₹5,00,00). Provides ₹25,000 limit for self, spouse, and dependent children (₹50,000 if senior citizen), plus an additional ₹25,000 (or ₹50,000 for senior citizen parents). Old Regime only.",
                category="Income & Deductions",
                statutory_reference="Section 80D",
                example="Paying ₹25,000 for self-insurance and ₹50,000 for senior parents can claim up to ₹75,000 in total deductions under Old Regime.",
            ),
            GlossaryTerm(
                term="24(b)",
                short_definition=f"Tax deduction up to ₹{int(rules.DEDUCTION_LIMITS_OLD_REGIME['24B']):,} for interest paid on home loans for self-occupied property.",
                detailed_explanation="Section 24(b) permits interest paid on housing loans for acquisition or construction of self-occupied residential property to be deducted against 'Income from House Property' up to ₹2,00,000. This deduction is disallowed under the New Regime for self-occupied properties.",
                category="Income & Deductions",
                statutory_reference="Section 24(b)",
                example="If your annual home loan interest certificate shows ₹2,40,000, you can claim the maximum allowable ₹2,00,000 under Old Regime.",
            ),
            GlossaryTerm(
                term="Rebate",
                short_definition=f"Section 87A tax relief providing ₹0 tax liability for taxable incomes up to ₹{int(rules.NEW_REGIME_REBATE_87A_LIMIT):,} (New) or ₹{int(rules.OLD_REGIME_REBATE_87A_LIMIT):,} (Old).",
                detailed_explanation="Section 87A rebate is subtracted directly from calculated slab income tax. For FY 2024-25, resident individuals with net taxable income up to ₹7,00,000 in the New Regime receive full relief (up to ₹25,000), resulting in zero net tax payable. In Old Regime, the rebate limit is ₹5,00,000 (up to ₹12,500).",
                category="Taxes & Levies",
                statutory_reference="Section 87A",
                example=f"A New Regime taxable income of ₹6,80,000 generates ₹23,000 in base slab tax, which is fully neutralized to ₹0 by Section 87A rebate.",
            ),
            GlossaryTerm(
                term="Surcharge",
                short_definition="An additional tax percentage levied on the calculated income tax of individuals earning over ₹50 Lakhs.",
                detailed_explanation="Surcharge increases progressive taxation for high-income earners. Rates range from 10% (for income between ₹50 Lakhs and ₹1 Crore) up to 25% (in New Regime) and up to 37% (in Old Regime). Surcharge is calculated on the tax liability before cess, with marginal relief provisions.",
                category="Taxes & Levies",
                statutory_reference="Annual Finance Acts",
                example="An individual with ₹60 Lakhs taxable income incurs a 10% surcharge on their base tax liability.",
            ),
            GlossaryTerm(
                term="Cess",
                short_definition=f"A mandatory {int(rules.CESS_RATE * 100)}% Health and Education Cess levied on total income tax plus surcharge.",
                detailed_explanation="Introduced under Finance Act 2018 at 4%, the Health and Education Cess is dedicated to financing healthcare and educational infrastructure in rural and underprivileged communities in India. It is applied universally across both Old and New Regimes.",
                category="Taxes & Levies",
                statutory_reference="Finance Act, 2018",
                example="If income tax after rebate is ₹20,000, 4% Cess is ₹800, making the final payable amount ₹20,800.",
            ),
            GlossaryTerm(
                term="Financial Year",
                short_definition="The 12-month period spanning April 1 to March 31 during which your income is earned.",
                detailed_explanation="Commonly referred to as FY. Represents the statutory accounting cycle in India. For example, FY 2024-25 spans from 1 April 2024 to 31 March 2025. All income earned and tax-saving investments made within these dates are credited to this Financial Year.",
                category="Timeline",
                example="Salary received from 1 April 2024 to 31 March 2025 falls under Financial Year 2024-25.",
            ),
            GlossaryTerm(
                term="Assessment Year",
                short_definition="The 12-month period immediately following the Financial Year when earned income is evaluated and returns filed.",
                detailed_explanation="Commonly referred to as AY. Represents the year in which the Income Tax Department assesses your income from the preceding Financial Year, and during which you submit your Income Tax Return (ITR). For FY 2024-25, the corresponding Assessment Year is AY 2025-26.",
                category="Timeline",
                example="You file your ITR for FY 2024-25 income during Assessment Year 2025-26 (typically by July 31, 2025).",
            ),
        ]

        return TaxEducationResponse(
            financial_year=financial_year,
            assessment_year=assessment_year,
            fy_date_span=fy_date_span,
            ay_date_span=ay_date_span,
            standard_deduction=float(rules.STANDARD_DEDUCTION),
            cess_rate_percent=float(rules.CESS_RATE * 100),
            new_regime=new_regime_summary,
            old_regime=old_regime_summary,
            deduction_limits=deduction_limits,
            calculation_flow_stages=calculation_flow_stages,
            glossary=glossary,
            disclaimer=(
                f"Statutory rules, slab rates, and deduction limits reflect official provisions for Financial Year {financial_year} "
                f"(Assessment Year {assessment_year}). This information is provided strictly for educational and estimation purposes "
                f"and does not constitute certified tax advice or an official assessment."
            ),
        )
