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
*Note: Calculation unit tests (89) and API/service/database integration tests (28) are implemented. Frontend E2E testing will be implemented in Batch 3.*

## 10. API Design (Batch 2)
### Decision
Three endpoints exposed via `POST /tax-estimator/calculate`, `GET /tax-estimator/history`, and `GET /tax-estimator/history/{assessment_id}`. All endpoints require authentication via `Depends(get_current_user)`.
### Alternatives
Single combined endpoint, or admin-level endpoints.
### Reason
Follows existing project convention (e.g., `/financial-health/predict`, `/financial-health/history`). Separation of calculate vs. history read is clean REST design.
### Impact
Clean, consistent API surface matching existing FinStack patterns.

## 11. Service Layer (Batch 2)
### Decision
`TaxEstimatorService` class with static methods handles all application concerns: building domain input, invoking the deterministic engine, persisting to Supabase, retrieving history, and enforcing ownership.
### Reason
Router remains thin (no business logic). Engine remains pure (no database/HTTP concerns). Service orchestrates between them.

## 12. Database Design (Batch 2)
### Decision
Dedicated `tax_assessments` table with normalized columns for all inputs, both regime breakdowns, recommendation, and timestamps. UUID primary key, `user_id` FK to `auth.users`, `created_at`/`updated_at` with trigger. RLS policies for SELECT/INSERT/UPDATE/DELETE restrict rows to `auth.uid() = user_id`.
### Alternatives
JSON/JSONB blob for breakdown, or storing in `financial_health_reports`.
### Reason
Normalized columns allow direct SQL queries on any breakdown field. Separate table keeps Tax Estimator independently usable per specification. RLS follows existing project pattern (same as `financial_health_report`, `smartfeed_preference`).
### Impact
Migration script at `database/migration_tax_estimator.sql`. Must be applied to Supabase before live API use.

## 13. Authentication & Ownership (Batch 2)
### Decision
User identity is ALWAYS derived from `get_current_user(authorization: str = Header(...))` which calls `supabase.auth.get_user(token)`. The router passes `user.id` to the service. No client-supplied `user_id` is ever trusted.
### Reason
Specification mandates server-derived ownership. Existing project convention uses this exact pattern in `/financial-health/predict`.

## 14. User Isolation (Batch 2)
### Decision
Dual-layer isolation: (1) Service-layer `.eq("user_id", user_id)` filtering on all queries, plus ownership check returning 403 on detail access. (2) Database-layer RLS policies restricting all operations to `auth.uid() = user_id`.
### Reason
Defense in depth. Service uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS, so service-layer filtering is the primary enforcement. RLS provides the secondary safety net for any direct database access.

## 15. History Pagination (Batch 2)
### Decision
V1 history is intentionally **non-paginated**. All assessments for the authenticated user are returned ordered by `created_at DESC`.
### Alternatives
Limit/offset or cursor-based pagination.
### Reason
No existing FinStack endpoints implement pagination (e.g., `/financial-health/history` returns all records). For V1 with expected low assessment volume per user, simplicity is preferred. Pagination can be added in V2 if needed.

## 16. Error Handling (Batch 2)
### Decision
Validation errors return 422 (Pydantic). Unsupported FY returns 400. Auth failures return 401. Cross-user access returns 403. Not-found returns 404. Internal errors return 500 with a generic message. No stack traces, SQL errors, or secrets are ever exposed.
### Reason
Follows FastAPI conventions and project security requirements.

## 17. API Testing Strategy (Batch 2)
### Decision
28 integration tests using `FastAPI TestClient` + `SQLiteSupabaseMock`. The mock replaces only the Supabase network transport with an in-memory SQLite database. All service logic, engine logic, validation, error handling, and response mapping execute for real.
### What is genuinely tested
- Full HTTP request → router → service → engine → database → response pipeline
- Real SQL INSERT/SELECT/filtering by user_id
- Real ownership enforcement (403 on cross-user access)
- Real tax calculations (engine values verified against Batch 1 reference cases)
- Real Pydantic validation (negative inputs, missing fields)
### What is mocked
- Only the Supabase HTTP client (replaced with SQLite in-memory DB)
- Authentication dependency (overridden via FastAPI `dependency_overrides`)

