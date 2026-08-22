from decimal import Decimal

# Authoritative Source: Income Tax Department, Government of India
# URL: https://incometaxindia.gov.in/Tutorials/1.%20Tax%20rates.pdf
# Financial Year: 2024-25 (Assessment Year 2025-26)

# Standard Deduction applicable to Salary Income under both regimes
STANDARD_DEDUCTION = Decimal('50000')
CESS_RATE = Decimal('0.04')

# OLD REGIME (For individuals below 60 years)
OLD_REGIME_SLABS = [
    (Decimal('250000'), Decimal('0.00')),
    (Decimal('500000'), Decimal('0.05')),
    (Decimal('1000000'), Decimal('0.20')),
    (Decimal('Infinity'), Decimal('0.30')),
]

OLD_REGIME_REBATE_87A_LIMIT = Decimal('500000')
OLD_REGIME_REBATE_87A_MAX = Decimal('12500')

# Old Regime Deduction Limits
DEDUCTION_LIMITS_OLD_REGIME = {
    '80C': Decimal('150000'),
    '80D': Decimal('25000'),  # assuming individual non-senior
    '80TTA': Decimal('10000'),
}

# NEW REGIME (Default Regime u/s 115BAC)
NEW_REGIME_SLABS = [
    (Decimal('300000'), Decimal('0.00')),
    (Decimal('600000'), Decimal('0.05')),
    (Decimal('900000'), Decimal('0.10')),
    (Decimal('1200000'), Decimal('0.15')),
    (Decimal('1500000'), Decimal('0.20')),
    (Decimal('Infinity'), Decimal('0.30')),
]

NEW_REGIME_REBATE_87A_LIMIT = Decimal('700000')
NEW_REGIME_REBATE_87A_MAX = Decimal('25000')

# Surcharge is simplified for V1: 
# Above 50L: 10%, 1Cr: 15%, 2Cr: 25%, 5Cr: 37% (Old), 25% max in New Regime.
# For V1, we will handle a basic unified surcharge or note it's not fully supported for >50L without marginal relief.
# To keep V1 deterministic and safe, we will implement the 10% surcharge for 50L-1Cr.
SURCHARGE_SLABS_NEW_REGIME = [
    (Decimal('5000000'), Decimal('0.00')),
    (Decimal('10000000'), Decimal('0.10')),
    (Decimal('20000000'), Decimal('0.15')),
    (Decimal('Infinity'), Decimal('0.25')),
]

SURCHARGE_SLABS_OLD_REGIME = [
    (Decimal('5000000'), Decimal('0.00')),
    (Decimal('10000000'), Decimal('0.10')),
    (Decimal('20000000'), Decimal('0.15')),
    (Decimal('50000000'), Decimal('0.25')),
    (Decimal('Infinity'), Decimal('0.37')),
]
