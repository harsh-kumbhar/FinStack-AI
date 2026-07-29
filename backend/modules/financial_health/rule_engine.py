from modules.financial_health.metrics_engine import MetricsEngine
from modules.financial_health.config.thresholds import HEALTH_SCORE


class RuleEngine:

    @staticmethod
    def evaluate(score, features):

        metrics = MetricsEngine.evaluate(features)

        strengths = []
        weaknesses = []
        risks = []

        # =====================================================
        # Savings
        # =====================================================

        if metrics["savings_rate"]["severity"] == "success":
            strengths.append("Excellent monthly savings habit.")
        else:
            weaknesses.append("Savings rate is below the recommended level.")

        # =====================================================
        # Emergency Fund
        # =====================================================

        if metrics["emergency_fund"]["severity"] == "success":
            strengths.append("Healthy emergency fund maintained.")
        else:
            weaknesses.append("Emergency fund is insufficient.")
        if metrics["emergency_fund"]["severity"] == "danger":
            risks.append(
                "Limited emergency savings may create financial stress during unexpected situations."
            )
        # =====================================================
        # Debt
        # =====================================================

        if metrics["debt_ratio"]["severity"] == "success":
            strengths.append("Debt level is well managed.")
        else:
            weaknesses.append("Debt burden is relatively high.")
            risks.append(
                "High debt can affect future financial stability."
            )

        # =====================================================
        # Investments
        # =====================================================

        if metrics["investment_ratio"]["severity"] == "success":
            strengths.append("Good investment portfolio.")
        else:
            weaknesses.append("Investment allocation is relatively low.")

        # =====================================================
        # Expense Ratio
        # =====================================================

        if metrics["expense_ratio"]["severity"] == "success":
            strengths.append("Healthy monthly spending habits.")
        else:
            weaknesses.append(
                "Monthly expenses consume a large portion of your income."
            )

        if metrics["expense_ratio"]["severity"] == "danger":
            risks.append(
                "High monthly expenses reduce your ability to save and invest."
            )
        # =====================================================
        # Cashflow
        # =====================================================

        if metrics["cashflow"]["severity"] == "success":
            strengths.append("Positive monthly cash flow.")
        else:
            weaknesses.append("Negative monthly cash flow.")
            risks.append(
                "Persistent negative cash flow may lead to debt."
            )

        # =====================================================
        # Overall Status
        # =====================================================

        if score >= HEALTH_SCORE["excellent"]:
            status = "Excellent"

        elif score >= HEALTH_SCORE["good"]:
            status = "Good"

        elif score >= HEALTH_SCORE["average"]:
            status = "Average"

        else:
            status = "Poor"

        return {

            "health_status": status,

            "metrics": metrics,

            "strengths": strengths,

            "weaknesses": weaknesses,

            "risks": risks,
        }