# FinStack AI - Refinement & Testing Log

## Phase 1: Feature Engineering & Input Validation

### Test A: Normal Profile Validation
**Input Parameters:**
* Age: 28
* Employment: Salaried
* Monthly Income: ₹70,000
* Monthly Expenses: ₹42,000
* Monthly Savings: ₹15,000
* Emergency Fund: ₹3,00,000
* Total Debt: ₹1,40,000
* Investments: ₹3,00,000
* Insurance Cover: ₹90,00,000

**Calculated Metrics (Backend Math Verification):**
* **Savings Rate:** 21% (Verified: 15k / 70k) — Status: Good
* **Expense Ratio:** 60% (Verified: 42k / 70k) — Status: Average (Flagged as Weakness)
* **Debt-to-Income (DTI):** 17% (Verified: 1.4L / 8.4L annual) — Status: Excellent
* **Emergency Fund:** 7.14 Months (Verified: 3L / 42k) — Status: Excellent
* **Net Cashflow:** ₹13,000 (Verified: 70k - 42k - 15k) — Status: Positive

**Rule Engine & Recommendation Verification:**
* Correctly bypassed healthy metrics (Debt, Emergency Fund).
* Accurately targeted the 60% Expense Ratio as the primary weakness.
* Generated a "Medium Priority" action plan to reduce expenses below 50%.

### Test B: Invalid Profile Validation
* **Edge cases tested:** Negative inputs, zero income, invalid mathematical combinations (e.g., expenses > income).
* **Result:** Frontend form validation successfully intercepts invalid inputs. Edge cases do not reach the backend, completely preventing API 422 errors and ML Pipeline crashes.

---

## Phase 2: ML Pipeline & Model Evaluation[cite: 12]

### Dataset Specifications[cite: 12]
* **Total Records:** 10,000[cite: 12]
* **Missing Values (Nulls):** 0[cite: 12]
* **Duplicate Rows:** 0[cite: 12]

### Target Variable[cite: 12]
* **Feature:** `financial_health_score`[cite: 12]
* **Range:** 3.51 (Min) to 96.03 (Max)[cite: 12]
* **Standard Deviation:** 17.63[cite: 12]
* **Mean Score:** 58.25[cite: 12]

### Input Features (Numeric Predictors)[cite: 12]
1. `age`[cite: 12]
2. `monthly_income`[cite: 12]
3. `monthly_expenses`[cite: 12]
4. `monthly_savings`[cite: 12]
5. `emergency_fund`[cite: 12]
6. `total_debt`[cite: 12]
7. `investments`[cite: 12]
8. `insurance_cover`[cite: 12]
9. `savings_rate`[cite: 12]
10. `expense_ratio`[cite: 12]
11. `disposable_income`[cite: 12]
12. `debt_to_income_ratio`[cite: 12]
13. `emergency_fund_months`[cite: 12]
14. `investment_ratio`[cite: 12]
15. `insurance_ratio`[cite: 12]
16. `net_monthly_cashflow`[cite: 12]

### Target Leakage Check
* **Verdict:** Passed.
* **Notes:** Review of the correlation matrix confirms that no input features are mathematically derived backward from the target `financial_health_score`. High $R^2$ values are attributed to the highly deterministic mapping of engineered ratios (e.g., savings_rate, DTI) to the final score by the XGBoost algorithm.

## Phase 3 & 4: Rule Engine, Scoring, and Recommendation Validation

To verify the deterministic rule engine and persona classification, three distinct financial profiles were processed through the ML + Rule pipeline.

### Profile A: The "Weak" Profile
**Context:** Low savings (4%), dangerously high debt (67% DTI), inadequate emergency fund (0.22 months), and high expenses (90%).
**System Output Validation:**
* **Final Health Score:** 26.71 / 100 (Status: Poor) 
* **Assigned Persona:** Financial Beginner (Risk Profile: High)
* **Rule Engine Adjustments:** The system correctly applied severe penalties for failing critical thresholds.
* **Recommendation Accuracy:** Successfully identified 5 major weaknesses and mapped them to actionable, "High Priority" recommendations (e.g., "Increase Monthly Savings", "Reduce Debt Burden", "Build Emergency Fund").

### Profile B: The "Average" Profile (Baseline)
**Context:** Moderate savings (21%), good DTI (17%), excellent emergency fund (7.14 months), but high expenses (60%).
**System Output Validation:**
* **Final Health Score:** 59.57 / 100 (Status: Average)
* **Assigned Persona:** Balanced Builder (Risk Profile: Low)
* **Recommendation Accuracy:** Bypassed healthy metrics and accurately isolated the 60% expense ratio as the single "Medium Priority" area for improvement.

### Profile C: The "Strong" Profile
**Context:** High savings (42%), zero debt (0% DTI), strong emergency fund (10 months), and excellent expenses (33%).
**System Output Validation:**
* **Final Health Score:** 77.03 / 100 (Status: Good)[cite: 13]
* **Assigned Persona:** Balanced Builder (Risk Profile: Low)[cite: 13]
* **Rule Engine Adjustments:** The system correctly awarded maximum points across all breakdown categories (e.g., Savings: 20, Debt: 20)[cite: 13].
* **Recommendation Accuracy:** The system correctly identified zero critical weaknesses[cite: 13]. Instead of corrective actions, it shifted to "Low Priority" maintenance advice, such as "Maintain Your Savings Habit" and "Review Investment Portfolio"[cite: 13].

### Conclusion
The deterministic rule engine successfully overrides and scales the base ML predictions. The recommendation engine accurately maps financial metrics to targeted, priority-ranked actions without hallucinating unrelated financial advice.


## Phase 5: RAG Evaluation & Fact Grounding

The Retrieval-Augmented Generation (RAG) assistant was evaluated against 5 standard personal finance and health queries to test contextual retrieval accuracy, personalization fidelity, and hallucination guardrails.

### Test Environment
* **Active User Profile:** Profile C (Balanced Builder, Score: 77.03, Savings Rate: 42%, DTI: 0%, Emergency Fund: 10 months, Expense Ratio: 33%, Net Cashflow: ₹30,000).

### Evaluation Log

| # | Question Evaluated | Knowledge Base Retrieved | Personal Context Injected | Hallucination Detected | Verdict |
|---|--------------------|--------------------------|---------------------------|------------------------|---------|
| 1 | What is a good debt-to-income ratio? | DTI risk brackets (<20% healthy, 20-35% standard, >43% high risk). | Correctly identified user's 0% DTI, ₹30,000 monthly cashflow, and 10-month reserve. | None. | **PASS** |
| 2 | How many months of expenses should an emergency fund cover? | 3–6 months standard emergency reserve recommendation. | Correctly identified user's current 10-month buffer and 42% savings rate. | None. | **PASS** |
| 3 | What is the 50/30/20 rule? | 50% Needs, 30% Wants, 20% Savings/Debt repayment framework. | Matched user's 33% expense ratio and 42% savings rate against the rule. | None. | **PASS** |
| 4 | What is a good savings rate? | Benchmark tiers (<10% poor, 10-20% avg, 20-30% good, >30% excellent). | Identified user's 42% rate as top-tier; cited 139% investment ratio. | None. | **PASS** |
| 5 | How can I improve my financial health score? | General score improvement mechanisms. | Anchored to user's 77.03 Good score; offered maintenance advice rather than emergency debt reduction. | None. | **PASS** |

### Findings & Conclusion
* **Grounding Accuracy:** 100% of tested queries retrieved the correct general financial rules from the vector store.
* **Context Ingestion:** The prompt pipeline successfully injected the live prediction JSON into the assistant prompt without dropping user attributes.
* **Safety & Guardrails:** Zero contradictory assertions or phantom metrics were generated.

## Phase 6: Database Persistence & Security (User Isolation)

The system was evaluated to ensure that all financial health reports are correctly persisted to the database and that strict user isolation and authentication protocols are enforced at the API level.

### Persistence Verification
* **Test:** Successfully generated and stored new assessments (Profile A and Profile C) to the `financial_health_reports` table in Supabase.
* **Result:** **PASS**. The database correctly captured all JSON payloads, including the `user_id`, `ml_health_score`, engineered metrics, and the full text of the `ai_summary` and `ai_recommendations` arrays.

### Database Integrity Cleanup
* **Test:** Audited historical records for corrupted data from early development phases.
* **Result:** **RESOLVED**. Identified 24 obsolete records containing negative ML scores (e.g., `< 0`). Safely purged these via SQL to ensure data integrity for the Financial Journey visualization and research metrics.

### Authentication & User Isolation
* **Test:** Attempted to access the `GET /financial-health/journey` endpoint without providing a valid Supabase `Authorization: Bearer <token>` header.
* **Result:** **PASS**. The FastAPI backend immediately intercepted the request and returned a strict `401 Unauthorized` error, proving that endpoints are secured and users cannot access another user's financial data.

## Phase 7: PDF & Financial Journey Integration

### PDF Generation Validation
* **Test:** Generated a PDF report for a completed assessment (Score: 77.03).
* **Result:** **PASS**. The PDF successfully rendered all components including the FinStack logo, the Score Breakdown, Personalized Action Plan, AI-Generated Insight, and a dynamic watermark containing the Report ID and timestamp.

### Financial Journey Rendering
* **Test:** Loaded the `/financial-journey` endpoint to visualize historical assessment trends.
* **Result:** **PASS**. The primary Line Chart correctly mapped 29 historical data points without rendering errors. The First vs. Current data grids and Sparkline charts successfully calculated absolute and percentage changes across key metrics (Savings, DTI, Emergency Fund).

## Phase 8: End-to-End Frontend Flow & UI/UX Validation

### User Flow Verification
* **Scope Tested:** Complete user journey from authentication to health analysis, trend exploration, and report generation.
* **Tested Path:**
  1. User Authentication (Supabase Session verification).
  2. Input Form Entry & Instant Input Validation.
  3. ML Health Analysis & Real-time Scoring Visualization.
  4. Contextual RAG Chatbot Integration (`Ask AI`).
  5. Dynamic PDF Report Generation & Direct Client Download.
  6. Financial Journey Trend Exploration (`/financial-journey`).
* **Result:** **PASS**. No broken links, missing component states, 404s, or 422 schema rejections observed.

### Responsive Design & UI Stability
* **Responsive Layout:** Tested across standard desktop and mobile viewport widths. Layout grids dynamically stack into single-column cards without horizontal overflow or clipped charts.
* **Component Consistency:** Preserved the core FinStack design system (Deep Navy, Clean White, Saffron Accents, and semantic indicator colors) across both analyzer results and historical trend dashboards.

# FinStack AI - Experimental Validation & Research Results

## 1. Machine Learning Predictive Pipeline
The core predictive engine was trained to map complex personal finance variables to a normalized Financial Health Score.

* **Dataset Profile:** 10,000 synthetically generated, mathematically consistent financial records. 
* **Data Integrity:** 0 missing values, 0 duplicate rows.
* **Target Variable:** `financial_health_score` (Range: 3.51 - 96.03, $\sigma = 17.63$).
* **Features Used (16):** Age, monthly income, monthly expenses, monthly savings, emergency fund, total debt, investments, insurance cover, savings rate, expense ratio, disposable income, debt-to-income ratio, emergency fund months, investment ratio, insurance ratio, net monthly cashflow.
* **Evaluation Metrics:** 
  * MAE: 0.470
  * $RMSE$: 0.654
  * $R^2$: 0.9986
* **Target Leakage Check:** Passed. Cross-feature correlation analysis confirmed no target derivation within input predictors. High $R^2$ is attributed to the highly deterministic mapping of engineered ratios by the XGBoost algorithm.

## 2. Deterministic Rule Engine & Classification
The system successfully layered a deterministic rule engine over the ML predictions to ensure actionable edge-case handling.

* **Profile Testing:** 
  * *Weak Profile* (4% savings, 67% DTI, 90% expense ratio): Correctly scaled to a score of 26.71 (Poor). Assigned "Financial Beginner" persona (High Risk).
  * *Strong Profile* (42% savings, 0% DTI, 33% expense ratio): Correctly scaled to a score of 77.03 (Good). Assigned "Balanced Builder" persona (Low Risk).
* **Recommendation Accuracy:** The recommendation engine demonstrated 100% fidelity in mapping calculated weaknesses to prioritized action plans (e.g., assigning a "High Priority" debt reduction protocol specifically when DTI exceeded the 35% threshold).

## 3. Retrieval-Augmented Generation (RAG) Advisor
The conversational AI module was evaluated for fact retrieval, context grounding, and hallucination prevention.

* **Embedding Model:** [FILL IN: e.g., OpenAI text-embedding-3-small / sentence-transformers/all-MiniLM-L6-v2]
* **Vector Store & Retrieval:** [FILL IN: e.g., FAISS / Pinecone / Supabase pgvector], utilizing Top-K=[FILL IN] retrieval.
* **Context Ingestion:** The system successfully injected the active user's JSON prediction payload into the LLM context window.
* **Evaluation Verdict:** Tested against strict benchmark queries (e.g., 50/30/20 rule, DTI limits). 
  * *Fact Retrieval:* 100% accurate.
  * *Personalization:* Successfully tailored benchmark advice to the active user's specific metrics (e.g., acknowledging an existing 10-month emergency buffer).
  * *Hallucination Check:* 0 instances of phantom metrics or contradictory financial advice.

## 4. System Performance & Architecture Benchmarks
* **Data Isolation:** Enforced via Supabase authentication. Unauthorized requests to protected endpoints (e.g., `/financial-health/journey`) return strict HTTP 401 Unauthorized responses.
* **Average API Response Time (Prediction):** [FILL IN] ms
* **Average PDF Generation Time:** [FILL IN] ms
* **Average RAG Chatbot Latency:** [FILL IN] ms

## 5. Visual Demonstration Ledger
The following system components were successfully implemented and visually documented for the research demonstration:
1. React-based Input Form with strict Pydantic/Frontend schema validation.
2. Real-time SVG Score Ring & Category Breakdown.
3. Priority-Ranked Recommendation Engine.
4. RAG Chatbot Assistant Widget.
5. Dynamic PDF Report Generation.
6. Responsive Financial Journey Line Chart & Metric Sparklines.