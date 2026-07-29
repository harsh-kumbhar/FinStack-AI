"""
==========================================================
Financial Metrics Evaluation Engine
----------------------------------------------------------
Converts raw engineered features into frontend-friendly
metrics with status, severity and recommendations.
==========================================================
"""

from modules.financial_health.config.thresholds import *


class MetricsEngine:

    @staticmethod
    def evaluate(features):

        metrics = {}

        # ---------------------------------------------
        # Savings Rate
        # ---------------------------------------------

        savings = features.savings_rate

        if savings >= SAVINGS_RATE["excellent"]:
            status = "Excellent"
            severity = "success"

        elif savings >= SAVINGS_RATE["good"]:
            status = "Good"
            severity = "success"

        elif savings >= SAVINGS_RATE["average"]:
            status = "Average"
            severity = "warning"

        else:
            status = "Poor"
            severity = "danger"

        metrics["savings_rate"] = {
            "name": "Savings Rate",
            "value": round(savings * 100, 2),
            "unit": "%",
            "status": status,
            "severity": severity,
            "recommended": "30% or higher",
            "description": "Percentage of monthly income saved."
        }

        # ---------------------------------------------
        # Debt Ratio
        # ---------------------------------------------

        debt = features.debt_to_income_ratio

        if debt <= DEBT_TO_INCOME["excellent"]:
            status = "Excellent"
            severity = "success"

        elif debt <= DEBT_TO_INCOME["good"]:
            status = "Good"
            severity = "success"

        elif debt <= DEBT_TO_INCOME["average"]:
            status = "Average"
            severity = "warning"

        else:
            status = "High"
            severity = "danger"

        metrics["debt_ratio"] = {
            "name": "Debt-to-Income Ratio",
            "value": round(debt * 100, 2),
            "unit": "%",
            "status": status,
            "severity": severity,
            "recommended": "Below 35%",
            "description": "Percentage of income used to repay debt."
        }

        # ---------------------------------------------
        # Emergency Fund
        # ---------------------------------------------

        emergency = features.emergency_fund_months

        if emergency >= EMERGENCY_FUND["excellent"]:
            status = "Excellent"
            severity = "success"

        elif emergency >= EMERGENCY_FUND["good"]:
            status = "Average"
            severity = "warning"

        else:
            status = "Poor"
            severity = "danger"

        metrics["emergency_fund"] = {
            "name": "Emergency Fund",
            "value": round(emergency, 2),
            "unit": "Months",
            "status": status,
            "severity": severity,
            "recommended": "6 Months",
            "description": "Money available for unexpected emergencies."
        }

        # ---------------------------------------------
        # Investment Ratio
        # ---------------------------------------------

        investment = features.investment_ratio

        if investment >= INVESTMENT_RATIO["excellent"]:
            status = "Excellent"
            severity = "success"

        elif investment >= INVESTMENT_RATIO["good"]:
            status = "Good"
            severity = "success"

        else:
            status = "Poor"
            severity = "danger"

        metrics["investment_ratio"] = {
            "name": "Investment Ratio",
            "value": round(investment * 100, 2),
            "unit": "%",
            "status": status,
            "severity": severity,
            "recommended": "20%+",
            "description": "Monthly income allocated towards investments."
        }

        # ---------------------------------------------
        # Expense Ratio
        # ---------------------------------------------

        expense = features.expense_ratio

        if expense <= EXPENSE_RATIO["excellent"]:
            status = "Excellent"
            severity = "success"

        elif expense <= EXPENSE_RATIO["good"]:
            status = "Average"
            severity = "warning"

        else:
            status = "High"
            severity = "danger"

        metrics["expense_ratio"] = {
            "name": "Expense Ratio",
            "value": round(expense * 100, 2),
            "unit": "%",
            "status": status,
            "severity": severity,
            "recommended": "Below 50%",
            "description": "Percentage of income spent every month."
        }

        # ---------------------------------------------
        # Cashflow
        # ---------------------------------------------

        cashflow = features.net_monthly_cashflow

        metrics["cashflow"] = {
            "name": "Monthly Cashflow",
            "value": round(cashflow,2),
            "unit": "₹",
            "status": "Positive" if cashflow >=0 else "Negative",
            "severity": "success" if cashflow >=0 else "danger",
            "recommended":"Positive",
            "description":"Income remaining after expenses."
        }

        return metrics