import re
from typing import Any, Optional


# =========================================================
# COMMON HELPERS
# =========================================================

def _normalize_text(text: str) -> str:
    """
    Normalize extracted PDF/OCR text without destroying
    useful line structure.
    """

    if not text:
        return ""

    text = text.replace("\xa0", " ")
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Normalize repeated spaces while preserving newlines.
    text = re.sub(r"[ \t]+", " ", text)

    # Remove excessive blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def _search_value(
    text: str,
    patterns: list[str],
) -> Optional[str]:
    """
    Search text using multiple regex patterns and return
    the first valid matched value.
    """

    if not text:
        return None

    text = _normalize_text(text)

    for pattern in patterns:
        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE | re.MULTILINE,
        )

        if match:
            value = match.group(1).strip()

            if value:
                return value

    return None


def _search_amount(
    text: str,
    patterns: list[str],
) -> Optional[float]:
    """
    Extract a monetary value and convert it to float.
    """

    value = _search_value(text, patterns)

    if not value:
        return None

    # Remove currency symbols, commas and spaces.
    cleaned = re.sub(r"[₹$,\s]", "", value)

    # Handle accounting-style negative values.
    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = "-" + cleaned[1:-1]

    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _search_date(
    text: str,
    patterns: list[str],
) -> Optional[str]:
    """
    Extract a date using supplied patterns.
    """

    return _search_value(text, patterns)


# =========================================================
# SALARY SLIP
# =========================================================

def extract_salary_slip(text: str) -> dict[str, Any]:
    text = _normalize_text(text)

    return {
        "employee_name": _search_value(
            text,
            [
                r"employee\s*name\s*[:\-]\s*([^\n]+)",
                r"employee\s*[:\-]\s*([^\n]+)",
                r"employee\s+([A-Za-z][A-Za-z .'-]+)",
            ],
        ),

        "employee_id": _search_value(
            text,
            [
                r"employee\s*(?:id|no|number)\s*[:\-]\s*([A-Za-z0-9\-\/]+)",
                r"emp(?:loyee)?\s*id\s*[:\-]\s*([A-Za-z0-9\-\/]+)",
            ],
        ),

        "employer": _search_value(
            text,
            [
                r"employer\s*[:\-]\s*([^\n]+)",
                r"company\s*(?:name)?\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "pay_period": _search_value(
            text,
            [
                r"pay\s*period\s*[:\-]\s*([^\n]+)",
                r"salary\s*(?:month|period)\s*[:\-]\s*([^\n]+)",
                r"pay\s*month\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "basic_salary": _search_amount(
            text,
            [
                r"basic\s*(?:salary|pay)\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"basic\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "gross_salary": _search_amount(
            text,
            [
                r"gross\s*(?:salary|pay|earnings)\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"gross\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "deductions": _search_amount(
            text,
            [
                r"total\s*deductions?\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"deductions?\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "net_salary": _search_amount(
            text,
            [
                r"net\s*(?:salary|pay)\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"net\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),
    }


# =========================================================
# BANK STATEMENT
# =========================================================

def extract_bank_statement(text: str) -> dict[str, Any]:
    text = _normalize_text(text)

    return {
        "account_holder": _search_value(
            text,
            [
                r"account\s*holder\s*[:\-]\s*([^\n]+)",
                r"account\s*name\s*[:\-]\s*([^\n]+)",
                r"customer\s*name\s*[:\-]\s*([^\n]+)",
                r"customer\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "account_number": _search_value(
            text,
            [
                r"account\s*(?:number|no|#)\s*[:\-]?\s*([A-Za-z0-9Xx\-\/]+)",
                r"a\/c\s*(?:no|number)?\s*[:\-]?\s*([A-Za-z0-9Xx\-\/]+)",
            ],
        ),

        "statement_period": _search_value(
            text,
            [
                r"statement\s*period\s*[:\-]\s*([^\n]+)",
                r"statement\s*(?:from|date)\s*[:\-]?\s*([^\n]+)",
                r"period\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "opening_balance": _search_amount(
            text,
            [
                r"opening\s*balance\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"opening\s*bal(?:ance)?\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "closing_balance": _search_amount(
            text,
            [
                r"closing\s*balance\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"closing\s*bal(?:ance)?\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),
    }


# =========================================================
# ITR
# =========================================================

def extract_itr(text: str) -> dict[str, Any]:
    text = _normalize_text(text)

    return {
        "taxpayer_name": _search_value(
            text,
            [
                r"taxpayer\s*(?:name)?\s*[:\-]\s*([^\n]+)",
                r"name\s*of\s*(?:the\s*)?assessee\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "pan": _search_value(
            text,
            [
                r"\bPAN\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])\b",
            ],
        ),

        "assessment_year": _search_value(
            text,
            [
                r"assessment\s*year\s*[:\-]?\s*(\d{4}\s*[-–]\s*\d{2,4})",
                r"assessment\s*year\s*[:\-]?\s*(\d{4})",
            ],
        ),

        "gross_total_income": _search_amount(
            text,
            [
                r"gross\s*total\s*income\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "total_income": _search_amount(
            text,
            [
                r"total\s*income\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "tax_payable": _search_amount(
            text,
            [
                r"net\s*tax\s*payable\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"tax\s*payable\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),
    }


# =========================================================
# PAN
# =========================================================

def extract_pan(text: str) -> dict[str, Any]:
    text = _normalize_text(text)

    return {
        "name": _search_value(
            text,
            [
                r"name\s*[:\-]\s*([^\n]+)",
                r"name\s+([A-Z][A-Z .'-]{2,})",
            ],
        ),

        "pan_number": _search_value(
            text,
            [
                r"\b([A-Z]{5}[0-9]{4}[A-Z])\b",
            ],
        ),

        "date_of_birth": _search_date(
            text,
            [
                r"(?:date\s*of\s*birth|dob)\s*[:\-]\s*([^\n]+)",
            ],
        ),
    }


# =========================================================
# LOAN STATEMENT
# =========================================================

def extract_loan_statement(text: str) -> dict[str, Any]:
    text = _normalize_text(text)

    return {
        "borrower": _search_value(
            text,
            [
                r"borrower\s*(?:name)?\s*[:\-]\s*([^\n]+)",
                r"customer\s*name\s*[:\-]\s*([^\n]+)",
                r"borrower\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "loan_account_number": _search_value(
            text,
            [
                r"loan\s*(?:account\s*)?(?:number|no)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)",
                r"loan\s*id\s*[:\-]?\s*([A-Za-z0-9\-\/]+)",
            ],
        ),

        "outstanding_amount": _search_amount(
            text,
            [
                r"(?:outstanding\s*(?:amount|balance)?)\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "emi": _search_amount(
            text,
            [
                r"(?:emi|monthly\s*installment|monthly\s*emi)\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),

        "interest_rate": _search_value(
            text,
            [
                r"interest\s*rate\s*[:\-]?\s*([\d]+(?:\.\d+)?\s*%)",
                r"rate\s*of\s*interest\s*[:\-]?\s*([\d]+(?:\.\d+)?\s*%)",
            ],
        ),
    }


# =========================================================
# INSURANCE
# =========================================================

def extract_insurance(text: str) -> dict[str, Any]:
    text = _normalize_text(text)

    return {
        "policy_holder": _search_value(
            text,
            [
                r"policy\s*holder\s*[:\-]\s*([^\n]+)",
                r"insured\s*(?:name)?\s*[:\-]\s*([^\n]+)",
                r"proposer\s*(?:name)?\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "policy_number": _search_value(
            text,
            [
                r"policy\s*(?:number|no)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)",
                r"policy\s*id\s*[:\-]?\s*([A-Za-z0-9\-\/]+)",
            ],
        ),

        "insurer": _search_value(
            text,
            [
                r"insurer\s*[:\-]\s*([^\n]+)",
                r"insurance\s*company\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "policy_period": _search_value(
            text,
            [
                r"policy\s*period\s*[:\-]\s*([^\n]+)",
                r"policy\s*(?:start|end)\s*date\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "premium": _search_amount(
            text,
            [
                r"premium\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"premium\s*amount\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),
    }


# =========================================================
# INVESTMENT
# =========================================================

def extract_investment(text: str) -> dict[str, Any]:
    text = _normalize_text(text)

    return {
        "investor_name": _search_value(
            text,
            [
                r"investor\s*(?:name)?\s*[:\-]\s*([^\n]+)",
                r"holder\s*(?:name)?\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "investment_type": _search_value(
            text,
            [
                r"investment\s*type\s*[:\-]\s*([^\n]+)",
                r"type\s*of\s*investment\s*[:\-]\s*([^\n]+)",
            ],
        ),

        "account_number": _search_value(
            text,
            [
                r"(?:account|folio)\s*(?:number|no)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)",
            ],
        ),

        "amount": _search_amount(
            text,
            [
                r"(?:investment\s*)?amount\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"invested\s*amount\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        ),
    }


# =========================================================
# CREDIT CARD
# =========================================================
def extract_credit_card(text: str) -> dict[str, Any]:
    """
    Extract important information from credit-card statements.

    Handles both normal labelled layouts and table-based layouts
    such as HDFC credit-card statements.
    """

    text = _normalize_text(text)

    # =========================================================
    # CARDHOLDER
    # =========================================================

    cardholder = _search_value(
        text,
        [
            r"cardholder\s*(?:name)?\s*[:\-]\s*([^\n]+)",
            r"card\s*holder\s*(?:name)?\s*[:\-]\s*([^\n]+)",
            r"\bname\s*:\s*([A-Za-z][A-Za-z .'-]{2,})",
        ],
    )

    # =========================================================
    # CARD NUMBER
    # =========================================================

    card_number = _search_value(
        text,
        [
            r"card\s*(?:number|no)\s*[:\-]?\s*([Xx\d][Xx\d\s\-]{6,})",
        ],
    )

    if card_number:
        card_number = re.split(
            r"\s{2,}|\n",
            card_number,
        )[0].strip()

    # =========================================================
    # STATEMENT DATE
    # =========================================================

    statement_date = _search_date(
        text,
        [
            r"statement\s*date\s*[:\-]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
            r"statement\s*date\s*[:\-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})",
        ],
    )

    # =========================================================
    # PAYMENT DUE DATE
    # =========================================================

    due_date = _search_date(
        text,
        [
            r"payment\s*due\s*date\s*[:\-]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
            r"due\s*date\s*[:\-]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
        ],
    )

    # =========================================================
    # HDFC PAYMENT DUE TABLE
    # =========================================================
    #
    # Payment Due Date Total Dues Minimum Amount Due
    # 04/05/2019       27,610.00 12,477.00
    #
    # The values must be mapped according to column order.
    # =========================================================

    payment_due_match = re.search(
        r"Payment\s+Due\s+Date\s+"
        r"Total\s+Dues\s+"
        r"Minimum\s+Amount\s+Due"
        r"\s*"
        r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)",
        text,
        flags=re.IGNORECASE | re.MULTILINE,
    )

    total_due = None
    minimum_due = None

    if payment_due_match:
        if due_date is None:
            due_date = payment_due_match.group(1)

        total_due = _amount_to_float(
            payment_due_match.group(2)
        )

        minimum_due = _amount_to_float(
            payment_due_match.group(3)
        )

    else:
        # Fallback for conventional labelled formats.
        total_due = _search_amount(
            text,
            [
                r"total\s*(?:amount\s*)?due\s*[:\-]\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"total\s*dues\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        )

        minimum_due = _search_amount(
            text,
            [
                r"minimum\s*(?:amount\s*)?due\s*[:\-]\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
                r"minimum\s*dues?\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        )

    # =========================================================
    # CREDIT LIMIT TABLE
    # =========================================================
    #
    # Credit Limit Available Credit Limit Available Cash Limit
    # 2,50,000    1,40,785             1,00,000
    #
    # Again, use column order instead of searching individual
    # labels independently.
    # =========================================================

    credit_limit = None
    available_credit_limit = None
    available_cash_limit = None

    credit_limit_match = re.search(
        r"Credit\s+Limit\s+"
        r"Available\s+Credit\s+Limit\s+"
        r"Available\s+Cash\s+Limit"
        r"\s*"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)",
        text,
        flags=re.IGNORECASE | re.MULTILINE,
    )

    if credit_limit_match:
        credit_limit = _amount_to_float(
            credit_limit_match.group(1)
        )

        available_credit_limit = _amount_to_float(
            credit_limit_match.group(2)
        )

        available_cash_limit = _amount_to_float(
            credit_limit_match.group(3)
        )
    else:
        # Fallback for non-table layouts.
        credit_limit = _search_amount(
            text,
            [
                r"credit\s*limit\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        )

        available_credit_limit = _search_amount(
            text,
            [
                r"available\s*credit\s*limit\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        )

        available_cash_limit = _search_amount(
            text,
            [
                r"available\s*cash\s*limit\s*[:\-]?\s*[₹$]?\s*([\d,]+(?:\.\d{1,2})?)",
            ],
        )

    # =========================================================
    # ACCOUNT SUMMARY TABLE
    # =========================================================
    #
    # Opening Balance
    # Payment/Credits
    # Purchase/Debits
    # Finance Charges
    # Total Dues
    #
    # 12,388.87
    # 38,489.50
    # 53,710.82
    # 0.00
    # 27,610.00
    #
    # Because the PDF extraction separates the headers from
    # their values, map values according to their known order.
    # =========================================================

    opening_balance = None
    payments_credits = None
    purchases_debits = None
    finance_charges = None

    account_summary_match = re.search(
        r"Account\s+Summary"
        r".{0,500}?"
        r"Opening\s+Balance"
        r"\s+Payment\s*\/?\s*Credits"
        r"\s+Purchase\s*\/?\s*Debits"
        r"\s+Finance\s+Charges"
        r"\s+Total\s+Dues"
        r"\s*"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s+"
        r"([\d,]+(?:\.\d{1,2})?)",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )

    if account_summary_match:
        opening_balance = _amount_to_float(
            account_summary_match.group(1)
        )

        payments_credits = _amount_to_float(
            account_summary_match.group(2)
        )

        purchases_debits = _amount_to_float(
            account_summary_match.group(3)
        )

        finance_charges = _amount_to_float(
            account_summary_match.group(4)
        )

        # Prefer the table's Total Dues because it is
        # structurally associated with this summary.
        summary_total_due = _amount_to_float(
            account_summary_match.group(5)
        )

        if total_due is None:
            total_due = summary_total_due

    return {
        "cardholder": cardholder,
        "card_number": card_number,

        # Existing field retained for compatibility.
        "statement_period": statement_date,

        "statement_date": statement_date,
        "due_date": due_date,

        "total_due": total_due,
        "minimum_due": minimum_due,

        "credit_limit": credit_limit,
        "available_credit_limit": available_credit_limit,
        "available_cash_limit": available_cash_limit,

        "opening_balance": opening_balance,
        "payments_credits": payments_credits,
        "purchases_debits": purchases_debits,
        "finance_charges": finance_charges,
    }

# =========================================================
# AMOUNT HELPER FOR CREDIT-CARD TABLE EXTRACTION
# =========================================================

def _amount_to_float(value: str) -> Optional[float]:
    """
    Convert a known monetary string to float.
    """

    if not value:
        return None

    cleaned = re.sub(r"[₹$,\s]", "", value)

    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


# =========================================================
# MAIN EXTRACTION DISPATCHER
# =========================================================

EXTRACTORS = {
    "salary_slip": extract_salary_slip,
    "bank_statement": extract_bank_statement,
    "itr": extract_itr,
    "pan": extract_pan,
    "loan_statement": extract_loan_statement,
    "insurance": extract_insurance,
    "investment": extract_investment,
    "credit_card": extract_credit_card,
}


def extract_structured_data(
    raw_text: str,
    document_type: str,
) -> dict[str, Any]:
    """
    Extract structured financial information from document text
    according to the automatically classified document type.
    """

    if not raw_text:
        return {}

    extractor = EXTRACTORS.get(document_type)

    if not extractor:
        return {}

    return extractor(raw_text)

# =========================================================
# EXTRACTION VALIDATION
# =========================================================

def validate_extracted_data(
    extracted_data: dict[str, Any],
    document_type: str,
) -> dict[str, Any]:
    """
    Validate extracted structured data.

    Returns:
        {
            "is_valid": bool,
            "required_fields": int,
            "fields_found": int,
            "validation_checks": int,
            "validation_passed": int,
            "errors": list[str],
        }
    """

    if not extracted_data:
        return {
            "is_valid": False,
            "required_fields": 0,
            "fields_found": 0,
            "validation_checks": 0,
            "validation_passed": 0,
            "errors": ["No structured data was extracted."],
        }

    # ---------------------------------------------------------
    # Required fields by document type
    # ---------------------------------------------------------

    required_fields_map = {
        "salary_slip": [
            "employee_name",
            "employer",
            "gross_salary",
            "net_salary",
        ],

        "bank_statement": [
            "account_holder",
            "account_number",
            "opening_balance",
            "closing_balance",
        ],

        "itr": [
            "taxpayer_name",
            "pan",
            "assessment_year",
            "total_income",
        ],

        "pan": [
            "name",
            "pan_number",
            "date_of_birth",
        ],

        "loan_statement": [
            "borrower",
            "loan_account_number",
            "outstanding_amount",
            "emi",
        ],

        "insurance": [
            "policy_holder",
            "policy_number",
            "insurer",
            "premium",
        ],

        "investment": [
            "investor_name",
            "investment_type",
            "amount",
        ],

        "credit_card": [
            "cardholder",
            "card_number",
            "statement_date",
            "due_date",
            "total_due",
            "minimum_due",
            "credit_limit",
        ],
    }

    required_fields = required_fields_map.get(
        document_type,
        [],
    )

    errors = []

    fields_found = 0

    # ---------------------------------------------------------
    # Check required fields
    # ---------------------------------------------------------

    for field in required_fields:

        value = extracted_data.get(field)

        if value is None or value == "":
            errors.append(
                f"Missing required field: {field}"
            )
        else:
            fields_found += 1

    # ---------------------------------------------------------
    # Validation checks
    # ---------------------------------------------------------

    validation_checks = 0
    validation_passed = 0

    def check(condition: bool, message: str) -> None:
        nonlocal validation_checks
        nonlocal validation_passed

        validation_checks += 1

        if condition:
            validation_passed += 1
        else:
            errors.append(message)

    # =========================================================
    # CREDIT CARD VALIDATION
    # =========================================================

    if document_type == "credit_card":

        total_due = extracted_data.get("total_due")
        minimum_due = extracted_data.get("minimum_due")

        credit_limit = extracted_data.get("credit_limit")
        available_credit = extracted_data.get(
            "available_credit_limit"
        )
        available_cash = extracted_data.get(
            "available_cash_limit"
        )

        if total_due is not None and minimum_due is not None:
            check(
                total_due >= minimum_due,
                "Total due cannot be less than minimum due.",
            )

        if (
            credit_limit is not None
            and available_credit is not None
        ):
            check(
                credit_limit >= available_credit,
                "Available credit limit cannot exceed credit limit.",
            )

        if (
            credit_limit is not None
            and available_cash is not None
        ):
            check(
                credit_limit >= available_cash,
                "Available cash limit cannot exceed credit limit.",
            )

        if total_due is not None:
            check(
                total_due >= 0,
                "Total due cannot be negative.",
            )

        if minimum_due is not None:
            check(
                minimum_due >= 0,
                "Minimum due cannot be negative.",
            )

    # =========================================================
    # BANK STATEMENT VALIDATION
    # =========================================================

    elif document_type == "bank_statement":

        opening_balance = extracted_data.get(
            "opening_balance"
        )

        closing_balance = extracted_data.get(
            "closing_balance"
        )

        if opening_balance is not None:
            check(
                isinstance(opening_balance, (int, float)),
                "Opening balance must be numeric.",
            )

        if closing_balance is not None:
            check(
                isinstance(closing_balance, (int, float)),
                "Closing balance must be numeric.",
            )

    # =========================================================
    # COMMON NUMERIC VALIDATION
    # =========================================================

    numeric_fields = [
        "basic_salary",
        "gross_salary",
        "deductions",
        "net_salary",
        "opening_balance",
        "closing_balance",
        "total_income",
        "tax_payable",
        "outstanding_amount",
        "emi",
        "premium",
        "amount",
        "total_due",
        "minimum_due",
        "credit_limit",
        "available_credit_limit",
        "available_cash_limit",
        "payments_credits",
        "purchases_debits",
        "finance_charges",
    ]

    for field in numeric_fields:

        if field not in extracted_data:
            continue

        value = extracted_data.get(field)

        if value is not None:
            check(
                isinstance(value, (int, float)),
                f"{field} must be numeric.",
            )

    # ---------------------------------------------------------
    # Final validity
    # ---------------------------------------------------------

    is_valid = (
        fields_found == len(required_fields)
        and validation_passed == validation_checks
    )

    return {
        "is_valid": is_valid,
        "required_fields": len(required_fields),
        "fields_found": fields_found,
        "validation_checks": validation_checks,
        "validation_passed": validation_passed,
        "errors": errors,
    }


# =========================================================
# EXTRACTION CONFIDENCE
# =========================================================

def calculate_extraction_confidence(
    validation_result: dict[str, Any],
) -> float:
    """
    Calculate extraction confidence from field completeness
    and validation results.

    This is intentionally separate from document
    classification confidence.
    """

    required_fields = validation_result["required_fields"]
    fields_found = validation_result["fields_found"]

    validation_checks = validation_result["validation_checks"]
    validation_passed = validation_result["validation_passed"]

    # No defined fields.
    if required_fields == 0:
        return 0.0

    field_score = (
        fields_found / required_fields
    )

    if validation_checks > 0:
        validation_score = (
            validation_passed / validation_checks
        )
    else:
        validation_score = 1.0

    # Field completeness has slightly higher importance.
    confidence = (
        (field_score * 0.7)
        + (validation_score * 0.3)
    )

    return round(
        max(0.0, min(1.0, confidence)),
        4,
    )