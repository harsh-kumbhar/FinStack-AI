import joblib
import pandas as pd
from pathlib import Path
from datetime import datetime
from common.database import supabase
from .schemas import LoanRiskRequest, LoanProfileDefaultsResponse, FieldProvenance, LoanMarketplaceResponse, LoanMarketOffer

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
        raw_loan_amt = self._safe_float(p.get('LoanAmount'))
        raw_annual_inc = self._safe_float(p.get('AnnualIncome'))
        raw_monthly_debt = self._safe_float(p.get('MonthlyDebtPayments'))
        raw_monthly_inc = raw_annual_inc / 12.0 if raw_annual_inc > 0 else 1.0
        m_rate = (base_interest_rate / 100.0) / 12.0
        if m_rate > 0 and loan_duration > 0:
            emi_calc = (raw_loan_amt * m_rate * ((1 + m_rate) ** loan_duration)) / (((1 + m_rate) ** loan_duration) - 1)
        elif loan_duration > 0:
            emi_calc = raw_loan_amt / loan_duration
        else:
            emi_calc = 0.0
        foir = (raw_monthly_debt + emi_calc) / raw_monthly_inc
        if credit_score >= 700 and foir <= 0.55:
            is_approved = True
            calc_conf = round(0.72 + (credit_score - 700) * 0.001 - (foir - 0.20) * 0.15, 2)
            approval_confidence = max(0.65, min(0.95, calc_conf))
            calc_risk = round(0.12 + foir * 0.30 - (credit_score - 700) * 0.0005, 2)
            risk_probability = max(0.10, min(0.35, calc_risk))
        elif credit_score >= 650 and foir <= 0.60:
            is_approved = approval_confidence >= 0.25
        else:
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

    @staticmethod
    def get_profile_defaults(user_id: str) -> LoanProfileDefaultsResponse:
        """
        Extract profile-derived loan input defaults for the authenticated user.
        Queries financial_profile using actual schema columns and user_financial_records.
        """
        employment_status = "Employed"
        education_level = "Bachelor"
        annual_income = 0.0
        savings_balance = 0.0
        credit_score = 720.0
        monthly_debt = 0.0
        has_profile = False
        field_sources: Dict[str, FieldProvenance] = {}

        try:
            # 1. Fetch user_profile just to get the profile ID
            u_res = (
                supabase
                .table("user_profile")
                .select("id")
                .eq("user_id", user_id)
                .execute()
            )

            if u_res and u_res.data and len(u_res.data) > 0:
                has_profile = True
                u_id = u_res.data[0].get("id")

                # 2. Fetch financial_profile with correct CSV columns
                if u_id:
                    f_res = (
                        supabase
                        .table("financial_profile")
                        .select("employment_status, monthly_income, emergency_fund, investments, total_debt")
                        .eq("user_profile_id", u_id)
                        .execute()
                    )
                    if f_res and f_res.data and len(f_res.data) > 0:
                        f_data = f_res.data[0]

                        # A. Map Employment Status
                        raw_emp = str(f_data.get("employment_status") or "").lower()
                        if raw_emp == "salaried":
                            employment_status = "Employed"
                            field_sources["EmploymentStatus"] = FieldProvenance(
                                source="FINSTACK_PROFILE", raw_value="Employed", confidence=1.0, notes="Mapped from 'salaried'"
                            )
                        elif raw_emp in ["student", "unemployed"]:
                            employment_status = "Unemployed"
                            field_sources["EmploymentStatus"] = FieldProvenance(
                                source="FINSTACK_PROFILE", raw_value="Unemployed", confidence=1.0, notes=f"Mapped from '{raw_emp}'"
                            )
                        elif raw_emp in ["business", "self-employed"]:
                            employment_status = "Self-Employed"
                            field_sources["EmploymentStatus"] = FieldProvenance(
                                source="FINSTACK_PROFILE", raw_value="Self-Employed", confidence=1.0, notes=f"Mapped from '{raw_emp}'"
                            )

                        # B. Annual Income
                        if f_data.get("monthly_income"):
                            annual_income = float(f_data["monthly_income"]) * 12.0
                            field_sources["AnnualIncome"] = FieldProvenance(
                                source="FINSTACK_PROFILE", raw_value=annual_income, confidence=0.8, notes="Annualized from Monthly Income"
                            )

                        # C. Total Savings (Emergency Fund + Investments)
                        e_fund = float(f_data.get("emergency_fund") or 0)
                        inv = float(f_data.get("investments") or 0)
                        if e_fund > 0 or inv > 0:
                            savings_balance = e_fund + inv
                            field_sources["SavingsAccountBalance"] = FieldProvenance(
                                source="FINSTACK_PROFILE", raw_value=savings_balance, confidence=0.7, notes="Sum of Emergency Fund & Investments"
                            )

                        # D. Monthly Debt (Estimate ~3% of Total Debt)
                        t_debt = float(f_data.get("total_debt") or 0)
                        if t_debt > 0:
                            monthly_debt = round(t_debt * 0.03, 2)
                            field_sources["MonthlyDebtPayments"] = FieldProvenance(
                                source="FINSTACK_PROFILE", raw_value=monthly_debt, confidence=0.5, notes="Estimated at 3% of Total Debt"
                            )

                    # 3. Document Vault (user_financial_records) - Higher Precedence
                    v_res = (
                        supabase
                        .table("user_financial_records")
                        .select("record_type, record_data")
                        .eq("user_profile_id", u_id)
                        .execute()
                    )
                    if v_res and v_res.data:
                        for rec in v_res.data:
                            rtype = rec.get("record_type")
                            rdata = rec.get("record_data", {})

                            if rtype == "salary_slip" and rdata.get("gross_salary"):
                                annual_income = float(rdata["gross_salary"]) * 12.0
                                field_sources["AnnualIncome"] = FieldProvenance(
                                    source="DOCUMENT_EXTRACTED", raw_value=annual_income, confidence=0.95, notes="Annualized from verified Salary Slip"
                                )
                            elif rtype == "itr" and rdata.get("gross_total_income"):
                                annual_income = float(rdata["gross_total_income"])
                                field_sources["AnnualIncome"] = FieldProvenance(
                                    source="DOCUMENT_EXTRACTED", raw_value=annual_income, confidence=0.99, notes="Extracted from verified ITR"
                                )

        except Exception as exc:
            print(f"Loan Defaults Lookup Warning: {exc}")

        # Set fallback provenance tags for unset fields
        defaults_map = {
            "EmploymentStatus": (employment_status, "Default employed status"),
            "EducationLevel": (education_level, "Default bachelor level"),
            "AnnualIncome": (annual_income, "No salary records found"),
            "SavingsAccountBalance": (savings_balance, "No savings records found"),
            "CreditScore": (credit_score, "Default baseline credit score (720)"),
            "MonthlyDebtPayments": (monthly_debt, "No debt records found")
        }
        for k, (v, note) in defaults_map.items():
            if k not in field_sources:
                field_sources[k] = FieldProvenance(
                    source="DEFAULT", raw_value=v, confidence=1.0, notes=note
                )

        return LoanProfileDefaultsResponse(
            EmploymentStatus=employment_status,
            EducationLevel=education_level,
            AnnualIncome=annual_income,
            SavingsAccountBalance=savings_balance,
            CreditScore=credit_score,
            MonthlyDebtPayments=monthly_debt,
            has_profile_data=has_profile,
            field_sources=field_sources,
        )

    @staticmethod
    def get_market_offers() -> LoanMarketplaceResponse:
        """
        Simulates a live feed of current Indian banking loan schemes.
        These rates are calibrated to actual FY 2024-25 market conditions.
        """
        offers = [
            # Personal Loans
            LoanMarketOffer(
                id="sbi_pl_01", bank_name="State Bank of India", loan_type="Personal Loan",
                interest_rate=11.15, max_duration_months=72, min_credit_score=700,
                description="SBI Xpress Credit for Salaried Employees.", logo_color="#0066cc"
            ),
            LoanMarketOffer(
                id="icici_pl_02", bank_name="ICICI Bank", loan_type="Personal Loan",
                interest_rate=10.80, max_duration_months=60, min_credit_score=720,
                description="Pre-approved Instant Personal Loan.", logo_color="#f37021"
            ),
            # Home Loans
            LoanMarketOffer(
                id="hdfc_hl_01", bank_name="HDFC Bank", loan_type="Home Loan",
                interest_rate=8.50, max_duration_months=360, min_credit_score=750,
                description="Special Housing Rate for Professionals.", logo_color="#ed232a"
            ),
            LoanMarketOffer(
                id="axis_hl_01", bank_name="Axis Bank", loan_type="Home Loan",
                interest_rate=8.75, max_duration_months=360, min_credit_score=700,
                description="Asha Home Loan for low-income brackets.", logo_color="#97144d"
            ),
            # Auto Loans
            LoanMarketOffer(
                id="sbi_al_01", bank_name="State Bank of India", loan_type="Auto Loan",
                interest_rate=8.95, max_duration_months=84, min_credit_score=700,
                description="SBI New Car Loan Scheme.", logo_color="#0066cc"
            ),
            LoanMarketOffer(
                id="axis_al_01", bank_name="Axis Bank", loan_type="Auto Loan",
                interest_rate=9.20, max_duration_months=60, min_credit_score=720,
                description="New Car Loan with 100% On-Road Funding.", logo_color="#97144d"
            ),
            # Education / Specialty
            LoanMarketOffer(
                id="bob_ed_01", bank_name="Bank of Baroda", loan_type="Education Loan",
                interest_rate=9.85, max_duration_months=120, min_credit_score=680,
                description="Baroda Vidya for Premier Institutions.", logo_color="#f15a22"
            ),
        ]
        
        return LoanMarketplaceResponse(
            offers=offers,
            last_updated=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        )

loan_risk_service = LoanRiskService()
