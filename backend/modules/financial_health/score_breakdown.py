"""
==========================================================
Financial Score Breakdown Engine
----------------------------------------------------------
Generates category-wise score breakdown based on
evaluated financial metrics.

Each category contributes towards the final Financial
Health Score and is returned separately so that the
frontend can directly visualize the data using
progress bars, charts, etc.

This engine DOES NOT predict the ML score.
It only evaluates individual financial dimensions.
==========================================================
"""


class ScoreBreakdownEngine:

    @staticmethod
    def generate(metrics: dict):

        breakdown = {}

        # =====================================================
        # Savings (20 Marks)
        # =====================================================

        status = metrics["savings_rate"]["status"]

        if status == "Excellent":
            breakdown["Savings"] = 20

        elif status == "Good":
            breakdown["Savings"] = 16

        elif status == "Average":
            breakdown["Savings"] = 10

        else:
            breakdown["Savings"] = 5

        # =====================================================
        # Debt (20 Marks)
        # =====================================================

        status = metrics["debt_ratio"]["status"]

        if status == "Excellent":
            breakdown["Debt"] = 20

        elif status == "Good":
            breakdown["Debt"] = 16

        elif status == "Average":
            breakdown["Debt"] = 10

        else:
            breakdown["Debt"] = 5

        # =====================================================
        # Emergency Fund (15 Marks)
        # =====================================================

        status = metrics["emergency_fund"]["status"]

        if status == "Excellent":
            breakdown["Emergency Fund"] = 15

        elif status == "Average":
            breakdown["Emergency Fund"] = 10

        else:
            breakdown["Emergency Fund"] = 5

        # =====================================================
        # Investments (15 Marks)
        # =====================================================

        status = metrics["investment_ratio"]["status"]

        if status == "Excellent":
            breakdown["Investments"] = 15

        elif status == "Good":
            breakdown["Investments"] = 12

        else:
            breakdown["Investments"] = 5

        # =====================================================
        # Expenses (15 Marks)
        # =====================================================

        status = metrics["expense_ratio"]["status"]

        if status == "Excellent":
            breakdown["Expenses"] = 15

        elif status == "Average":
            breakdown["Expenses"] = 10

        else:
            breakdown["Expenses"] = 5

        # =====================================================
        # Cashflow (15 Marks)
        # =====================================================

        status = metrics["cashflow"]["status"]

        if status == "Positive":
            breakdown["Cashflow"] = 15

        else:
            breakdown["Cashflow"] = 5

        return breakdown