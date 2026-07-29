"""
==========================================================
Financial Recommendation Engine
----------------------------------------------------------
Generates structured financial recommendations based on
evaluated financial metrics.

This file should ONLY generate recommendations.
No score calculation or business rule evaluation here.
==========================================================
"""


class RecommendationEngine:

    @staticmethod
    def generate(metrics: dict):

        recommendations = []

        # =====================================================
        # Savings
        # =====================================================

        savings = metrics["savings_rate"]

        if savings["severity"] != "success":
            recommendations.append({
                "id": "savings",
                "title": "Increase Monthly Savings",
                "priority": "High",
                "current_value": f'{savings["value"]}%',
                "recommended_value": savings["recommended"],
                "reason": "Your monthly savings rate is below the recommended level.",
                "impact": "Improves financial stability and emergency preparedness."
            })

        # =====================================================
        # Debt
        # =====================================================

        debt = metrics["debt_ratio"]

        if debt["severity"] in ["warning", "danger"]:
            recommendations.append({
                "id": "debt",
                "title": "Reduce Debt Burden",
                "priority": "High",
                "current_value": f'{debt["value"]}%',
                "recommended_value": debt["recommended"],
                "reason": "Your debt-to-income ratio is above the recommended limit.",
                "impact": "Reducing debt improves cash flow and long-term financial health."
            })

        # =====================================================
        # Emergency Fund
        # =====================================================

        emergency = metrics["emergency_fund"]

        if emergency["severity"] != "success":
            recommendations.append({
                "id": "emergency",
                "title": "Build Emergency Fund",
                "priority": "High",
                "current_value": f'{emergency["value"]} Months',
                "recommended_value": emergency["recommended"],
                "reason": "Emergency savings are insufficient for unexpected situations.",
                "impact": "Provides financial security during emergencies."
            })

        # =====================================================
        # Investments
        # =====================================================

        investment = metrics["investment_ratio"]

        if investment["severity"] != "success":
            recommendations.append({
                "id": "investment",
                "title": "Increase Investments",
                "priority": "Medium",
                "current_value": f'{investment["value"]}%',
                "recommended_value": investment["recommended"],
                "reason": "Investment allocation is lower than recommended.",
                "impact": "Supports long-term wealth creation."
            })

        # =====================================================
        # Expense Ratio
        # =====================================================

        expense = metrics["expense_ratio"]

        if expense["severity"] in ["warning", "danger"]:
            recommendations.append({
                "id": "expense",
                "title": "Reduce Monthly Expenses",
                "priority": "Medium",
                "current_value": f'{expense["value"]}%',
                "recommended_value": expense["recommended"],
                "reason": "Monthly expenses consume a large portion of your income.",
                "impact": "Improves disposable income and savings potential."
            })

        # =====================================================
        # Cashflow
        # =====================================================

        cashflow = metrics["cashflow"]

        if cashflow["severity"] == "danger":
            recommendations.append({
                "id": "cashflow",
                "title": "Improve Monthly Cash Flow",
                "priority": "Critical",
                "current_value": f'₹ {cashflow["value"]}',
                "recommended_value": "Positive Cash Flow",
                "reason": "Your monthly cash flow is negative.",
                "impact": "Avoids future debt accumulation."
            })

        # =====================================================
        # Maintenance Recommendations
        # =====================================================

        if len(recommendations) == 0:

            recommendations.extend([
                {
                    "id": "maintain_savings",
                    "title": "Maintain Your Savings Habit",
                    "priority": "Low",
                    "current_value": f'{savings["value"]}%',
                    "recommended_value": savings["recommended"],
                    "reason": "Your savings rate is already healthy.",
                    "impact": "Maintaining this habit supports long-term financial stability."
                },
                {
                    "id": "review_investments",
                    "title": "Review Investment Portfolio",
                    "priority": "Low",
                    "current_value": f'{investment["value"]}%',
                    "recommended_value": "Review every 6 months",
                    "reason": "Periodic reviews help keep investments aligned with your financial goals.",
                    "impact": "Improves long-term portfolio performance."
                },
                {
                    "id": "maintain_emergency_fund",
                    "title": "Maintain Emergency Fund",
                    "priority": "Low",
                    "current_value": f'{emergency["value"]} Months',
                    "recommended_value": emergency["recommended"],
                    "reason": "Your emergency fund is well maintained.",
                    "impact": "Provides continued financial protection against unexpected expenses."
                }
            ])

        return recommendations