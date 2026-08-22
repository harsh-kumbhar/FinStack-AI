import pytest
from decimal import Decimal
from backend.modules.tax_estimator.engine import calculate_tax, round_to_nearest_10, calculate_tax_from_slabs
from backend.modules.tax_estimator.domain import TaxEstimatorInput
from backend.modules.tax_estimator.rules.registry import get_tax_rules

def test_rounding_to_nearest_10():
    assert round_to_nearest_10(Decimal('104.4')) == Decimal('100')
    assert round_to_nearest_10(Decimal('104.5')) == Decimal('100')  # Wait, standard rounding for .5? Actually standard round half up for 4.5 is 5, but for 104.5 it rounds to 100 or 110?
    # Python ROUND_HALF_UP: 10.45 -> 10.5
    # Let's test standard values
    assert round_to_nearest_10(Decimal('104.9')) == Decimal('100')
    assert round_to_nearest_10(Decimal('105.0')) == Decimal('110')
    assert round_to_nearest_10(Decimal('109.9')) == Decimal('110')
    assert round_to_nearest_10(Decimal('101.0')) == Decimal('100')

def test_tax_slab_calculation():
    slabs = [
        (Decimal('300000'), Decimal('0.00')),
        (Decimal('600000'), Decimal('0.05')),
        (Decimal('Infinity'), Decimal('0.10'))
    ]
    # Income 2.5L -> tax 0
    assert calculate_tax_from_slabs(Decimal('250000'), slabs) == Decimal('0')
    # Income 4L -> (4L - 3L) * 5% = 5000
    assert calculate_tax_from_slabs(Decimal('400000'), slabs) == Decimal('5000')
    # Income 8L -> 3L*0 + 3L*5% + 2L*10% = 0 + 15000 + 20000 = 35000
    assert calculate_tax_from_slabs(Decimal('800000'), slabs) == Decimal('35000')

def test_zero_income():
    inputs = TaxEstimatorInput(financial_year='2024-25', gross_salary=0)
    result = calculate_tax(inputs)
    assert result.old_regime.taxable_income == Decimal('0')
    assert result.new_regime.taxable_income == Decimal('0')
    assert result.old_regime.total_tax_liability == Decimal('0')
    assert result.new_regime.total_tax_liability == Decimal('0')

def test_salary_only_new_regime_rebate():
    # 7L gross salary -> standard deduction 50k -> 6.5L taxable
    # 6.5L is <= 7L rebate limit in new regime. So tax should be 0.
    inputs = TaxEstimatorInput(financial_year='2024-25', gross_salary=700000)
    result = calculate_tax(inputs)
    assert result.new_regime.taxable_income == Decimal('650000')
    assert result.new_regime.total_tax_liability == Decimal('0')
    assert result.new_regime.rebate_87a > Decimal('0')

def test_salary_above_rebate_limit():
    # 8L gross salary -> standard deduction 50k -> 7.5L taxable
    # Old Regime: 7.5L taxable. Slabs: 2.5L free, 2.5L@5% (12.5k), 2.5L@20% (50k) = 62500. Cess 4% = 2500. Total = 65000.
    # New Regime: 7.5L taxable. Slabs: 3L free, 3L@5% (15k), 1.5L@10% (15k) = 30000. Cess 4% = 1200. Total = 31200.
    inputs = TaxEstimatorInput(financial_year='2024-25', gross_salary=800000)
    result = calculate_tax(inputs)
    
    assert result.old_regime.taxable_income == Decimal('750000')
    assert result.old_regime.tax_on_income == Decimal('62500')
    assert result.old_regime.total_tax_liability == Decimal('65000')
    
    assert result.new_regime.taxable_income == Decimal('750000')
    assert result.new_regime.tax_on_income == Decimal('30000')
    assert result.new_regime.total_tax_liability == Decimal('31200')
    
    assert result.recommended_regime == "New Regime"
    assert result.tax_savings == Decimal('33800')

def test_deductions_old_regime_benefit():
    # 10L gross salary, 80C=1.5L, 80D=25k
    # Old Regime: 10L - 50k (std) - 1.5L - 25k = 7.75L taxable. 
    #   Tax = 12.5k + 2.75L*20% = 12.5k + 55k = 67.5k. Cess = 2700. Total = 70200.
    # New Regime: 10L - 50k (std) = 9.5L taxable.
    #   Tax = 15k (3-6L) + 30k (6-9L) + 7.5k (9-9.5L@15%) = 52.5k. Cess = 2100. Total = 54600.
    # Wait, new regime still better here? Let's check.
    inputs = TaxEstimatorInput(
        financial_year='2024-25', 
        gross_salary=1000000,
        deduction_80c=150000,
        deduction_80d=25000
    )
    result = calculate_tax(inputs)
    assert result.old_regime.taxable_income == Decimal('775000')
    assert result.old_regime.total_tax_liability == Decimal('70200')
    assert result.new_regime.taxable_income == Decimal('950000')
    assert result.new_regime.total_tax_liability == Decimal('54600')

def test_high_income_surcharge():
    # 60L gross salary
    # New Regime: 60L - 50k = 59.5L taxable.
    # Slabs: 0-3: 0, 3-6: 15k, 6-9: 30k, 9-12: 45k, 12-15: 60k, >15: 44.5L * 30% = 13.35L
    # Total tax on income = 15k+30k+45k+60k+13.35L = 14.85L
    # Surcharge 10% on 14.85L = 1.485L. Tax+Surcharge = 16.335L
    # Cess 4% on 16.335L = 0.6534L
    # Total = 16.9884L (1698840)
    inputs = TaxEstimatorInput(financial_year='2024-25', gross_salary=6000000)
    result = calculate_tax(inputs)
    assert result.new_regime.taxable_income == Decimal('5950000')
    assert result.new_regime.tax_on_income == Decimal('1485000')
    assert result.new_regime.surcharge == Decimal('148500')
    assert result.new_regime.health_and_education_cess == Decimal('65340')
    assert result.new_regime.total_tax_liability == Decimal('1698840')

def test_invalid_financial_year():
    inputs = TaxEstimatorInput(financial_year='2020-21', gross_salary=500000)
    with pytest.raises(ValueError, match="not supported or verified"):
        calculate_tax(inputs)

def test_negative_income():
    with pytest.raises(ValueError, match="cannot be negative"):
        TaxEstimatorInput(financial_year='2024-25', gross_salary=-1000)
