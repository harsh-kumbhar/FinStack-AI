"""
=========================================================
Financial Health Scoring Service
---------------------------------------------------------
Generates a Financial Health Score (0-100)
from engineered financial features.
=========================================================
"""

from schemas.financial_health import FinancialHealthFeatures


class FinancialHealthScoringService:

    @staticmethod
    def calculate_score(features: FinancialHealthFeatures) -> float:
        """
        Calculate Financial Health Score (0-100)
        """

        score = 0.0

        # -------------------------------------------------
        # Savings Rate (25 Marks)
        # -------------------------------------------------

        savings_score = min(
            features.savings_rate / 0.40,
            1.0
        ) * 25

        score += savings_score

        # -------------------------------------------------
        # Debt to Income (25 Marks)
        # Lower debt = Better
        # -------------------------------------------------

        debt_score = max(
            0,
            1 - (features.debt_to_income_ratio / 3)
        ) * 25

        score += debt_score

        # -------------------------------------------------
        # Emergency Fund (20 Marks)
        # Ideal = 12 months
        # -------------------------------------------------

        emergency_score = min(
            features.emergency_fund_months / 12,
            1.0
        ) * 20

        score += emergency_score

        # -------------------------------------------------
        # Investment Ratio (15 Marks)
        # Ideal = 5 × Annual Income
        # -------------------------------------------------

        investment_score = min(
            features.investment_ratio / 5,
            1.0
        ) * 15

        score += investment_score

        # -------------------------------------------------
        # Insurance Ratio (10 Marks)
        # Ideal = 15 × Annual Income
        # -------------------------------------------------

        insurance_score = min(
            features.insurance_ratio / 15,
            1.0
        ) * 10

        score += insurance_score

        # -------------------------------------------------
        # Cashflow (5 Marks)
        # -------------------------------------------------

        cashflow_ratio = (
            features.net_monthly_cashflow /
            features.disposable_income
            if features.disposable_income > 0
            else 0
        )

        cashflow_score = max(
            0,
            min(cashflow_ratio, 1.0)
        ) * 5

        score += cashflow_score

        return round(score, 2)