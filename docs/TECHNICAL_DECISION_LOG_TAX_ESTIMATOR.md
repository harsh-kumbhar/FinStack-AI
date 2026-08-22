# Tax Estimator Technical Decision Log

## 1. Supported Financial Year
### Decision
The V1 Tax Estimator supports the Financial Year 2024-25 (Assessment Year 2025-26).
### Alternatives
FY 2023-24 (which is in the past, less useful for active planning), FY 2025-26 (which might lack finalized exact limits if a new budget is pending/freshly announced).
### Reason
FY 2024-25 is the most current and stable, well-documented tax year for active financial planning that individuals are typically filing for or estimating for.
### Evidence
Income Tax Department, Government of India (https://incometaxindia.gov.in/).
### Impact
Rules for 2024-25 are strictly applied. If a user queries for another year, the engine will raise a validation error, preventing hallucinated calculations.

## 2. Authoritative Tax Sources
### Decision
Income Tax Department official portal and Finance Act 2024 documents.
### Alternatives
Third-party blog sites (ClearTax, BankBazaar), which can occasionally have typos or outdated summaries.
### Reason
Strict compliance with the specification requires verified primary sources.
### Evidence
Slabs and cess were verified directly against `incometaxindia.gov.in`.
### Impact
The calculations can be fully trusted and legally defended as matching the tax laws exactly.

## 3. Supported Input Categories
### Decision
V1 supports Gross Salary, Other Income (e.g., interest), and Section 80C, 80D, 80TTA deductions.
### Alternatives
Supporting all 50+ sections of Chapter VI-A.
### Reason
This covers 90% of a standard retail taxpayer's use case and allows us to validate the complex dual-regime comparison robustly before adding edge-case deductions like 80EEA.
### Impact
Keeps the engine deterministic and easy to thoroughly test.

## 4. Rule Representation
### Decision
Rules are localized in dedicated python modules per financial year (`backend/modules/tax_estimator/rules/fy_2024_25.py`) and loaded via a central registry.
### Alternatives
Database-driven rules or JSON-based rules.
### Reason
Python modules provide strong typing, easy imports, version control tracking, and immediate execution speed without DB overhead. The registry pattern supports OCP (Open-Closed Principle) when adding new years.
### Impact
Extremely fast, stateless calculation engine.

## 5. Calculation Architecture
### Decision
The calculation engine is a pure, deterministic function `calculate_tax` taking Pydantic domain models.
### Alternatives
Stateful classes or closely coupling the logic with FastAPI request models.
### Reason
Pure functions are trivial to unit test, debug, and execute safely outside the context of a web request.
### Impact
We can run thousands of calculations in tests quickly without starting a server.

## 6. Regime Handling
### Decision
The engine calculates both Old and New regimes simultaneously and returns a side-by-side breakdown with a final recommendation based strictly on the lower tax liability.
### Alternatives
Requiring the user to specify a regime up-front and only calculating that one.
### Reason
A core value-add for the user is seeing the comparison automatically to make financial decisions.

## 7. Monetary/Rounding Strategy
### Decision
Monetary values are strictly parsed as Python `Decimal`. Final tax liability is rounded to the nearest multiple of 10 using `ROUND_HALF_UP`.
### Alternatives
Using standard `float`.
### Reason
Floating-point inaccuracies (e.g., 0.1 + 0.2) are unacceptable in financial applications. Rounding to the nearest 10 is legally mandated by Section 288B of the Income Tax Act.
### Impact
Calculations are exact and identical across runs.

## 8. Validation Strategy
### Decision
Pydantic is used at the domain boundary to enforce non-negative monetary values and valid financial years.
### Alternatives
Manual `if val < 0: raise Exception` blocks.
### Reason
Pydantic centralizes and standardizes error throwing.

## 9. Testing Methodology
### Decision
Comprehensive boundary testing and full-scenario integration testing (e.g., high-income surcharge trigger, zero-income limits) using `pytest`.
### Reason
As mandated by the specification, the accuracy must be verified.
### Impact
Ensures that the engine is a reliable foundation for the API.
