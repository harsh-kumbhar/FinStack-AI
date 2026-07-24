"""
=========================================================
Random Utility Functions
---------------------------------------------------------
Reusable helper functions for generating realistic
synthetic financial data.
=========================================================
"""

import random

from ml.personas import FINANCIAL_PERSONAS


def choose_persona():
    """
    Select a financial persona using weighted probability.
    """

    weights = [persona["weight"] for persona in FINANCIAL_PERSONAS]

    return random.choices(
        FINANCIAL_PERSONAS,
        weights=weights,
        k=1
    )[0]


def random_int(value_range):
    """
    Generate a random integer within a range.
    """

    return random.randint(value_range[0], value_range[1])


def random_float(value_range, decimals=2):
    """
    Generate a random float within a range.
    """

    return round(
        random.uniform(value_range[0], value_range[1]),
        decimals
    )


def random_choice(options):
    """
    Select one random option from a list.
    """

    return random.choice(options)


def percentage_of(base_value, percentage_range):
    """
    Calculate a percentage of a value.

    Example:
    Income = 50000
    Expense Ratio = (0.40, 0.70)

    Returns:
    Random expense between 40% and 70%.
    """

    percentage = random.uniform(
        percentage_range[0],
        percentage_range[1]
    )

    return round(base_value * percentage, 2)


def months_to_amount(monthly_income, months):
    """
    Convert emergency fund months into money.
    """

    return round(monthly_income * months, 2)


def ratio_to_amount(monthly_income, ratio):
    """
    Convert a ratio into a monetary amount.

    Example:
    Investment Ratio = 0.5

    Investment = Income × 0.5
    """

    return round(monthly_income * ratio, 2)