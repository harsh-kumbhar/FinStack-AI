import io
from pypdf import PdfReader
from openai import OpenAI
import os
import json

def parse_financial_document(file_bytes: bytes) -> dict:
    """
    Extracts text from a PDF and uses OpenAI to parse financial data into a structured dictionary.
    """
    # 1. Extract Text from PDF
    text = ""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    except Exception as e:
        raise ValueError(f"Failed to read PDF file: {str(e)}")

    if not text.strip():
        raise ValueError("Could not extract any text from the provided PDF.")

    # 2. Parse Text using OpenRouter (via OpenAI client)
    from dotenv import load_dotenv
    load_dotenv() # ensure env is loaded
    
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY")
    )
    
    prompt = """
    You are an expert financial data extraction AI. 
    Analyze the following extracted text from a financial document (e.g., W-2, pay stub, bank statement, tax return).
    Extract the following numerical values if present. If a value is not found, leave it as null.
    Convert all numbers to standard raw floats (e.g., 2500000 instead of 2.5M).
    
    Fields to extract (assume INR if not specified):
    - AnnualIncome: The yearly gross income. (If monthly is given, multiply by 12).
    - SavingsAccountBalance: Total savings or bank balance.
    - LoanAmount: The requested loan amount (if mentioned in a loan application doc).
    - MonthlyDebtPayments: Total monthly debt obligations (credit cards, other loans, rent/mortgage if specified as debt).
    - CreditScore: The applicant's credit score.
    - BaseInterestRate: The expected or approved interest rate (as a percentage, e.g., 8.5).
    - LoanDuration: The loan duration in months (if years are given, multiply by 12).
    
    Return ONLY a raw JSON object matching this schema exactly:
    {
        "AnnualIncome": float | null,
        "SavingsAccountBalance": float | null,
        "LoanAmount": float | null,
        "MonthlyDebtPayments": float | null,
        "CreditScore": float | null,
        "BaseInterestRate": float | null,
        "LoanDuration": float | null
    }
    """

    try:
        model_name = os.environ.get("LLM_MODEL", "deepseek/deepseek-chat")
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Document Text:\n{text[:15000]}"}
            ],
            response_format={ "type": "json_object" },
            temperature=0.0
        )
        
        parsed_data = json.loads(response.choices[0].message.content)
        return parsed_data
    except Exception as e:
        raise ValueError(f"Failed to parse document with AI: {str(e)}")
