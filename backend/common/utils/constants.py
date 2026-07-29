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