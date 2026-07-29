"""
==========================================================
Financial Persona Engine
----------------------------------------------------------
Generates a user-friendly financial persona after the ML
prediction is completed.

NOTE:
- persona_classifier.py -> Used BEFORE ML prediction
- persona_engine.py     -> Used AFTER prediction

This class converts financial metrics into a persona object
that the frontend can directly display.
==========================================================
"""


class PersonaEngine:

    @staticmethod
    def generate(score: float, metrics: dict):

        savings = metrics["savings_rate"]["status"]
        debt = metrics["debt_ratio"]["status"]
        investment = metrics["investment_ratio"]["status"]
        emergency = metrics["emergency_fund"]["status"]
        expense = metrics["expense_ratio"]["status"]
        cashflow = metrics["cashflow"]["status"]

        # =====================================================
        # Balanced Builder
        # =====================================================

        if (
            savings in ["Excellent", "Good"]
            and debt in ["Excellent", "Good"]
            and investment in ["Excellent", "Good"]
        ):
            return {
                "title": "Balanced Builder",
                "emoji": "📈",
                "description": (
                    "You have built a balanced financial foundation with "
                    "healthy savings, manageable debt and consistent investments."
                ),
                "strength": "Financial Discipline",
                "focus_area": "Long-Term Wealth Creation",
                "risk_level": "Low",
            }

        # =====================================================
        # Steady Saver
        # =====================================================

        if (
            savings in ["Excellent", "Good"]
            and investment in ["Average", "Poor"]
        ):
            return {
                "title": "Steady Saver",
                "emoji": "💰",
                "description": (
                    "You are excellent at saving money but should invest "
                    "more to grow your wealth."
                ),
                "strength": "Savings Habit",
                "focus_area": "Investments",
                "risk_level": "Low",
            }

        # =====================================================
        # Debt Warrior
        # =====================================================

        if debt in ["Poor", "Average"]:
            return {
                "title": "Debt Warrior",
                "emoji": "⚔️",
                "description": (
                    "A significant portion of your income goes towards debt. "
                    "Reducing liabilities should be your highest priority."
                ),
                "strength": "Income Potential",
                "focus_area": "Debt Reduction",
                "risk_level": "High",
            }

        # =====================================================
        # Future Planner
        # =====================================================

        if emergency in ["Excellent", "Good"] and investment in ["Excellent", "Good"]:
            return {
                "title": "Future Planner",
                "emoji": "🚀",
                "description": (
                    "You are financially preparing for the future through "
                    "strong emergency savings and long-term investments."
                ),
                "strength": "Future Readiness",
                "focus_area": "Portfolio Diversification",
                "risk_level": "Low",
            }

        # =====================================================
        # Cashflow Improver
        # =====================================================

        if cashflow != "Positive":
            return {
                "title": "Cashflow Improver",
                "emoji": "💸",
                "description": (
                    "Your expenses are affecting your monthly cashflow. "
                    "Focus on reducing unnecessary spending."
                ),
                "strength": "Income Generation",
                "focus_area": "Expense Management",
                "risk_level": "High",
            }

        # =====================================================
        # Smart Spender
        # =====================================================

        if expense in ["Excellent", "Good"]:
            return {
                "title": "Smart Spender",
                "emoji": "🛒",
                "description": (
                    "You manage your expenses well and maintain healthy "
                    "spending habits."
                ),
                "strength": "Expense Control",
                "focus_area": "Increase Investments",
                "risk_level": "Low",
            }

        # =====================================================
        # Financial Beginner
        # =====================================================

        if score < 50:
            return {
                "title": "Financial Beginner",
                "emoji": "🌱",
                "description": (
                    "You are at the beginning of your financial journey. "
                    "Building savings and reducing debt should be your first priorities."
                ),
                "strength": "Growth Potential",
                "focus_area": "Financial Planning",
                "risk_level": "High",
            }

        # =====================================================
        # Financial Explorer
        # =====================================================

        if score < 70:
            return {
                "title": "Financial Explorer",
                "emoji": "🧭",
                "description": (
                    "You have developed some healthy financial habits but "
                    "there are still opportunities to strengthen your overall financial health."
                ),
                "strength": "Consistency",
                "focus_area": "Balanced Financial Growth",
                "risk_level": "Medium",
            }

        # =====================================================
        # Financial Expert
        # =====================================================

        return {
            "title": "Financial Expert",
            "emoji": "🏆",
            "description": (
                "Excellent work! You demonstrate strong financial discipline "
                "across savings, investments, debt management and cashflow."
            ),
            "strength": "Overall Financial Health",
            "focus_area": "Maintain Current Strategy",
            "risk_level": "Low",
        }