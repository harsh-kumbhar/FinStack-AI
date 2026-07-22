"""
=========================================================
Synthetic Dataset Generator
---------------------------------------------------------
Generates realistic financial profiles using
Financial Personas and Feature Engineering.
=========================================================
"""
import csv
from pathlib import Path
from services.financial_health_scoring import (
    FinancialHealthScoringService
)
from pprint import pprint
from ml.random_utils import (
    choose_persona,
    random_choice,
    random_float,
    random_int,
    percentage_of,
    months_to_amount,
)
from schemas.financial_health import FinancialProfileData
from services.feature_engineering import FeatureEngineeringService


def generate_profile():
    """
    Generate one complete ML-ready financial profile.
    """

    # ----------------------------------------------------
    # Select Persona
    # ----------------------------------------------------

    persona = choose_persona()

    # ----------------------------------------------------
    # Basic Details
    # ----------------------------------------------------

    age = random_int(persona["age"])

    employment_status = random_choice(
        persona["employment_status"]
    )

    financial_goal = random_choice(
        persona["financial_goal"]
    )

    # ----------------------------------------------------
    # Income
    # ----------------------------------------------------

    monthly_income = random_int(
        persona["monthly_income"]
    )

    annual_income = monthly_income * 12

    # ----------------------------------------------------
    # Ratios
    # ----------------------------------------------------

    expense_ratio = random_float(
        persona["expense_ratio"]
    )

    savings_rate = random_float(
        persona["savings_rate"]
    )

    emergency_months = random_float(
        persona["emergency_fund_months"]
    )

    investment_ratio = random_float(
        persona["investment_ratio"]
    )

    insurance_ratio = random_float(
        persona["insurance_ratio"]
    )

    # ----------------------------------------------------
    # Monetary Values
    # ----------------------------------------------------

    monthly_expenses = round(
        percentage_of(
            monthly_income,
            (expense_ratio, expense_ratio)
        )
    )

    monthly_savings = round(
        percentage_of(
            monthly_income,
            (savings_rate, savings_rate)
        )
    )

    emergency_fund = round(
        months_to_amount(
            monthly_income,
            emergency_months
        )
    )

    total_debt = random_int(
        persona["debt"]
    )

    # ----------------------------
    # IMPORTANT CHANGE
    # ----------------------------

    investments = round(
        annual_income * investment_ratio
    )

    insurance_cover = round(
        annual_income * insurance_ratio
    )

    # ----------------------------------------------------
    # Create Pydantic Object
    # ----------------------------------------------------

    profile = FinancialProfileData(
        age=age,
        employment_status=employment_status,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        monthly_savings=monthly_savings,
        emergency_fund=emergency_fund,
        total_debt=total_debt,
        investments=investments,
        insurance_cover=insurance_cover,
        financial_goal=financial_goal,
    )

    # ----------------------------------------------------
    # Feature Engineering
    # ----------------------------------------------------

    engineered = FeatureEngineeringService.generate_features(
        profile
    )
    
    # FIXED: Removed the unclosed opening parenthesis here
    financial_health_score = FinancialHealthScoringService.calculate_score(
        engineered
    )

    # ----------------------------------------------------
    # Merge Everything
    # ----------------------------------------------------

    record = {
        "persona": persona["name"],
        **profile.model_dump(),
        **engineered.model_dump(),
        "financial_health_score": financial_health_score
    }

    return record

def generate_dataset(
    num_records: int = 10000,
    output_file: str = "ml/data/financial_health_dataset.csv",
):
    """
    Generate a synthetic financial health dataset and save it to CSV.
    """

    output_path = Path(output_file)

    # Create folder if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("\nGenerating Dataset...")
    print(f"Target Records : {num_records}")
    print(f"Output File    : {output_path}")

    records = []

    for i in range(num_records):

        record = generate_profile()

        records.append(record)

        if (i + 1) % 1000 == 0:
            print(f"Generated {i + 1} records...")

    fieldnames = records[0].keys()

    with open(output_path, "w", newline="", encoding="utf-8") as csv_file:

        writer = csv.DictWriter(
            csv_file,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        writer.writerows(records)

    print("\n==========================================")
    print("Dataset Generation Completed Successfully!")
    print(f"Total Records : {len(records)}")
    print(f"Saved To      : {output_path}")
    print("==========================================")

def main():

    print("=" * 90)
    print("Financial Health Dataset Generator")
    print("=" * 90)

    # Uncomment to inspect sample profiles
    # for i in range(6):
    #     print(f"\nPROFILE #{i+1}\n")
    #     pprint(generate_profile())
    #     print("-" * 90)

    generate_dataset(
        num_records=10000,
        output_file="ml/data/financial_health_dataset.csv",
    )

if __name__ == "__main__":
    main()