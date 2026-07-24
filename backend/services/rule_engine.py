"""
=========================================================
Financial Rule Engine
---------------------------------------------------------
Generates financial insights based on the predicted score
and engineered financial features.
=========================================================
"""

from schemas.financial_health import (
    FinancialHealthFeatures,
)


class RuleEngine:

    @staticmethod
    def evaluate(
        score: float,
        features: FinancialHealthFeatures,
    ):

        strengths = []
        weaknesses = []
        risks = []
        recommendations = []

        # ==========================================
        # Savings
        # ==========================================

        if features.savings_rate >= 0.30:
            strengths.append(
                "Excellent monthly savings habit."
            )
        else:
            weaknesses.append(
                "Savings rate is below the recommended 30%."
            )
            recommendations.append(
                "Increase monthly savings gradually."
            )

        # ==========================================
        # Emergency Fund
        # ==========================================

        if features.emergency_fund_months >= 6:
            strengths.append(
                "Healthy emergency fund maintained."
            )
        else:
            weaknesses.append(
                "Emergency fund is insufficient."
            )
            recommendations.append(
                "Build an emergency fund covering at least six months of expenses."
            )

        # ==========================================
        # Debt
        # ==========================================

        if features.debt_to_income_ratio <= 0.30:
            strengths.append(
                "Debt level is well managed."
            )
        else:
            weaknesses.append(
                "Debt burden is relatively high."
            )
            risks.append(
                "High debt can affect future financial stability."
            )
            recommendations.append(
                "Prioritize repayment of high-interest debt."
            )

        # ==========================================
        # Investments
        # ==========================================

        if features.investment_ratio >= 0.50:
            strengths.append(
                "Good investment portfolio."
            )
        else:
            weaknesses.append(
                "Investment allocation is relatively low."
            )
            recommendations.append(
                "Increase long-term investments gradually."
            )

        # ==========================================
        # Cashflow
        # ==========================================

        if features.net_monthly_cashflow >= 0:
            strengths.append(
                "Positive monthly cash flow."
            )
        else:
            weaknesses.append(
                "Negative monthly cash flow."
            )
            risks.append(
                "Persistent negative cash flow may lead to debt."
            )
            recommendations.append(
                "Reduce discretionary spending."
            )

        # ==========================================
        # Overall Score
        # ==========================================

        if score >= 80:
            status = "Excellent"

        elif score >= 60:
            status = "Good"

        elif score >= 40:
            status = "Average"

        else:
            status = "Poor"

        return {
            "health_status": status,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "risks": risks,
            "recommendations": recommendations,
        }