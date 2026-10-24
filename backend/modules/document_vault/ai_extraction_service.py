import os
import json
from typing import Any, List
from pydantic import BaseModel
from openai import OpenAI

def extract_financial_data_with_ai(raw_text: str, document_type: str) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set.")

    model = os.environ.get("LLM_MODEL", "deepseek/deepseek-chat")
    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)

    # =========================================================
    # 1. BANK STATEMENT
    # =========================================================
    if document_type == "bank_statement":
        class Transaction(BaseModel):
            date: str | None = None
            description: str | None = None
            amount: float | None = None
            type: str | None = None 
            
        class Schema(BaseModel):
            account_holder: str | None = None
            account_number: str | None = None
            statement_period: str | None = None
            currency: str | None = None
            opening_balance: float | None = None
            closing_balance: float | None = None
            transactions: List[Transaction] = []
            
        instruction = "Extract bank statement details, balances, currency, and EVERY individual transaction (type must be 'credit' or 'debit')."

    # =========================================================
    # 2. SALARY SLIP
    # =========================================================
    elif document_type == "salary_slip":
        class BreakdownItem(BaseModel):
            description: str | None = None
            amount: float | None = None
            
        class Schema(BaseModel):
            employee_name: str | None = None
            employer: str | None = None
            pay_period: str | None = None
            currency: str | None = None
            gross_salary: float | None = None
            total_deductions: float | None = None
            net_salary: float | None = None
            earnings_breakdown: List[BreakdownItem] = []
            deductions_breakdown: List[BreakdownItem] = []
            
        instruction = "Extract salary details, currency, total salaries, and arrays of individual earnings and deductions."

# =========================================================
    # 3. ITR (Income Tax Return)
    # =========================================================
    elif document_type == "itr":
        class Schema(BaseModel):
            taxpayer_name: str | None = None
            pan: str | None = None
            assessment_year: str | None = None
            currency: str | None = None
            gross_total_income: float | None = None
            total_income: float | None = None
            tax_payable: float | None = None
            section_80c: float | None = None  # Added to extract 80C
            section_80d: float | None = None  # Added to extract 80D
            
        instruction = "Extract income tax return (ITR) and computation details. Explicitly look for Section 80C (like EPF/ELSS) and Section 80D (Health Insurance) deduction amounts."

    # =========================================================
    # 4. PAN CARD
    # =========================================================
    elif document_type == "pan":
        class Schema(BaseModel):
            name: str | None = None
            pan_number: str | None = None
            date_of_birth: str | None = None
            
        instruction = "Extract the Permanent Account Number (PAN) details including name, PAN number, and Date of Birth."

    # =========================================================
    # 5. LOAN STATEMENT
    # =========================================================
    elif document_type == "loan_statement":
        class LoanTransaction(BaseModel):
            date: str | None = None
            description: str | None = None
            amount: float | None = None
            
        class Schema(BaseModel):
            borrower: str | None = None
            loan_account_number: str | None = None
            currency: str | None = None
            outstanding_amount: float | None = None
            emi: float | None = None
            interest_rate: str | None = None
            transactions: List[LoanTransaction] = []
            
        instruction = "Extract loan details, borrower, currency, outstanding principal, EMI, interest rate, and recent transactions."

    # =========================================================
    # 6. INSURANCE
    # =========================================================
    elif document_type == "insurance":
        class Schema(BaseModel):
            policy_holder: str | None = None
            policy_number: str | None = None
            insurer: str | None = None
            policy_period: str | None = None
            currency: str | None = None
            premium: float | None = None
            sum_assured: float | None = None
            
        instruction = "Extract insurance policy details including the holder, insurer, policy period, currency, premium, and sum assured."

    # =========================================================
    # 7. INVESTMENT
    # =========================================================
    elif document_type == "investment":
        class Holding(BaseModel):
            asset_name: str | None = None
            units: float | None = None
            current_value: float | None = None
            
        class Schema(BaseModel):
            investor_name: str | None = None
            investment_type: str | None = None
            account_number: str | None = None
            currency: str | None = None
            total_amount: float | None = None
            holdings: List[Holding] = []
            
        instruction = "Extract investment portfolio details, currency, total value, and an array of individual asset holdings."

    # =========================================================
    # 8. CREDIT CARD
    # =========================================================
    elif document_type == "credit_card":
        class CCTransaction(BaseModel):
            date: str | None = None
            description: str | None = None
            amount: float | None = None
            
        class Schema(BaseModel):
            cardholder: str | None = None
            card_number: str | None = None
            statement_date: str | None = None
            due_date: str | None = None
            currency: str | None = None
            total_due: float | None = None
            minimum_due: float | None = None
            credit_limit: float | None = None
            transactions: List[CCTransaction] = []
            
        instruction = "Extract credit card statement details, payment due dates, limits, currency, and an array of individual transactions."

    else:
        raise ValueError(f"Unsupported document type: {document_type}")

    # =========================================================
    # EXECUTE PROMPT
    # =========================================================
    schema_json = Schema.model_json_schema()
    system_instruction = (
        f"{instruction} Output amounts as floats without currency symbols. "
        f"You MUST return ONLY a valid JSON object matching this exact schema: {json.dumps(schema_json)}"
    )
    prompt = f"Extract the requested data from the following document text:\n\n{raw_text[:25000]}"

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0, 
        )
        
        result_text = response.choices[0].message.content.strip()
        if result_text.startswith("```json"):
            result_text = result_text.replace("```json", "", 1)
        if result_text.endswith("```"):
            result_text = result_text.rsplit("```", 1)[0]
            
        return result_text.strip()

    except Exception as e:
         raise RuntimeError(f"AI Extraction failed via OpenRouter: {str(e)}")