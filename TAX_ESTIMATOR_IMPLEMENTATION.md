# Tax Estimator Implementation Specification

*Note: This file is the authoritative project implementation specification for the Tax Estimator module. It serves as the single source of truth for the module's architecture and requirements.*

## 1. Module Overview
The Tax Estimator is a financial planning tool within the FinStack AI platform that helps users estimate their tax liability for a given financial year. It supports comparing tax liabilities under different tax regimes to help users make informed financial decisions.

## 2. Development Philosophy
The Tax Estimator is built as a deterministic, rule-based financial planning and educational tool. Accuracy, transparency, and independent testability are paramount.

## 3. Primary Objective
Provide a reliable, back-end authoritative tax estimation tool that is isolated per user, strictly authenticated, and mathematically accurate against verified government tax sources.

## 4. Important Architectural Principle
The core tax calculations must be isolated in a standalone deterministic engine in the backend, completely decoupled from the API routers, database layer, and frontend.

## 5. Tax Rules Research
The developer must research and independently verify authoritative tax sources before implementing tax rules. AI-generated tax information must never be treated as authoritative. Do not insert unverified tax rates, slabs, deduction limits, or cess values. All implemented constants must include references to their authoritative source.

## 6. Financial Year
The tax rules must be versioned by financial year. The estimator must support specific financial years, ensuring that any changes in tax law are isolated and accurately represented based on the selected year.

## 7. Tax Rule Versioning
Tax rules must be centralized and versioned. Do not scatter slabs, rates, thresholds, deductions, or other authoritative rules throughout Python or React codebases. They must be maintained in a structured configuration or database schema.

## 8. User Inputs
The tool must capture necessary user inputs such as gross income, standard deductions, Section 80C/80D investments, other exemptions, and the applicable financial year.

## 9. Tax Regime Comparison
The engine must support calculating tax under both the Old Regime and the New Regime (where applicable), enabling a side-by-side comparison for the user.

## 10. Calculation Breakdown
The result must expose enough information to explain how the estimate was produced, including taxable income, applicable tax components (slabs, cess, surcharge), and a detailed calculation breakdown.

## 11. Tax Calculation Engine
The core Tax Estimator must NOT use ML to determine the tax amount. The calculation must be deterministic and rule-based.

## 12. Avoid Hard-Coding Rules in Frontend
The frontend must NOT implement authoritative tax calculations. All calculations, business logic, and tax rule lookups must remain in the backend.

## 13. Backend Architecture
The backend must own the tax rules, calculations, authoritative validation, and final estimated result. The architecture should separate the engine, service layer, schemas, and API routers.

## 14. API
The backend must expose clear REST endpoints to submit assessment data and retrieve historical assessments. Endpoints must be strictly typed and validated.

## 15. Authentication
Use the existing FinStack authentication mechanism. Never trust a frontend-supplied user ID for ownership; always resolve the user from the authenticated token.

## 16. Database
Create dedicated Tax Estimator storage schemas and RLS policies (where applicable). Tax assessments must belong to the authenticated user. Do not expose another user's assessments.

## 17. Assessment History
The system must support retrieving past tax estimates for the authenticated user to track financial planning history.

## 18. Frontend
The frontend must feature a dedicated page for the Tax Estimator that allows inputting financial details, submitting them to the backend, and rendering the results and regime comparisons intuitively.

## 19. Frontend Service Layer
Frontend API calls must be abstracted into a dedicated service layer file (e.g., `taxEstimatorService.js`) to handle communication with the backend.

## 20. Loading and Error States
The UI must handle and gracefully display loading states, validation errors from inputs, and backend errors.

## 21. Dashboard Integration
Include an entry point to the Tax Estimator from the main FinStack Dashboard.

## 22. Financial Health Integration
Where appropriate, integrate the Tax Estimator seamlessly with the existing FinStack architecture, but do not move Tax Estimator data into unrelated Financial Health tables.

## 23. Validation
Both the frontend and backend must rigorously validate user inputs to prevent negative incomes or invalid deduction values. The backend is the ultimate authority on validation.

## 24. Edge Cases
The implementation must explicitly handle edge cases, including zero-income behavior, boundary behavior at exact tax bracket limits, and high-income surcharge applicability.

## 25. Accuracy Verification
Test calculation accuracy against trusted reference calculations (e.g., official income tax department calculators).

## 26. Rule Update Strategy
Establish a clear pattern for adding rules for future financial years without breaking past calculations or requiring major refactoring.

## 27. Important Disclaimer
The UI must clearly communicate that the result is an estimate and is not an official tax assessment or professional tax advice.

## 28. Security & Privacy
Do not expose sensitive financial information. Avoid unnecessary logging of sensitive financial information. Do not commit API keys, access tokens, secrets, or `.env` files.

## 29. AI Usage
Do not introduce ML into tax calculation. AI may be used strictly for analyzing or summarizing the breakdown if required, but the numerical estimation must remain deterministic.

## 30. Git Workflow
Work ONLY on `feat/tax-estimator`. Do not reset, force-push, delete branches, or discard existing work. Commit changes atomically and maintain clear history.

## 31. Testing Requirements
The specification requires comprehensive testing of:
* Individual calculations
* Tax slabs and deductions
* Cess and surcharge
* Regime comparison
* API behavior
* Authentication and user-isolation
* Database interactions
* Frontend behavior
* Edge cases and boundary values
* End-to-end flow
* Accuracy against trusted reference calculations

## 32. Developer Technical Decision Log
Maintain a log of significant technical decisions, especially regarding how tax rules are modeled and versioned.

## 33. What the Developer Should NOT Do
- Do not rewrite completed modules or unrelated architecture.
- Do not put tax calculations in React.
- Do not scatter tax constants across the codebase.
- Do not hard-code user IDs.
- Do not silently change existing tax values without verification.
- Do not trust frontend ownership identifiers.

## 34. Future Scope
Plan the schema and architecture such that future enhancements (e.g., capital gains, multi-country tax rules) could be integrated without requiring a complete rewrite.

## 35. Final Development Principle
Audit, verify, and report before implementing. Test aggressively and isolate business logic meticulously.

## 36. Developer Checklist
- [ ] Research and verify tax rules for target financial year.
- [ ] Centralize and version tax rules in backend.
- [ ] Implement deterministic calculation engine.
- [ ] Write unit tests for calculation engine.
- [ ] Implement database schema and migrations.
- [ ] Build backend service and API layer with auth.
- [ ] Write API and DB tests.
- [ ] Develop frontend UI with validation.
- [ ] Integrate frontend service layer.
- [ ] Ensure Disclaimer and transparent breakdowns are present.
- [ ] Perform E2E accuracy and security checks.
