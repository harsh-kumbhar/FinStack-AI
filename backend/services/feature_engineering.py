from schemas.financial_health import (
    FinancialProfileData,
    FinancialHealthFeatures,
)


class FeatureEngineeringService:
    """
    Converts raw financial profile data into
    machine learning ready features.
    """

    @staticmethod
    def generate_features(
        profile: FinancialProfileData,
    ) -> FinancialHealthFeatures:

        # ==========================================
        # Basic Validation
        # ==========================================

        if profile.monthly_income <= 0:
            raise ValueError("Monthly income must be greater than zero.")

        if profile.monthly_expenses < 0:
            raise ValueError("Monthly expenses cannot be negative.")

        if profile.monthly_savings < 0:
            raise ValueError("Monthly savings cannot be negative.")

        if profile.total_debt < 0:
            raise ValueError("Total debt cannot be negative.")

        if profile.emergency_fund < 0:
            raise ValueError("Emergency fund cannot be negative.")

        if profile.investments < 0:
            raise ValueError("Investments cannot be negative.")

        if profile.insurance_cover < 0:
            raise ValueError("Insurance cover cannot be negative.")

        # ==========================================
        # Derived Values
        # ==========================================

        annual_income = profile.monthly_income * 12

        savings_rate = profile.monthly_savings / profile.monthly_income

        expense_ratio = profile.monthly_expenses / profile.monthly_income

        disposable_income = (
            profile.monthly_income
            - profile.monthly_expenses
        )

        debt_to_income_ratio = (
            profile.total_debt / annual_income
        )

        emergency_fund_months = (
            profile.emergency_fund
            / max(profile.monthly_expenses, 1)
        )

        investment_ratio = (
            profile.investments / annual_income
        )

        insurance_ratio = (
            profile.insurance_cover / annual_income
        )

        net_monthly_cashflow = (
            profile.monthly_income
            - profile.monthly_expenses
            - profile.monthly_savings
        )

        return FinancialHealthFeatures(
    savings_rate=round(savings_rate, 2),
    expense_ratio=round(expense_ratio, 2),
    disposable_income=round(disposable_income, 2),
    debt_to_income_ratio=round(debt_to_income_ratio, 2),
    emergency_fund_months=round(emergency_fund_months, 2),
    investment_ratio=round(investment_ratio, 2),
    insurance_ratio=round(insurance_ratio, 2),
    net_monthly_cashflow=round(net_monthly_cashflow, 2),
        )