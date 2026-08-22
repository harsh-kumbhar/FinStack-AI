from decimal import Decimal, ROUND_HALF_UP
from .domain import TaxEstimatorInput, TaxCalculationResult, RegimeCalculationResult
from .rules.registry import get_tax_rules

def round_to_nearest_10(amount: Decimal) -> Decimal:
    """Rounds the amount to the nearest multiple of 10 as per Section 288B."""
    return (amount / Decimal('10')).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * Decimal('10')

def calculate_tax_from_slabs(taxable_income: Decimal, slabs: list) -> Decimal:
    """Calculates tax based on provided slabs."""
    tax = Decimal('0')
    previous_limit = Decimal('0')
    
    for limit, rate in slabs:
        if taxable_income > previous_limit:
            taxable_amount_in_slab = min(taxable_income, limit) - previous_limit
            tax += taxable_amount_in_slab * rate
        previous_limit = limit
        if taxable_income <= limit:
            break
            
    return tax

def calculate_surcharge(tax_amount: Decimal, taxable_income: Decimal, surcharge_slabs: list) -> Decimal:
    """Calculates surcharge on the tax amount based on taxable income slabs."""
    surcharge_rate = Decimal('0')
    for limit, rate in surcharge_slabs:
        if taxable_income > limit:
            continue
        surcharge_rate = rate
        break
    
    return tax_amount * surcharge_rate

def calculate_regime(inputs: TaxEstimatorInput, rules, is_new_regime: bool) -> RegimeCalculationResult:
    gross_income = inputs.gross_salary + inputs.other_income
    
    # Standard Deduction applies to salary income only
    standard_deduction = min(inputs.gross_salary, rules.STANDARD_DEDUCTION)
    
    # Deductions
    total_deductions = Decimal('0')
    if not is_new_regime:
        # Cap 80C
        deduction_80c = min(inputs.deduction_80c, rules.DEDUCTION_LIMITS_OLD_REGIME['80C'])
        deduction_80d = min(inputs.deduction_80d, rules.DEDUCTION_LIMITS_OLD_REGIME['80D'])
        
        # 80TTA applies to other_income (assuming it represents savings interest for V1 scope)
        deduction_80tta = min(inputs.deduction_80tta, rules.DEDUCTION_LIMITS_OLD_REGIME['80TTA'])
        deduction_80tta = min(deduction_80tta, inputs.other_income)
        
        total_deductions = deduction_80c + deduction_80d + deduction_80tta
    
    # Taxable Income
    taxable_income = gross_income - standard_deduction - total_deductions
    taxable_income = max(Decimal('0'), taxable_income)
    
    # Slabs & Rates
    slabs = rules.NEW_REGIME_SLABS if is_new_regime else rules.OLD_REGIME_SLABS
    rebate_limit = rules.NEW_REGIME_REBATE_87A_LIMIT if is_new_regime else rules.OLD_REGIME_REBATE_87A_LIMIT
    rebate_max = rules.NEW_REGIME_REBATE_87A_MAX if is_new_regime else rules.OLD_REGIME_REBATE_87A_MAX
    surcharge_slabs = rules.SURCHARGE_SLABS_NEW_REGIME if is_new_regime else rules.SURCHARGE_SLABS_OLD_REGIME
    
    # Tax Calculation
    tax_on_income = calculate_tax_from_slabs(taxable_income, slabs)
    
    # Rebate 87A (Simplified V1: full rebate if <= limit, no marginal relief implemented)
    rebate = Decimal('0')
    if taxable_income <= rebate_limit:
        rebate = min(tax_on_income, rebate_max)
        
    tax_after_rebate = max(Decimal('0'), tax_on_income - rebate)
    
    # Surcharge
    surcharge = calculate_surcharge(tax_after_rebate, taxable_income, surcharge_slabs)
    tax_after_surcharge = tax_after_rebate + surcharge
    
    # Cess
    cess = tax_after_surcharge * rules.CESS_RATE
    
    total_tax = tax_after_surcharge + cess
    
    # Rounding u/s 288B
    final_tax_liability = round_to_nearest_10(total_tax)
    
    return RegimeCalculationResult(
        regime_name="New Regime" if is_new_regime else "Old Regime",
        gross_income=gross_income,
        standard_deduction=standard_deduction,
        total_chapter_vi_a_deductions=total_deductions,
        taxable_income=taxable_income,
        tax_on_income=tax_on_income,
        rebate_87a=rebate,
        tax_after_rebate=tax_after_rebate,
        surcharge=surcharge,
        health_and_education_cess=cess,
        total_tax_liability=final_tax_liability
    )

def calculate_tax(inputs: TaxEstimatorInput) -> TaxCalculationResult:
    """
    Core deterministic tax calculation engine.
    Computes tax for both regimes and recommends the beneficial one.
    """
    rules = get_tax_rules(inputs.financial_year)
    
    old_regime_res = calculate_regime(inputs, rules, is_new_regime=False)
    new_regime_res = calculate_regime(inputs, rules, is_new_regime=True)
    
    if new_regime_res.total_tax_liability <= old_regime_res.total_tax_liability:
        recommended = "New Regime"
        savings = old_regime_res.total_tax_liability - new_regime_res.total_tax_liability
    else:
        recommended = "Old Regime"
        savings = new_regime_res.total_tax_liability - old_regime_res.total_tax_liability
        
    return TaxCalculationResult(
        financial_year=inputs.financial_year,
        old_regime=old_regime_res,
        new_regime=new_regime_res,
        recommended_regime=recommended,
        tax_savings=savings
    )
