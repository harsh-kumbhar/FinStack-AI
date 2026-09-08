from typing import Optional


DOCUMENT_TYPES = {
    "salary_slip": [
        "salary slip",
        "salary statement",
        "gross salary",
        "net salary",
        "basic salary",
        "employee id",
        "pay period",
        "earnings",
        "deductions",
    ],
    "bank_statement": [
        "bank statement",
        "account statement",
        "transaction date",
        "transaction details",
        "opening balance",
        "closing balance",
        "debit",
        "credit",
        "available balance",
    ],
    "itr": [
        "income tax return",
        "itr",
        "assessment year",
        "gross total income",
        "total income",
        "income tax",
        "tax payable",
        "acknowledgement number",
    ],
    "pan": [
        "permanent account number",
        "pan card",
        "income tax department",
        "father's name",
        "date of birth",
    ],
    "loan_statement": [
        "loan statement",
        "loan account",
        "principal outstanding",
        "interest rate",
        "emi",
        "equated monthly instalment",
        "outstanding principal",
        "loan amount",
    ],
    "insurance": [
        "insurance policy",
        "policy number",
        "sum assured",
        "premium",
        "policyholder",
        "maturity benefit",
        "insurance premium",
    ],
    "investment": [
        "investment statement",
        "portfolio",
        "mutual fund",
        "units",
        "nav",
        "capital gains",
        "investment value",
        "folio number",
    ],
    "credit_card": [
        "credit card statement",
        "credit card",
        "credit limit",
        "available credit",
        "minimum amount due",
        "total amount due",
        "cardholder",
        "statement date",
    ],
}


def normalize_text(text: str) -> str:
    """Normalize extracted text for keyword matching."""
    return " ".join(text.lower().split())


def classify_document(
    raw_text: str,
) -> tuple[Optional[str], float, dict]:
    """
    Classify a financial document using keyword/phrase matching.

    Returns:
        (
            document_type,
            confidence_score,
            matched_keywords
        )
    """

    if not raw_text or not raw_text.strip():
        return None, 0.0, {}

    text = normalize_text(raw_text)

    scores = {}
    matched_keywords = {}

    for document_type, keywords in DOCUMENT_TYPES.items():
        matches = []

        for keyword in keywords:
            if keyword.lower() in text:
                matches.append(keyword)

        if matches:
            scores[document_type] = len(matches)
            matched_keywords[document_type] = matches

    if not scores:
        return None, 0.0, {}

    # Highest number of matching indicators wins.
    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]

    total_keywords = len(DOCUMENT_TYPES[best_type])

    # Normalize to a 0–1 confidence score.
    confidence = min(best_score / max(total_keywords * 0.5, 1), 1.0)

    return (
        best_type,
        round(confidence, 2),
        matched_keywords,
    )