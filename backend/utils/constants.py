"""
=========================================================
Financial Health Analyzer Constants
---------------------------------------------------------
This file contains all financial thresholds used
throughout the application.

Used By:
- Feature Engineering
- Rule Engine
- Dataset Generator
- ML Evaluation
- AI Recommendation Engine
=========================================================
"""

# ==========================================================
# Health Score Categories
# ==========================================================

EXCELLENT_SCORE = 90
GOOD_SCORE = 75
AVERAGE_SCORE = 50


# ==========================================================
# Recommended Savings Rate
# ==========================================================

GOOD_SAVINGS_RATE = 0.30
AVERAGE_SAVINGS_RATE = 0.20
MIN_SAVINGS_RATE = 0.10


# ==========================================================
# Expense Ratio
# ==========================================================

GOOD_EXPENSE_RATIO = 0.50
AVERAGE_EXPENSE_RATIO = 0.70


# ==========================================================
# Debt to Income Ratio
# ==========================================================

GOOD_DEBT_TO_INCOME = 0.20
AVERAGE_DEBT_TO_INCOME = 0.35
HIGH_DEBT_TO_INCOME = 0.50


# ==========================================================
# Emergency Fund
# (Measured in Months)
# ==========================================================

GOOD_EMERGENCY_MONTHS = 6
AVERAGE_EMERGENCY_MONTHS = 3


# ==========================================================
# Investment Ratio
# ==========================================================

GOOD_INVESTMENT_RATIO = 0.50
AVERAGE_INVESTMENT_RATIO = 0.20


# ==========================================================
# Insurance Coverage Ratio
# (Insurance Cover / Annual Income)
# ==========================================================

GOOD_INSURANCE_RATIO = 10
AVERAGE_INSURANCE_RATIO = 5


# ==========================================================
# Supported Employment Types
# ==========================================================

EMPLOYMENT_TYPES = [
    "Salaried",
    "Self-Employed",
    "Business",
    "Freelancer",
    "Student",
    "Unemployed",
    "Retired",
]


# ==========================================================
# Supported Financial Goals
# ==========================================================

FINANCIAL_GOALS = [
    "Emergency Fund",
    "Buy a House",
    "Buy a Car",
    "Retirement",
    "Higher Education",
    "Travel",
    "Marriage",
    "Wealth Creation",
    "Business",
    "Other",
]


# ==========================================================
# Model Version
# ==========================================================

MODEL_VERSION = "finhealth_v1.0"