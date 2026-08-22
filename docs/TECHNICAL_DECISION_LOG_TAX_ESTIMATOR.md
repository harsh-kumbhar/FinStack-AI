# Tax Estimator Technical Decision Log

## 1. Supported Financial Year
### Decision
The V1 Tax Estimator supports the Financial Year 2024-25 (Assessment Year 2025-26).
### Alternatives
FY 2023-24 (which is in the past, less useful for active planning), FY 2025-26 (which might lack finalized exact limits if a new budget is pending/freshly announced).
### Reason
FY 2024-25 is the most current and stable, well-documented tax year for active financial planning that individuals are typically filing for or estimating for.
### Evidence
Income Tax Department, Government of India (https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1 and https://incometaxindia.gov.in/Tutorials/1.%20Tax%20rates.pdf).
### Impact
Rules for 2024-25 are strictly applied. If a user queries for another year, the engine will raise a validation error.

## 2. Authoritative Tax Sources
### Decision
Income Tax Department official portal and Finance Act 2024 documents.
### Alternatives
Third-party blog sites (ClearTax, BankBazaar), which can occasionally have typos.
### Reason
Strict compliance with the specification requires verified primary sources.
### Evidence
Slabs and cess were verified directly against `incometaxindia.gov.in`.
### Impact
The calculations can be fully trusted as matching the tax laws exactly.

## 3. Supported Input Categories & Deduction Capping
### Decision
V1 supports Gross Salary, Other Income, and Section 80C, 80D, 80TTA deductions. Invalid inputs (negative numbers) are rejected via Pydantic validators. However, if a user enters a valid deduction amount that exceeds statutory limits (e.g., 2,00,000 for 80C), the engine silently caps it to the statutory maximum (1,50,000) during calculation.
### Alternatives
Rejecting the request entirely if the user inputs `80C > 1.5L`.
### Reason
Capping is standard UX in financial calculators; it allows users to simply dump their total investments into the field without needing to manually remember the cap.
### Impact
Keeps the engine deterministic, resilient, and user-friendly.

## 4. Rule Representation
### Decision
Rules are localized in dedicated python modules per financial year (`backend/modules/tax_estimator/rules/fy_2024_25.py`) and loaded via a central registry.
### Alternatives
Database-driven rules.
### Reason
Python modules provide strong typing, version control tracking, and immediate execution speed. 
### Impact
Extremely fast, stateless calculation engine.

## 5. Calculation Architecture
### Decision
The calculation engine is a pure, deterministic function `calculate_tax` taking Pydantic domain models.

## 6. Regime Handling & 87A Marginal Relief
### Decision
The engine calculates both Old and New regimes simultaneously. For the New Regime, marginal relief for the 87A Rebate is explicitly implemented (capping the tax to the income exceeding 7L). The Old regime does not have 87A marginal relief in law.
### Alternatives
Ignoring marginal relief.
### Reason
Marginal relief is highly relevant for users hovering just above 7L in the New Regime, a key target audience.

## 7. Surcharge Explicit Scope & Exclusions
### Decision
Surcharge is implemented using strict percentage thresholds (e.g., >50L: 10%, >1Cr: 15%, >2Cr: 25%, >5Cr: 37% [Old] / 25% [New]).
**Explicit Exclusion:** Marginal Relief for Surcharge is *intentionally excluded* in V1. 
### Reason
Implementing surcharge marginal relief adds significant complexity (calculating tax at exactly 50L/1Cr/etc. and comparing differentials). For V1, the unified percentage application suffices for estimates. This will be added in V2.
### Impact
Calculations precisely at 50,00,001 will show a sharp spike in tax compared to a calculator with marginal relief.

## 8. Monetary/Rounding Strategy
### Decision
Monetary values are strictly parsed as Python `Decimal`. Final tax liability is rounded to the nearest multiple of 10 using `ROUND_HALF_UP` (Section 288B of the Income Tax Act).
### Reason
Floating-point inaccuracies are unacceptable. Rounding to the nearest 10 is legally mandated.

## 9. Testing Methodology
### Decision
Comprehensive boundary testing, unit testing of the calculation engine, and domain validations using `pytest`.
### Reason
As mandated by the specification, the accuracy must be verified. 
*Note: This strictly covers calculation unit tests. API, Database, and Frontend E2E testing will be implemented in their respective future batches.*
