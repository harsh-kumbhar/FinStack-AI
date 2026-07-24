import pytest

from schemas.financial_health import FinancialProfileData
from services.feature_engineering import FeatureEngineeringService


def test_feature_generation():

    profile = FinancialProfileData(
        age=25,
        employment_status="Salaried",
        monthly_income=50000,
        monthly_expenses=30000,
        monthly_savings=10000,
        emergency_fund=180000,
        total_debt=100000,
        investments=250000,
        insurance_cover=500000,
        financial_goal="Buy a House",
    )

    features = FeatureEngineeringService.generate_features(profile)

    assert features.savings_rate == pytest.approx(0.20)

    assert features.expense_ratio == pytest.approx(0.60)

    assert features.disposable_income == 20000

    assert features.debt_to_income_ratio == pytest.approx(
        100000 / (50000 * 12)
    )

    assert features.emergency_fund_months == pytest.approx(6)

    assert features.investment_ratio == pytest.approx(
        250000 / (50000 * 12)
    )

    assert features.insurance_ratio == pytest.approx(
        500000 / (50000 * 12)
    )

    assert features.net_monthly_cashflow == 10000


def test_negative_income():

    with pytest.raises(ValueError):

        profile = FinancialProfileData(
            age=30,
            employment_status="Salaried",
            monthly_income=-50000,
            monthly_expenses=25000,
            monthly_savings=5000,
            emergency_fund=50000,
            total_debt=0,
            investments=10000,
            insurance_cover=100000,
            financial_goal="Retirement",
        )

        FeatureEngineeringService.generate_features(profile)


def test_zero_income():

    with pytest.raises(ValueError):

        profile = FinancialProfileData(
            age=30,
            employment_status="Salaried",
            monthly_income=0,
            monthly_expenses=10000,
            monthly_savings=1000,
            emergency_fund=5000,
            total_debt=0,
            investments=0,
            insurance_cover=0,
            financial_goal="Travel",
        )

        FeatureEngineeringService.generate_features(profile)