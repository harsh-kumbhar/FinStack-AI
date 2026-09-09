from . import fy_2024_25

# Registry of supported financial years
_RULES_REGISTRY = {
    '2024-25': fy_2024_25
}

def get_tax_rules(financial_year: str):
    """
    Retrieves the tax rules module for a given financial year.
    Raises ValueError if the financial year is not supported.
    """
    rules = _RULES_REGISTRY.get(financial_year)
    if not rules:
        raise ValueError(f"Tax rules for financial year '{financial_year}' are not supported or verified yet.")
    return rules
