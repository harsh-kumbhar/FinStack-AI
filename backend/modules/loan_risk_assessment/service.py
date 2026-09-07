import joblib
import pandas as pd
from pathlib import Path
from .schemas import LoanRiskRequest

MODELS_DIR = Path(__file__).resolve().parent / "models"
LOAN_MODEL_PATH = MODELS_DIR / "loan_approval_model_no_cc.joblib"
LOAN_SCALER_PATH = MODELS_DIR / "loan_scaler_no_cc.joblib"
RISK_MODEL_PATH = MODELS_DIR / "risk_score_model_no_cc.joblib"
RISK_SCALER_PATH = MODELS_DIR / "risk_scaler_no_cc.joblib"

# Purchasing Power Parity (PPP) rate: 1 USD = ~23 INR
PPP_MULTIPLIER = 23.0

class LoanRiskService:
    def __init__(self):
        self.loan_model = joblib.load(LOAN_MODEL_PATH)
        self.loan_scaler = joblib.load(LOAN_SCALER_PATH)
        self.risk_model = joblib.load(RISK_MODEL_PATH)
        self.risk_scaler = joblib.load(RISK_SCALER_PATH)
        
        self.feature_columns = [
            'DebtToIncomeRatio', 'CreditScore', 'AnnualIncome', 'LoanAmount',
            'SavingsAccountBalance', 'MonthlyDebtPayments', 'LoanDuration',
            'BaseInterestRate', 'EmploymentStatus_Self-Employed',
            'EmploymentStatus_Unemployed', 'EducationLevel_Bachelor',
            'EducationLevel_Doctorate', 'EducationLevel_High School',
            'EducationLevel_Master'
        ]

    def _safe_float(self, value, default=0.0):
        try:
            if value is None or value == "":
                return default
            return float(value)
        except (TypeError, ValueError):
            return default

    def assess_risk(self, data: LoanRiskRequest):
        p = data.model_dump()

        # 1. Currency Conversion (INR to USD via PPP)
        annual_income = self._safe_float(p.get("AnnualIncome")) / PPP_MULTIPLIER
        savings = self._safe_float(p.get("SavingsAccountBalance")) / PPP_MULTIPLIER
        loan_amount = self._safe_float(p.get("LoanAmount")) / PPP_MULTIPLIER
        monthly_debt = self._safe_float(p.get("MonthlyDebtPayments")) / PPP_MULTIPLIER

        # Non-currency raw values
        loan_duration = self._safe_float(p.get("LoanDuration"), 36.0)
        base_interest_rate = self._safe_float(p.get("BaseInterestRate"), 8.5)
        credit_score = self._safe_float(p.get("CreditScore"))
        
        # 2. Ratio Calculations
        monthly_income = annual_income / 12.0
        debt_to_income_ratio = monthly_debt / monthly_income if monthly_income > 0 else 0.0

        # 3. Categorical Encoding (One-Hot)
        emp = p.get("EmploymentStatus", "")
        edu = p.get("EducationLevel", "")

        row = {
            'DebtToIncomeRatio': debt_to_income_ratio,
            'CreditScore': credit_score,
            'AnnualIncome': annual_income,
            'LoanAmount': loan_amount,
            'SavingsAccountBalance': savings,
            'MonthlyDebtPayments': monthly_debt,
            'LoanDuration': loan_duration,
            'BaseInterestRate': base_interest_rate / 100.0, 
            'EmploymentStatus_Self-Employed': 1.0 if emp == "Self-Employed" else 0.0,
            'EmploymentStatus_Unemployed': 1.0 if emp == "Unemployed" else 0.0,
            'EducationLevel_Bachelor': 1.0 if edu == "Bachelor" else 0.0,
            'EducationLevel_Doctorate': 1.0 if edu == "Doctorate" else 0.0,
            'EducationLevel_High School': 1.0 if edu == "High School" else 0.0,
            'EducationLevel_Master': 1.0 if edu == "Master" else 0.0,
        }

        # 4. Data Preprocessing & Scaling
        input_df = pd.DataFrame([row], columns=self.feature_columns)
        loan_scaled = self.loan_scaler.transform(input_df)
        risk_scaled = self.risk_scaler.transform(input_df)
        
        # 5. Model Execution
        approval_probs = self.loan_model.predict_proba(loan_scaled)[0]
        approval_confidence = float(approval_probs[1]) if len(approval_probs) > 1 else float(approval_probs[0])
        
        risk_score_val = float(self.risk_model.predict(risk_scaled)[0])
        risk_probability = risk_score_val / 100.0 if risk_score_val > 1.0 else risk_score_val
        
        # 6. Business Logic (Approve if confidence > 40%)
        is_approved = approval_confidence > 0.40
        risk_prediction = 0 if is_approved else 1

        # 7. Estimated Monthly Payment (Standard Amortization Formula)
        # Convert annual interest rate to monthly decimal
        monthly_rate = (base_interest_rate / 100.0) / 12.0
        if monthly_rate > 0 and loan_duration > 0:
            # Amortization formula
            raw_monthly_payment = (loan_amount * monthly_rate * ((1 + monthly_rate) ** loan_duration)) / (((1 + monthly_rate) ** loan_duration) - 1)
        elif loan_duration > 0:
            raw_monthly_payment = loan_amount / loan_duration
        else:
            raw_monthly_payment = 0.0
            
        # Convert the payment back to INR for the frontend to display natively
        monthly_payment_inr = raw_monthly_payment * PPP_MULTIPLIER

        return {
            "risk_prediction": risk_prediction,
            "risk_probability": round(risk_probability, 4),
            "approval_confidence": round(approval_confidence, 4),
            "debt_to_income_ratio": round(debt_to_income_ratio, 4),
            "monthly_payment_estimate": round(monthly_payment_inr, 2),
            "status": "Approved" if is_approved else "Rejected",
        }

loan_risk_service = LoanRiskService()
