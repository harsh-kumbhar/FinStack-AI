# FinStack-AI — Harshad (Meowtaku) Work Report

## Verification window

**Period checked:** 5 September 2026 through 9 September 2026 (last 4 days, based on verified GitHub history)

**Repository:** `harsh-kumbhar/FinStack-AI`

**Branch:** `feat/tax-estimator`

**GitHub user:** `Meowtaku`

**Git author/committer:** `Harshad`

## Summary

GitHub history shows one Harshad / Meowtaku development commit in this four-day window on `feat/tax-estimator`:

- Commit: `f562e0f37167aa376cdb519f81dcf80ce0a27908`
- Message: `feat(tax-estimator): redesign estimator experience`
- Date: 5 September 2026, 15:34:30 UTC / 21:04:30 IST
- Author: Harshad / `Meowtaku`
- Committer: Harshad / `Meowtaku`
- Size: 9,624 additions and 24 deletions

No other Harshad / Meowtaku development commit appears on `feat/tax-estimator` during the checked four-day window.

## Work done

### Backend

1. **Document Vault integration boundary**
   - Added `backend/modules/tax_estimator/document_boundary.py`.
   - Added provisional document-extracted field staging.
   - Added explicit user review decisions: ACCEPT, MODIFY, REJECT.
   - Added review status and extraction confidence metadata.
   - Added conversion of confirmed document values into normalized tax input.
   - Added audit-trail support.
   - Added a guardrail preventing unconfirmed document-extracted values from being used directly for tax calculation.

2. **Normalized Tax Input layer**
   - Added `backend/modules/tax_estimator/normalized_input.py`.
   - Added source/provenance tracking for `FINSTACK_PROFILE`, `USER_ENTERED`, `DOCUMENT_EXTRACTED`, and `DEFAULT`.
   - Added precedence handling between input sources.
   - Added age calculation from date of birth.
   - Added annualization of monthly income for estimated annual salary.
   - Prevented semantic misuse of cumulative investments as 80C deductions.
   - Prevented semantic misuse of insurance sum assured as 80D premiums.
   - Added non-negative monetary validation and conversion to the authoritative domain model.
   - Added profile-derived prefill response information and disclaimer.

3. **Tax calculation enhancement**
   - Updated `domain.py`, `engine.py`, and `rules/fy_2024_25.py`.
   - Added `home_loan_interest` input support.
   - Added Section 24(b) home-loan-interest deduction handling for the Old Regime, with a ₹2,00,000 default cap when no configured limit is present.

4. **API/schema/service redesign**
   - Updated `router.py`, `schema.py`, and `service.py`.
   - Expanded the backend flow to support normalized inputs, provenance, profile-derived defaults, and document-review integration.
   - Kept tax calculation authoritative in the backend.

5. **Backend tests**
   - Expanded `backend/tests/test_tax_estimator_api.py`.
   - Added `backend/tests/test_tax_estimator_normalized_input.py`.
   - Added coverage for the redesigned API and normalization behavior.

### Frontend

6. **Tax Estimator redesign**
   - Added `frontend/src/pages/TaxEstimator.jsx`.
   - Added the redesigned Tax Estimator user experience and workflow.

7. **Tax Estimator service layer**
   - Added `frontend/src/services/taxEstimatorService.js` for backend communication.

8. **Tax Estimator styling**
   - Added `frontend/src/styles/taxEstimator.css`.

9. **Application integration**
   - Updated `frontend/src/App.jsx`.
   - Updated `frontend/src/pages/Dashboard.jsx`.
   - Updated `frontend/src/pages/FinancialHealthAnalyzer.jsx`.
   - Updated `frontend/src/pages/SmartFeed.jsx`.
   - Integrated the redesigned estimator into the existing application structure.

## Files changed in `f562e0f`

- `backend/modules/tax_estimator/document_boundary.py` — added
- `backend/modules/tax_estimator/domain.py` — modified
- `backend/modules/tax_estimator/engine.py` — modified
- `backend/modules/tax_estimator/normalized_input.py` — added
- `backend/modules/tax_estimator/router.py` — modified
- `backend/modules/tax_estimator/rules/fy_2024_25.py` — modified
- `backend/modules/tax_estimator/schema.py` — modified
- `backend/modules/tax_estimator/service.py` — modified
- `backend/tests/test_tax_estimator_api.py` — modified
- `backend/tests/test_tax_estimator_normalized_input.py` — added
- `frontend/src/App.jsx` — modified
- `frontend/src/pages/Dashboard.jsx` — modified
- `frontend/src/pages/FinancialHealthAnalyzer.jsx` — modified
- `frontend/src/pages/SmartFeed.jsx` — modified
- `frontend/src/pages/TaxEstimator.jsx` — added
- `frontend/src/services/taxEstimatorService.js` — added
- `frontend/src/styles/taxEstimator.css` — added

**Total: 17 files changed.**

## Pull request / merge

The `feat/tax-estimator` work was submitted through Pull Request #4 and subsequently merged into `main`.

- PR: #4 — `Feat/tax estimator`
- Feature branch head: `f562e0f`
- Merge commit on `main`: `015f24211063c8399e7de64cea12508134091a74`
- Merge date: 7 September 2026

The merge commit is treated as repository integration rather than a separate Harshad coding commit in this report.

## Verification note

This report contains only work that is verifiable from GitHub history. It does not claim any local, uncommitted work performed in Antigravity or another local environment.

The report itself is a new documentation file and is not part of the historical four-day work summarized above.
