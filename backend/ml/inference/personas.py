"""
=========================================================
Financial Personas
---------------------------------------------------------
This file contains realistic financial personas used
to generate the synthetic dataset for training the
Financial Health Prediction Model.
=========================================================
"""

FINANCIAL_PERSONAS = [

    {
        "name": "Student",
        "weight": 10,

        "age": (18, 24),

        "employment_status": ["Student"],

        "monthly_income": (0, 20000),

        "expense_ratio": (0.60, 0.95),

        "savings_rate": (0.00, 0.15),

        "emergency_fund_months": (0, 1),

        "debt": (0, 100000),

        "investment_ratio": (0.00, 0.05),

        "insurance_ratio": (1.00, 5.00),

        "financial_goal": [
            "Higher Education",
            "Emergency Fund"
        ]
    },

    {
        "name": "Young Salaried",
        "weight": 25,

        "age": (22, 30),

        "employment_status": ["Salaried"],

        "monthly_income": (30000, 80000),

        "expense_ratio": (0.40, 0.70),

        "savings_rate": (0.15, 0.35),

        "emergency_fund_months": (2, 6),

        "debt": (0, 300000),

        "investment_ratio": (0.05, 0.40),

        "insurance_ratio": (8, 15),

        "financial_goal": [
            "Buy a Car",
            "Wealth Creation"
        ]
    },

    {
        "name": "Mid Career",

        "weight": 20,

        "age": (30, 45),

        "employment_status": ["Salaried"],

        "monthly_income": (60000, 200000),

        "expense_ratio": (0.35, 0.60),

        "savings_rate": (0.20, 0.40),

        "emergency_fund_months": (4, 8),

        "debt": (200000, 3000000),

        "investment_ratio": (0.20, 1.00),

        "insurance_ratio": (12, 20),

        "financial_goal": [
            "Buy a House",
            "Children Education"
        ]
    },

    {
        "name": "Business Owner",

        "weight": 8,

        "age": (28, 60),

        "employment_status": ["Business"],

        "monthly_income": (100000, 1000000),

        "expense_ratio": (0.40, 0.75),

        "savings_rate": (0.15, 0.30),

        "emergency_fund_months": (3, 8),

        "debt": (500000, 10000000),

        "investment_ratio": (0.50, 3.00),

        "insurance_ratio": (12, 18),

        "financial_goal": [
            "Business",
            "Wealth Creation"
        ]
    },

    {
        "name": "Freelancer",

        "weight": 10,

        "age": (22, 45),

        "employment_status": ["Freelancer"],

        "monthly_income": (25000, 200000),

        "expense_ratio": (0.40, 0.80),

        "savings_rate": (0.10, 0.30),

        "emergency_fund_months": (3, 8),

        "debt": (0, 300000),

        "investment_ratio": (0.05, 0.50),

        "insurance_ratio": (8, 15),

        "financial_goal": [
            "Emergency Fund",
            "Wealth Creation"
        ]
    },

    {
        "name": "Retired",

        "weight": 5,

        "age": (58, 80),

        "employment_status": ["Retired"],

        "monthly_income": (20000, 150000),

        "expense_ratio": (0.50, 0.80),

        "savings_rate": (0.10, 0.30),

        "emergency_fund_months": (6, 12),

        "debt": (0, 500000),

        "investment_ratio": (0.50, 3.00),

        "insurance_ratio": (8, 15),

        "financial_goal": [
            "Retirement"
        ]
    },

    {
        "name": "High Income High Debt",

        "weight": 7,

        "age": (30, 55),

        "employment_status": [
            "Business",
            "Salaried"
        ],

        "monthly_income": (200000, 1000000),

        "expense_ratio": (0.60, 0.90),

        "savings_rate": (0.05, 0.20),

        "emergency_fund_months": (1, 4),

        "debt": (3000000, 20000000),

        "investment_ratio": (0.20, 1.00),

        "insurance_ratio": (10, 15),

        "financial_goal": [
            "Debt Reduction"
        ]
    },

    {
        "name": "Disciplined Saver",

        "weight": 7,

        "age": (25, 50),

        "employment_status": [
            "Salaried",
            "Freelancer"
        ],

        "monthly_income": (25000, 60000),

        "expense_ratio": (0.30, 0.55),

        "savings_rate": (0.35, 0.50),

        "emergency_fund_months": (6, 12),

        "debt": (0, 100000),

        "investment_ratio": (0.40, 1.50),

        "insurance_ratio": (12, 18),

        "financial_goal": [
            "Wealth Creation"
        ]
    },

    {
        "name": "Financially Stressed",

        "weight": 5,

        "age": (22, 55),

        "employment_status": [
            "Salaried",
            "Business",
            "Freelancer"
        ],

        "monthly_income": (20000, 50000),

        "expense_ratio": (0.90, 1.10),

        "savings_rate": (0.00, 0.05),

        "emergency_fund_months": (0, 1),

        "debt": (100000, 1000000),

        "investment_ratio": (0.00, 0.05),

        "insurance_ratio": (5.00, 8.00),

        "financial_goal": [
            "Emergency Fund"
        ]
    },

    {
        "name": "Wealth Builder",

        "weight": 3,

        "age": (30, 60),

        "employment_status": [
            "Business",
            "Salaried"
        ],

        "monthly_income": (80000, 500000),

        "expense_ratio": (0.30, 0.50),

        "savings_rate": (0.35, 0.50),

        "emergency_fund_months": (8, 12),

        "debt": (0, 500000),

        "investment_ratio": (1.00, 5.00),

        "insurance_ratio": (15, 25),

        "financial_goal": [
            "Wealth Creation"
        ]
    }

]