"""
=========================================================
Persona Classifier Service
---------------------------------------------------------
Determines the most suitable financial persona for a
user profile before ML prediction.
=========================================================
"""

from schemas.financial_health import (
    FinancialProfileData,
    FinancialHealthFeatures,
)


class PersonaClassifierService:

    @staticmethod
    def classify(
        profile: FinancialProfileData,
        features: FinancialHealthFeatures,
    ) -> str:

        # Student
        if (
            profile.employment_status == "Student"
            or profile.age <= 24
        ):
            return "Student"

        # Retired
        if (
            profile.employment_status == "Retired"
            or profile.age >= 58
        ):
            return "Retired"

        # Financially Stressed
        if (
            features.savings_rate <= 0.05
            and features.expense_ratio >= 0.90
            and features.emergency_fund_months <= 1
        ):
            return "Financially Stressed"

        # Wealth Builder
        if (
            features.savings_rate >= 0.35
            and features.investment_ratio >= 1.0
            and features.emergency_fund_months >= 8
            and features.debt_to_income_ratio <= 0.20
        ):
            return "Wealth Builder"

        # High Income High Debt
        if (
            profile.monthly_income >= 200000
            and features.debt_to_income_ratio >= 1.0
        ):
            return "High Income High Debt"

        # Disciplined Saver
        if (
            features.savings_rate >= 0.35
            and features.emergency_fund_months >= 6
            and features.debt_to_income_ratio <= 0.20
        ):
            return "Disciplined Saver"

        # Business Owner
        if profile.employment_status == "Business":
            return "Business Owner"

        # Freelancer
        if profile.employment_status == "Freelancer":
            return "Freelancer"

        # Young Salaried
        if (
            profile.employment_status == "Salaried"
            and profile.age <= 30
        ):
            return "Young Salaried"

        # Default
        return "Mid Career"