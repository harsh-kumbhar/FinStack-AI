"""
Tax Estimator Calculation Engine — Hardened Test Suite
Batch 1.1: Rule accuracy, provenance, and boundary verification.

Financial Year: 2024-25 (Assessment Year 2025-26)
Authoritative Source: Income Tax Department, Government of India
  https://incometaxindia.gov.in/Tutorials/1.%20Tax%20rates.pdf

All expected values in this file are derived from manual calculations
against the authoritative tax rules. DO NOT modify expected values to
make tests pass — investigate the engine instead.
"""

import pytest
from decimal import Decimal
from backend.modules.tax_estimator.engine import (
    calculate_tax,
    round_to_nearest_10,
    calculate_tax_from_slabs,
    calculate_surcharge,
)
from backend.modules.tax_estimator.domain import TaxEstimatorInput
from backend.modules.tax_estimator.rules.registry import get_tax_rules
from backend.modules.tax_estimator.rules import fy_2024_25 as RULES_FY2425


# =============================================================================
# SECTION 1: Rule Registry Tests
# =============================================================================

class TestRuleRegistry:
    def test_supported_fy_2024_25_returns_module(self):
        rules = get_tax_rules('2024-25')
        assert rules is not None

    def test_unsupported_fy_raises(self):
        with pytest.raises(ValueError, match="not supported or verified"):
            get_tax_rules('2023-24')

    def test_unsupported_fy_blank_raises(self):
        with pytest.raises(ValueError, match="not supported or verified"):
            get_tax_rules('')

    def test_unsupported_future_fy_raises(self):
        with pytest.raises(ValueError, match="not supported or verified"):
            get_tax_rules('2030-31')


# =============================================================================
# SECTION 2: Rule Constant Verification (FY 2024-25)
# Source: Income Tax Dept – https://incometaxindia.gov.in/Tutorials/1.%20Tax%20rates.pdf
# =============================================================================

class TestRuleConstants:
    """
    Verify that every constant in fy_2024_25.py matches the authoritative source.
    These tests act as provenance guards — a future developer MUST update these
    tests with evidence if any constant is changed.
    """

    def test_standard_deduction_is_50k(self):
        # Finance Act 2023 retained ₹50,000 std deduction for salaried individuals
        assert RULES_FY2425.STANDARD_DEDUCTION == Decimal('50000')

    def test_cess_rate_is_4_percent(self):
        # Health and Education Cess: 4% on tax + surcharge (Finance Act 2018+)
        assert RULES_FY2425.CESS_RATE == Decimal('0.04')

    def test_old_regime_slab_thresholds(self):
        # For individual below 60 years: 0–2.5L, 2.5–5L, 5–10L, >10L
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        assert slabs[0][0] == Decimal('250000')
        assert slabs[1][0] == Decimal('500000')
        assert slabs[2][0] == Decimal('1000000')
        assert slabs[3][0] == Decimal('Infinity')

    def test_old_regime_slab_rates(self):
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        assert slabs[0][1] == Decimal('0.00')   # 0%
        assert slabs[1][1] == Decimal('0.05')   # 5%
        assert slabs[2][1] == Decimal('0.20')   # 20%
        assert slabs[3][1] == Decimal('0.30')   # 30%

    def test_old_regime_87a_rebate_limit(self):
        # Sec 87A rebate: up to ₹5L taxable income (old regime)
        assert RULES_FY2425.OLD_REGIME_REBATE_87A_LIMIT == Decimal('500000')

    def test_old_regime_87a_rebate_max(self):
        # Max rebate under old regime: ₹12,500
        assert RULES_FY2425.OLD_REGIME_REBATE_87A_MAX == Decimal('12500')

    def test_old_regime_80c_limit(self):
        # Section 80C: max ₹1,50,000
        assert RULES_FY2425.DEDUCTION_LIMITS_OLD_REGIME['80C'] == Decimal('150000')

    def test_old_regime_80d_limit(self):
        # Section 80D (non-senior self): ₹25,000
        assert RULES_FY2425.DEDUCTION_LIMITS_OLD_REGIME['80D'] == Decimal('25000')

    def test_old_regime_80tta_limit(self):
        # Section 80TTA: ₹10,000
        assert RULES_FY2425.DEDUCTION_LIMITS_OLD_REGIME['80TTA'] == Decimal('10000')

    def test_new_regime_slab_thresholds(self):
        # New regime slabs: 0-3L, 3-6L, 6-9L, 9-12L, 12-15L, >15L
        slabs = RULES_FY2425.NEW_REGIME_SLABS
        assert slabs[0][0] == Decimal('300000')
        assert slabs[1][0] == Decimal('600000')
        assert slabs[2][0] == Decimal('900000')
        assert slabs[3][0] == Decimal('1200000')
        assert slabs[4][0] == Decimal('1500000')
        assert slabs[5][0] == Decimal('Infinity')

    def test_new_regime_slab_rates(self):
        slabs = RULES_FY2425.NEW_REGIME_SLABS
        assert slabs[0][1] == Decimal('0.00')   # 0%
        assert slabs[1][1] == Decimal('0.05')   # 5%
        assert slabs[2][1] == Decimal('0.10')   # 10%
        assert slabs[3][1] == Decimal('0.15')   # 15%
        assert slabs[4][1] == Decimal('0.20')   # 20%
        assert slabs[5][1] == Decimal('0.30')   # 30%

    def test_new_regime_87a_rebate_limit(self):
        # New regime 87A: up to ₹7L taxable income
        assert RULES_FY2425.NEW_REGIME_REBATE_87A_LIMIT == Decimal('700000')

    def test_new_regime_87a_rebate_max(self):
        # New regime max rebate: ₹25,000
        assert RULES_FY2425.NEW_REGIME_REBATE_87A_MAX == Decimal('25000')

    def test_new_regime_surcharge_thresholds(self):
        # New regime surcharge max is 25% (unlike old regime's 37%)
        surcharges = RULES_FY2425.SURCHARGE_SLABS_NEW_REGIME
        assert surcharges[0][0] == Decimal('5000000')    # 50L boundary
        assert surcharges[1][0] == Decimal('10000000')   # 1Cr boundary
        assert surcharges[2][0] == Decimal('20000000')   # 2Cr boundary
        assert surcharges[3][0] == Decimal('Infinity')

    def test_new_regime_surcharge_rates(self):
        surcharges = RULES_FY2425.SURCHARGE_SLABS_NEW_REGIME
        assert surcharges[0][1] == Decimal('0.00')   # below 50L: 0%
        assert surcharges[1][1] == Decimal('0.10')   # 50L–1Cr: 10%
        assert surcharges[2][1] == Decimal('0.15')   # 1Cr–2Cr: 15%
        assert surcharges[3][1] == Decimal('0.25')   # >2Cr: 25% (capped for new regime)

    def test_old_regime_surcharge_includes_37pct(self):
        # Old regime allows 37% surcharge above 5Cr
        surcharges = RULES_FY2425.SURCHARGE_SLABS_OLD_REGIME
        assert surcharges[4][0] == Decimal('Infinity')
        assert surcharges[4][1] == Decimal('0.37')


# =============================================================================
# SECTION 3: Input Validation
# =============================================================================

class TestInputValidation:
    def test_negative_salary_rejected(self):
        with pytest.raises(ValueError, match="cannot be negative"):
            TaxEstimatorInput(financial_year='2024-25', gross_salary=-1)

    def test_negative_other_income_rejected(self):
        with pytest.raises(ValueError, match="cannot be negative"):
            TaxEstimatorInput(financial_year='2024-25', other_income=-500)

    def test_negative_deduction_80c_rejected(self):
        with pytest.raises(ValueError, match="cannot be negative"):
            TaxEstimatorInput(financial_year='2024-25', deduction_80c=-100)

    def test_negative_deduction_80d_rejected(self):
        with pytest.raises(ValueError, match="cannot be negative"):
            TaxEstimatorInput(financial_year='2024-25', deduction_80d=-100)

    def test_negative_deduction_80tta_rejected(self):
        with pytest.raises(ValueError, match="cannot be negative"):
            TaxEstimatorInput(financial_year='2024-25', deduction_80tta=-100)

    def test_zero_salary_is_valid(self):
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=0)
        assert inp.gross_salary == Decimal('0.0')

    def test_invalid_fy_raises_on_calculate(self):
        inp = TaxEstimatorInput(financial_year='2019-20', gross_salary=500000)
        with pytest.raises(ValueError, match="not supported or verified"):
            calculate_tax(inp)

    def test_large_valid_salary_accepted(self):
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=100000000)
        assert inp.gross_salary == Decimal('100000000')


# =============================================================================
# SECTION 4: Rounding Tests (Section 288B)
# =============================================================================

class TestRounding:
    """Round to nearest multiple of 10, ROUND_HALF_UP."""

    def test_below_5_rounds_down(self):
        assert round_to_nearest_10(Decimal('104')) == Decimal('100')

    def test_exactly_5_rounds_up(self):
        # 5.0 / 10 = 0.5 -> ROUND_HALF_UP -> 1 -> 10
        assert round_to_nearest_10(Decimal('5')) == Decimal('10')

    def test_above_5_rounds_up(self):
        assert round_to_nearest_10(Decimal('106')) == Decimal('110')

    def test_exact_multiple_unchanged(self):
        assert round_to_nearest_10(Decimal('65000')) == Decimal('65000')

    def test_zero_rounds_to_zero(self):
        assert round_to_nearest_10(Decimal('0')) == Decimal('0')

    def test_fractional_below_5_rounds_down(self):
        # 104.9 / 10 = 10.49 -> rounds to 10 -> 100
        assert round_to_nearest_10(Decimal('104.9')) == Decimal('100')

    def test_fractional_at_5_rounds_up(self):
        # 105.0 / 10 = 10.5 -> ROUND_HALF_UP -> 11 -> 110
        assert round_to_nearest_10(Decimal('105.0')) == Decimal('110')

    def test_high_value_rounding(self):
        # 1234567 -> 1234570
        assert round_to_nearest_10(Decimal('1234567')) == Decimal('1234570')

    def test_very_small_value_below_5(self):
        # 4 -> rounds to 0
        assert round_to_nearest_10(Decimal('4')) == Decimal('0')


# =============================================================================
# SECTION 5: Slab Engine Tests
# =============================================================================

class TestSlabEngine:
    def test_income_below_first_slab_is_zero(self):
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('100000'), slabs) == Decimal('0')

    def test_income_exactly_at_first_old_slab_boundary(self):
        # Exactly at 2.5L: all in 0% band -> 0
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('250000'), slabs) == Decimal('0')

    def test_income_just_above_first_old_slab_boundary(self):
        # 2,50,001: 1 rupee at 5% = 0.05
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        tax = calculate_tax_from_slabs(Decimal('250001'), slabs)
        assert tax == Decimal('0.05')

    def test_old_regime_5L_taxable(self):
        # 2.5L@0 + 2.5L@5% = 12500
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('500000'), slabs) == Decimal('12500')

    def test_old_regime_10L_taxable(self):
        # 2.5L@0 + 2.5L@5% + 5L@20% = 12500 + 100000 = 112500
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('1000000'), slabs) == Decimal('112500')

    def test_old_regime_15L_taxable(self):
        # 2.5L@0 + 2.5L@5% + 5L@20% + 5L@30% = 12500 + 100000 + 150000 = 262500
        slabs = RULES_FY2425.OLD_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('1500000'), slabs) == Decimal('262500')

    def test_new_regime_6L_taxable(self):
        # 3L@0 + 3L@5% = 15000
        slabs = RULES_FY2425.NEW_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('600000'), slabs) == Decimal('15000')

    def test_new_regime_9L_taxable(self):
        # 3L@0 + 3L@5% + 3L@10% = 15000 + 30000 = 45000
        slabs = RULES_FY2425.NEW_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('900000'), slabs) == Decimal('45000')

    def test_new_regime_12L_taxable(self):
        # 3@0 + 3@5% + 3@10% + 3@15% = 15000 + 30000 + 45000 = 90000
        slabs = RULES_FY2425.NEW_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('1200000'), slabs) == Decimal('90000')

    def test_new_regime_15L_taxable(self):
        # 3@0 + 3@5% + 3@10% + 3@15% + 3@20% = 15000+30000+45000+60000 = 150000
        slabs = RULES_FY2425.NEW_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('1500000'), slabs) == Decimal('150000')

    def test_zero_income_produces_zero_tax(self):
        slabs = RULES_FY2425.NEW_REGIME_SLABS
        assert calculate_tax_from_slabs(Decimal('0'), slabs) == Decimal('0')


# =============================================================================
# SECTION 6: Surcharge Tests
# =============================================================================

class TestSurcharge:
    """
    Surcharge thresholds (FY 2024-25):
      New Regime: 0% (<=50L), 10% (50L-1Cr), 15% (1Cr-2Cr), 25% (>2Cr)
      Old Regime: 0% (<=50L), 10% (50L-1Cr), 15% (1Cr-2Cr), 25% (2Cr-5Cr), 37% (>5Cr)
    EXPLICIT EXCLUSION: Surcharge marginal relief is NOT implemented in V1.
    """

    def test_no_surcharge_below_50L_new(self):
        tax = Decimal('1000000')
        s = calculate_surcharge(tax, Decimal('4999999'), RULES_FY2425.SURCHARGE_SLABS_NEW_REGIME)
        assert s == Decimal('0')

    def test_no_surcharge_exactly_50L_new(self):
        tax = Decimal('1000000')
        s = calculate_surcharge(tax, Decimal('5000000'), RULES_FY2425.SURCHARGE_SLABS_NEW_REGIME)
        assert s == Decimal('0')

    def test_10pct_surcharge_just_above_50L_new(self):
        tax = Decimal('1000000')
        s = calculate_surcharge(tax, Decimal('5000001'), RULES_FY2425.SURCHARGE_SLABS_NEW_REGIME)
        assert s == Decimal('100000.0')   # 10%

    def test_15pct_surcharge_above_1cr_new(self):
        tax = Decimal('2000000')
        s = calculate_surcharge(tax, Decimal('11000000'), RULES_FY2425.SURCHARGE_SLABS_NEW_REGIME)
        assert s == Decimal('300000.00')  # 15%

    def test_25pct_surcharge_above_2cr_new(self):
        tax = Decimal('5000000')
        s = calculate_surcharge(tax, Decimal('21000000'), RULES_FY2425.SURCHARGE_SLABS_NEW_REGIME)
        assert s == Decimal('1250000.0')  # 25%

    def test_37pct_surcharge_above_5cr_old(self):
        tax = Decimal('10000000')
        s = calculate_surcharge(tax, Decimal('51000000'), RULES_FY2425.SURCHARGE_SLABS_OLD_REGIME)
        assert s == Decimal('3700000.0')  # 37%

    def test_no_surcharge_below_50L_old(self):
        tax = Decimal('500000')
        s = calculate_surcharge(tax, Decimal('4999999'), RULES_FY2425.SURCHARGE_SLABS_OLD_REGIME)
        assert s == Decimal('0')

    def test_full_calculation_with_surcharge_60L(self):
        """
        REF CASE: New Regime, ₹60L gross salary
        Taxable = 60L - 50k = 59.5L
        Tax on income: 3L@0 + 3L@5% + 3L@10% + 3L@15% + 3L@20% + 44.5L@30%
          = 0 + 15000 + 30000 + 45000 + 60000 + 1335000 = 1485000
        Surcharge @10% = 148500
        Cess @4% on (1485000 + 148500) = 65340
        Total = 1485000 + 148500 + 65340 = 1698840
        """
        inputs = TaxEstimatorInput(financial_year='2024-25', gross_salary=6000000)
        r = calculate_tax(inputs)
        assert r.new_regime.taxable_income == Decimal('5950000')
        assert r.new_regime.tax_on_income == Decimal('1485000')
        assert r.new_regime.surcharge == Decimal('148500')
        assert r.new_regime.health_and_education_cess == Decimal('65340')
        assert r.new_regime.total_tax_liability == Decimal('1698840')

    def test_full_calculation_with_surcharge_2cr(self):
        """
        REF CASE: New Regime, ₹2.1Cr gross salary
        Taxable = 2.1Cr - 50k = 2.095Cr
        Tax: 0+15k+30k+45k+60k + (2.095Cr-15L)*30% = 150000 + 5835000 = 5985000
        Surcharge @25% = 1496250
        Cess @4% on (5985000+1496250) = 299250
        Total = 5985000+1496250+299250 = 7780500
        """
        inputs = TaxEstimatorInput(financial_year='2024-25', gross_salary=21000000)
        r = calculate_tax(inputs)
        assert r.new_regime.taxable_income == Decimal('20950000')
        assert r.new_regime.tax_on_income == Decimal('5985000')
        assert r.new_regime.surcharge == Decimal('1496250')
        assert r.new_regime.total_tax_liability == Decimal('7780500')


# =============================================================================
# SECTION 7: Rebate 87A Tests
# =============================================================================

class TestRebate87A:
    """
    Old Regime: Full rebate up to ₹12,500 when taxable income ≤ 5L.
    New Regime: Full rebate up to ₹25,000 when taxable income ≤ 7L.
                Marginal relief applies when taxable income > 7L but tax > (income - 7L).
    """

    def test_old_regime_at_5L_exact_taxable_full_rebate(self):
        """
        REF CASE: Salary ₹5.5L → Taxable = 5L → Tax = 12,500 → Rebate = 12,500 → Net = 0
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=550000)
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('500000')
        assert r.old_regime.tax_on_income == Decimal('12500')
        assert r.old_regime.rebate_87a == Decimal('12500')
        assert r.old_regime.total_tax_liability == Decimal('0')

    def test_old_regime_just_above_5L_no_rebate(self):
        """
        REF CASE: Salary ₹5.6L → Taxable = 5.1L → Tax = 14,500 → No rebate (>5L) → Cess
        Tax: 2.5L@0 + 2.5L@5% + 0.1L@20% = 12500 + 2000 = 14500
        Cess: 14500 * 4% = 580
        Total = 14500 + 580 = 15080
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=560000)
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('510000')
        assert r.old_regime.tax_on_income == Decimal('14500')
        assert r.old_regime.rebate_87a == Decimal('0')
        assert r.old_regime.total_tax_liability == Decimal('15080')

    def test_new_regime_at_7L_exact_taxable_full_rebate(self):
        """
        REF CASE: Salary ₹7.5L → Taxable = 7L → Tax = 25,000 → Rebate = 25,000 → Net = 0
        Tax: 3L@0 + 3L@5% + 1L@10% = 15000 + 10000 = 25000
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=750000)
        r = calculate_tax(inp)
        assert r.new_regime.taxable_income == Decimal('700000')
        assert r.new_regime.tax_on_income == Decimal('25000')
        assert r.new_regime.rebate_87a == Decimal('25000')
        assert r.new_regime.total_tax_liability == Decimal('0')

    def test_new_regime_above_7L_marginal_relief(self):
        """
        REF CASE: Salary ₹7.6L → Taxable = 7.1L (just above 7L limit)
        Tax: 3L@0 + 3L@5% + 1.1L@10% = 15000 + 11000 = 26000
        Marginal relief: excess = 7.1L - 7L = 10000; rebate = 26000 - 10000 = 16000
        Tax after rebate = 10000. Cess = 400. Total = 10400.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=760000)
        r = calculate_tax(inp)
        assert r.new_regime.taxable_income == Decimal('710000')
        assert r.new_regime.tax_on_income == Decimal('26000')
        assert r.new_regime.rebate_87a == Decimal('16000')
        assert r.new_regime.tax_after_rebate == Decimal('10000')
        assert r.new_regime.total_tax_liability == Decimal('10400')

    def test_new_regime_below_7L_full_rebate(self):
        """
        REF CASE: Salary ₹6.5L → Taxable = 6L → Tax = 15,000 → Rebate = 15,000 → Net = 0
        Tax: 3L@0 + 3L@5% = 15000. Full rebate since 6L < 7L.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=650000)
        r = calculate_tax(inp)
        assert r.new_regime.taxable_income == Decimal('600000')
        assert r.new_regime.rebate_87a == Decimal('15000')
        assert r.new_regime.total_tax_liability == Decimal('0')

    def test_zero_income_no_rebate_needed(self):
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=0)
        r = calculate_tax(inp)
        assert r.old_regime.rebate_87a == Decimal('0')
        assert r.new_regime.rebate_87a == Decimal('0')


# =============================================================================
# SECTION 8: Deduction Tests
# =============================================================================

class TestDeductions:
    def test_no_deductions_old_regime(self):
        """No deductions entered; only standard deduction applies."""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000)
        r = calculate_tax(inp)
        assert r.old_regime.total_chapter_vi_a_deductions == Decimal('0')
        assert r.old_regime.taxable_income == Decimal('750000')

    def test_80c_within_limit(self):
        """₹1L of 80C on ₹8L salary: taxable = 8L - 50k - 1L = 6.5L"""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000, deduction_80c=100000)
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('650000')

    def test_80c_exactly_at_limit(self):
        """₹1.5L of 80C: fully applied."""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000, deduction_80c=150000)
        r = calculate_tax(inp)
        assert r.old_regime.total_chapter_vi_a_deductions == Decimal('150000')

    def test_80c_above_limit_gets_capped(self):
        """
        80C claim ₹2L: capped to ₹1.5L.
        Decision (logged in TECHNICAL_DECISION_LOG): cap silently — not reject.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000, deduction_80c=200000)
        r = calculate_tax(inp)
        # Should apply only 1.5L
        assert r.old_regime.total_chapter_vi_a_deductions == Decimal('150000')

    def test_80d_exactly_at_limit(self):
        """₹25k of 80D applied in old regime."""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000, deduction_80d=25000)
        r = calculate_tax(inp)
        assert r.old_regime.total_chapter_vi_a_deductions == Decimal('25000')

    def test_80d_above_limit_gets_capped(self):
        """₹50k 80D claim capped to ₹25k."""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000, deduction_80d=50000)
        r = calculate_tax(inp)
        assert r.old_regime.total_chapter_vi_a_deductions == Decimal('25000')

    def test_80tta_capped_at_10k(self):
        """
        REF CASE: ₹50k other income, ₹20k 80TTA claimed → capped to ₹10k.
        Taxable = 3L + 50k - 50k(std) - 10k(tta) = 2.9L  (below 2.5L old threshold is 0)
        """
        inp = TaxEstimatorInput(
            financial_year='2024-25',
            gross_salary=300000,
            other_income=50000,
            deduction_80tta=20000
        )
        r = calculate_tax(inp)
        assert r.old_regime.total_chapter_vi_a_deductions == Decimal('10000')
        assert r.old_regime.taxable_income == Decimal('290000')

    def test_80tta_capped_by_other_income(self):
        """
        80TTA cannot exceed actual other income.
        ₹5k other_income, 80TTA claim ₹10k → capped to ₹5k.
        """
        inp = TaxEstimatorInput(
            financial_year='2024-25',
            gross_salary=500000,
            other_income=5000,
            deduction_80tta=10000
        )
        r = calculate_tax(inp)
        # min(10000, 10000_80tta_limit, 5000_other_income) = 5000
        assert r.old_regime.total_chapter_vi_a_deductions == Decimal('5000')

    def test_deductions_not_applied_in_new_regime(self):
        """80C/80D/80TTA must NOT reduce taxable income in new regime."""
        inp = TaxEstimatorInput(
            financial_year='2024-25',
            gross_salary=800000,
            deduction_80c=150000,
            deduction_80d=25000
        )
        r = calculate_tax(inp)
        assert r.new_regime.total_chapter_vi_a_deductions == Decimal('0')
        # Taxable in new regime = 8L - 50k = 7.5L regardless
        assert r.new_regime.taxable_income == Decimal('750000')

    def test_standard_deduction_limited_to_salary(self):
        """If salary < 50k, standard deduction should equal salary, not 50k."""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=30000)
        r = calculate_tax(inp)
        assert r.old_regime.standard_deduction == Decimal('30000')
        assert r.old_regime.taxable_income == Decimal('0')


# =============================================================================
# SECTION 9: Full End-to-End Reference Cases
# =============================================================================

class TestReferenceCalculations:
    """
    All expected values are manually derived from authoritative rules.
    Source: Income Tax Dept FY 2024-25 slabs.
    """

    def test_rc01_zero_income(self):
        """RC-01: Zero income, all regimes produce zero tax."""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=0)
        r = calculate_tax(inp)
        assert r.old_regime.total_tax_liability == Decimal('0')
        assert r.new_regime.total_tax_liability == Decimal('0')

    def test_rc02_very_low_income_below_threshold(self):
        """
        RC-02: ₹2L salary → taxable = ₹1.5L (both regimes) → zero tax (below min slab).
        Old Regime: 0-2.5L at 0%.  New Regime: 0-3L at 0%.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=200000)
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('150000')
        assert r.old_regime.total_tax_liability == Decimal('0')
        assert r.new_regime.total_tax_liability == Decimal('0')

    def test_rc03_old_regime_first_slab_boundary(self):
        """
        RC-03: Old Regime, taxable = ₹2,50,000 exactly.
        Tax = 0 (all in 0% band).
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=300000)
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('250000')
        assert r.old_regime.tax_on_income == Decimal('0')
        assert r.old_regime.total_tax_liability == Decimal('0')

    def test_rc04_old_regime_at_5L_87a_wipes_tax(self):
        """
        RC-04: Old Regime, taxable = ₹5L. Tax = ₹12,500 → full 87A rebate → ₹0.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=550000)
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('500000')
        assert r.old_regime.tax_on_income == Decimal('12500')
        assert r.old_regime.rebate_87a == Decimal('12500')
        assert r.old_regime.total_tax_liability == Decimal('0')

    def test_rc05_old_regime_just_above_87a_limit(self):
        """
        RC-05: Salary ₹5.6L → Old taxable ₹5.1L → Tax ₹14,500 → No rebate.
        Cess: 14500 * 4% = 580. Total = 15080.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=560000)
        r = calculate_tax(inp)
        assert r.old_regime.total_tax_liability == Decimal('15080')
        assert r.old_regime.rebate_87a == Decimal('0')

    def test_rc06_new_regime_at_7l_full_rebate(self):
        """
        RC-06: New Regime, taxable = ₹7L. Tax = ₹25k → full 87A rebate → ₹0.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=750000)
        r = calculate_tax(inp)
        assert r.new_regime.taxable_income == Decimal('700000')
        assert r.new_regime.rebate_87a == Decimal('25000')
        assert r.new_regime.total_tax_liability == Decimal('0')

    def test_rc07_new_regime_marginal_relief_710k_taxable(self):
        """
        RC-07: New Regime, taxable = ₹7.1L → Marginal Relief applies.
        Tax = ₹26k, relief = ₹16k, after = ₹10k, cess = ₹400, total = ₹10,400.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=760000)
        r = calculate_tax(inp)
        assert r.new_regime.total_tax_liability == Decimal('10400')

    def test_rc08_salary_8l_both_regimes(self):
        """
        RC-08: ₹8L salary.
        Old: 7.5L taxable. Tax = 2.5L@0 + 2.5L@5% + 2.5L@20% = 12500+50000 = 62500. Cess=2500. Total=65000.
        New: 7.5L taxable. Tax = 3L@0 + 3L@5% + 1.5L@10% = 15000+15000 = 30000. Cess=1200. Total=31200.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000)
        r = calculate_tax(inp)
        assert r.old_regime.tax_on_income == Decimal('62500')
        assert r.old_regime.total_tax_liability == Decimal('65000')
        assert r.new_regime.tax_on_income == Decimal('30000')
        assert r.new_regime.total_tax_liability == Decimal('31200')
        assert r.recommended_regime == "New Regime"

    def test_rc09_old_regime_with_max_80c_80d(self):
        """
        RC-09: ₹12L salary, 80C=₹1.5L, 80D=₹25k.
        Old: taxable = 12L - 50k - 1.5L - 25k = 9.75L.
        Tax: 2.5L@0 + 2.5L@5% + 4.75L@20% = 12500 + 95000 = 107500.
        Cess: 107500 * 4% = 4300. Total = 111800.
        """
        inp = TaxEstimatorInput(
            financial_year='2024-25',
            gross_salary=1200000,
            deduction_80c=150000,
            deduction_80d=25000
        )
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('975000')
        assert r.old_regime.tax_on_income == Decimal('107500')
        assert r.old_regime.total_tax_liability == Decimal('111800')

    def test_rc10_80tta_capping(self):
        """
        RC-10: ₹3L salary + ₹50k other_income, 80TTA=₹20k → capped at ₹10k.
        Old taxable = 3L + 50k - 50k(std) - 10k(tta) = 2.9L → 0% band → ₹0 tax.
        """
        inp = TaxEstimatorInput(
            financial_year='2024-25',
            gross_salary=300000,
            other_income=50000,
            deduction_80tta=20000
        )
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('290000')
        assert r.old_regime.total_tax_liability == Decimal('0')

    def test_rc11_surcharge_above_50l_new_regime(self):
        """RC-11: Already verified in surcharge section."""
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=6000000)
        r = calculate_tax(inp)
        assert r.new_regime.surcharge > Decimal('0')
        assert r.new_regime.total_tax_liability == Decimal('1698840')

    def test_rc12_high_income_30pct_slab_old(self):
        """
        RC-12: Old Regime, ₹20L salary.
        Taxable = 20L - 50k = 19.5L.
        Tax: 2.5L@0 + 2.5L@5% + 5L@20% + 9.5L@30% = 12500+100000+285000 = 397500.
        Cess: 397500*4% = 15900. Total = 413400.
        """
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=2000000)
        r = calculate_tax(inp)
        assert r.old_regime.taxable_income == Decimal('1950000')
        assert r.old_regime.tax_on_income == Decimal('397500')
        assert r.old_regime.total_tax_liability == Decimal('413400')


# =============================================================================
# SECTION 10: Determinism
# =============================================================================

class TestDeterminism:
    def test_same_input_always_same_output(self):
        inp = TaxEstimatorInput(
            financial_year='2024-25',
            gross_salary=1000000,
            deduction_80c=100000
        )
        r1 = calculate_tax(inp)
        r2 = calculate_tax(inp)
        r3 = calculate_tax(inp)
        assert r1.new_regime.total_tax_liability == r2.new_regime.total_tax_liability
        assert r2.new_regime.total_tax_liability == r3.new_regime.total_tax_liability
        assert r1.old_regime.total_tax_liability == r3.old_regime.total_tax_liability

    def test_regimes_independently_calculated(self):
        """Old and New regime results must differ when deductions are provided."""
        inp = TaxEstimatorInput(
            financial_year='2024-25',
            gross_salary=1500000,
            deduction_80c=150000,
            deduction_80d=25000
        )
        r = calculate_tax(inp)
        # New regime ignores deductions → different taxable income
        assert r.old_regime.taxable_income != r.new_regime.taxable_income
        assert r.old_regime.total_tax_liability != r.new_regime.total_tax_liability

    def test_recommendation_matches_lower_tax(self):
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000)
        r = calculate_tax(inp)
        if r.new_regime.total_tax_liability <= r.old_regime.total_tax_liability:
            assert r.recommended_regime == "New Regime"
        else:
            assert r.recommended_regime == "Old Regime"

    def test_tax_savings_is_positive(self):
        inp = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000)
        r = calculate_tax(inp)
        assert r.tax_savings >= Decimal('0')
