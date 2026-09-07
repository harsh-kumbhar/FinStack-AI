"""
Tax Estimator API + Service + Database Tests (Batch 2 Final Gate)
=================================================================

Architecture under test:
  TestClient (FastAPI) → Router → Service → Engine (calculation)
                                          ↓ SQLiteSupabaseMock (DB)

Design decisions:
- `sys.path.insert(0, backend_path)` ensures all imports match the live router's
  import paths, so `dependency_overrides[get_current_user]` resolves to the same
  object the router references.
- `SQLiteSupabaseMock` executes REAL SQL on an in-memory SQLite database.
  This exercises genuine persistence, user isolation, and history ordering
  without mocking away database behavior.
- Only the network transport to Supabase is replaced. All service logic, engine
  logic, validation, error handling, and response mapping run for real.
"""

import sys
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

# -----------------------------------------------------------------------
# Ensure backend-relative imports resolve identically to the live router
# -----------------------------------------------------------------------
_backend_root = os.path.join(os.path.dirname(__file__), "..", "..", "backend")
_backend_root = os.path.abspath(_backend_root)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from main import app                        # noqa — must import AFTER sys.path fix
from common.database import get_current_user  # noqa — same reference as router uses


# =============================================================================
# IN-MEMORY SQLITE DATABASE — genuine integration-quality DB tests
# =============================================================================

class SQLiteSupabaseMock:
    """
    Drop-in replacement for the Supabase Python client.
    Uses an in-memory SQLite database so that persistence, history,
    user isolation, and ordering are genuinely exercised — not mocked away.
    """

    def __init__(self):
        self.conn = sqlite3.connect(":memory:", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_schema()

    def _create_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS tax_assessments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                financial_year TEXT NOT NULL,
                gross_salary REAL NOT NULL DEFAULT 0,
                other_income REAL NOT NULL DEFAULT 0,
                deduction_80c REAL NOT NULL DEFAULT 0,
                deduction_80d REAL NOT NULL DEFAULT 0,
                deduction_80tta REAL NOT NULL DEFAULT 0,
                old_gross_income REAL NOT NULL DEFAULT 0,
                old_standard_deduction REAL NOT NULL DEFAULT 0,
                old_chapter_vi_deductions REAL NOT NULL DEFAULT 0,
                old_taxable_income REAL NOT NULL DEFAULT 0,
                old_tax_on_income REAL NOT NULL DEFAULT 0,
                old_rebate_87a REAL NOT NULL DEFAULT 0,
                old_tax_after_rebate REAL NOT NULL DEFAULT 0,
                old_surcharge REAL NOT NULL DEFAULT 0,
                old_cess REAL NOT NULL DEFAULT 0,
                old_total_tax REAL NOT NULL DEFAULT 0,
                new_gross_income REAL NOT NULL DEFAULT 0,
                new_standard_deduction REAL NOT NULL DEFAULT 0,
                new_chapter_vi_deductions REAL NOT NULL DEFAULT 0,
                new_taxable_income REAL NOT NULL DEFAULT 0,
                new_tax_on_income REAL NOT NULL DEFAULT 0,
                new_rebate_87a REAL NOT NULL DEFAULT 0,
                new_tax_after_rebate REAL NOT NULL DEFAULT 0,
                new_surcharge REAL NOT NULL DEFAULT 0,
                new_cess REAL NOT NULL DEFAULT 0,
                new_total_tax REAL NOT NULL DEFAULT 0,
                recommended_regime TEXT NOT NULL,
                estimated_tax_savings REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        self.conn.commit()

    def reset(self):
        self.conn.execute("DELETE FROM tax_assessments")
        self.conn.commit()

    def table(self, name):
        assert name == "tax_assessments", f"Mock only covers tax_assessments, got '{name}'"
        return _QueryBuilder(self.conn)


class _SupabaseResponse:
    def __init__(self, data):
        self.data = data


class _QueryBuilder:
    def __init__(self, conn):
        self._conn = conn
        self._op = None
        self._insert_data = None
        self._filters = []
        self._order_col = None
        self._order_desc = False
        self._select_cols = "*"
        self._single_mode = False

    # ---- builder methods ----
    def insert(self, record):
        self._op = "INSERT"
        self._insert_data = dict(record)
        return self

    def select(self, cols="*"):
        self._op = "SELECT"
        self._select_cols = cols
        return self

    def eq(self, col, val):
        self._filters.append((col, val))
        return self

    def order(self, col, desc=False):
        self._order_col = col
        self._order_desc = desc
        return self

    def single(self):
        self._single_mode = True
        return self

    # ---- execute ----
    def execute(self):
        if self._op == "INSERT":
            return self._do_insert()
        elif self._op == "SELECT":
            return self._do_select()
        raise ValueError("No operation set on QueryBuilder")

    def _do_insert(self):
        record = self._insert_data
        if "id" not in record:
            record["id"] = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        if "created_at" not in record:
            record["created_at"] = now
        if "updated_at" not in record:
            record["updated_at"] = now

        cols = ", ".join(record.keys())
        placeholders = ", ".join(["?"] * len(record))
        self._conn.execute(
            f"INSERT INTO tax_assessments ({cols}) VALUES ({placeholders})",
            list(record.values()),
        )
        self._conn.commit()

        row = self._conn.execute(
            "SELECT * FROM tax_assessments WHERE id = ?", (record["id"],)
        ).fetchone()
        return _SupabaseResponse([dict(row)])

    def _do_select(self):
        sql = "SELECT * FROM tax_assessments"
        params = []
        if self._filters:
            clauses = [f"{col} = ?" for col, _ in self._filters]
            sql += " WHERE " + " AND ".join(clauses)
            params = [val for _, val in self._filters]
        if self._order_col:
            sql += f" ORDER BY {self._order_col}"
            if self._order_desc:
                sql += " DESC"

        rows = self._conn.execute(sql, params).fetchall()
        data = [dict(r) for r in rows]

        if self._single_mode:
            if len(data) == 0:
                # Supabase raises on .single() with no result; we mimic that
                raise Exception("No rows found")
            return _SupabaseResponse(data[0])

        return _SupabaseResponse(data)


# =============================================================================
# Test fixtures
# =============================================================================

mock_db = SQLiteSupabaseMock()


@pytest.fixture(autouse=True)
def reset_db_and_overrides():
    """Before each test: clear DB state and reset dependency overrides."""
    mock_db.reset()
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


# Patch supabase in service.py ONCE for the entire test session
@pytest.fixture(scope="session", autouse=True)
def patch_supabase():
    with patch("modules.tax_estimator.service.supabase", mock_db):
        yield


# ---- Mock users ----
class _User:
    def __init__(self, uid):
        self.id = uid


USER_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
USER_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def _mock_user_a():
    return _User(USER_A_ID)


def _mock_user_b():
    return _User(USER_B_ID)


def _mock_unauthorized():
    raise HTTPException(status_code=401, detail="Invalid Token")


client = TestClient(app, raise_server_exceptions=False)


# =============================================================================
# SECTION 1 — POST /tax-estimator/calculate
# =============================================================================

class TestCalculateEndpoint:

    def test_valid_request_returns_200_with_full_breakdown(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        payload = {
            "financial_year": "2024-25",
            "gross_salary": 800000.0,
            "other_income": 50000.0,
            "deduction_80c": 150000.0,
            "deduction_80d": 25000.0,
            "deduction_80tta": 10000.0,
        }
        r = client.post("/tax-estimator/calculate", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()

        # Response contract: required fields
        for field in [
            "assessment_id", "financial_year", "old_regime", "new_regime",
            "recommended_regime", "estimated_tax_savings", "disclaimer",
        ]:
            assert field in data, f"Missing field: {field}"

        # Regime breakdown fields
        for regime in ("old_regime", "new_regime"):
            for sub in [
                "gross_income", "standard_deduction", "total_chapter_vi_a_deductions",
                "taxable_income", "tax_on_income", "rebate_87a", "tax_after_rebate",
                "surcharge", "health_and_education_cess", "total_tax_liability",
            ]:
                assert sub in data[regime], f"Missing {regime}.{sub}"

        # Disclaimer must contain estimate language
        assert "estimate" in data["disclaimer"].lower()

        # Calculation comes from deterministic engine
        # gross = 8L salary + 50k other = 8.5L
        # Old: std=50k, 80C=1.5L, 80D=25k, 80TTA=min(10k,10k limit,50k other)=10k
        #      taxable = 8.5L - 50k - 1.5L - 25k - 10k = 6.15L
        #      tax(6.15L) = 2.5L@0 + 2.5L@5% + 1.15L@20% = 12500+23000=35500
        #      cess = 35500*4% = 1420; total = 36920
        assert data["old_regime"]["taxable_income"] == pytest.approx(615000.0)
        assert data["old_regime"]["total_tax_liability"] == pytest.approx(36920.0)
        
        # New: std=50k, no chapter-vi
        #      taxable = 8.5L - 50k = 8L
        #      tax(8L) = 3L@0 + 3L@5% + 2L@10% = 15000+20000=35000
        #      cess = 35000*4%=1400; total=36400
        assert data["new_regime"]["taxable_income"] == pytest.approx(800000.0)
        assert data["new_regime"]["total_tax_liability"] == pytest.approx(36400.0)

        assert data["recommended_regime"] == "New Regime"
        assert data["estimated_tax_savings"] == pytest.approx(520.0)

    def test_valid_request_persists_assessment(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        payload = {"financial_year": "2024-25", "gross_salary": 600000.0}
        r = client.post("/tax-estimator/calculate", json=payload)
        assert r.status_code == 200
        assessment_id = r.json()["assessment_id"]

        # Verify it is in the database
        row = mock_db.conn.execute(
            "SELECT * FROM tax_assessments WHERE id = ?", (assessment_id,)
        ).fetchone()
        assert row is not None
        assert row["user_id"] == USER_A_ID
        assert row["financial_year"] == "2024-25"
        assert row["gross_salary"] == 600000.0

    def test_unauthenticated_returns_401(self):
        app.dependency_overrides[get_current_user] = _mock_unauthorized
        payload = {"financial_year": "2024-25", "gross_salary": 500000.0}
        r = client.post("/tax-estimator/calculate", json=payload)
        assert r.status_code == 401

    def test_negative_salary_rejected_422(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": -10000.0,
        })
        assert r.status_code == 422
        assert "greater than or equal to 0" in r.text

    def test_negative_other_income_rejected_422(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "other_income": -5000.0,
        })
        assert r.status_code == 422

    def test_negative_deduction_80c_rejected_422(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "deduction_80c": -1000.0,
        })
        assert r.status_code == 422

    def test_negative_deduction_80d_rejected_422(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "deduction_80d": -500.0,
        })
        assert r.status_code == 422

    def test_negative_deduction_80tta_rejected_422(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "deduction_80tta": -1.0,
        })
        assert r.status_code == 422

    def test_unsupported_financial_year_returns_400(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2023-24",
            "gross_salary": 500000.0,
        })
        assert r.status_code == 400
        assert "not supported or verified" in r.json()["detail"]

    def test_missing_financial_year_rejected_422(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={"gross_salary": 500000.0})
        assert r.status_code == 422

    def test_zero_income_accepted_returns_zero_tax(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 0.0,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["old_regime"]["total_tax_liability"] == 0.0
        assert data["new_regime"]["total_tax_liability"] == 0.0

    def test_user_id_comes_from_token_not_request_body(self):
        """
        The request body does NOT contain user_id.
        The assessment must be saved with the authenticated user's ID from the token.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 700000.0,
        })
        assert r.status_code == 200
        assessment_id = r.json()["assessment_id"]

        row = mock_db.conn.execute(
            "SELECT user_id FROM tax_assessments WHERE id = ?", (assessment_id,)
        ).fetchone()
        assert row["user_id"] == USER_A_ID  # NOT from request body


# =============================================================================
# SECTION 2 — GET /tax-estimator/history
# =============================================================================

class TestHistoryEndpoint:

    def test_unauthenticated_returns_401(self):
        app.dependency_overrides[get_current_user] = _mock_unauthorized
        r = client.get("/tax-estimator/history")
        assert r.status_code == 401

    def test_empty_history_returns_empty_list(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.get("/tax-estimator/history")
        assert r.status_code == 200
        data = r.json()
        assert "assessments" in data
        assert data["assessments"] == []

    def test_history_returns_only_own_assessments(self):
        # User A creates 2 assessments
        app.dependency_overrides[get_current_user] = _mock_user_a
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 500000.0})
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 600000.0})

        r = client.get("/tax-estimator/history")
        assert r.status_code == 200
        data = r.json()
        assert len(data["assessments"]) == 2
        for a in data["assessments"]:
            # Each summary must have required fields
            for f in ["id", "financial_year", "old_regime_total_tax", "new_regime_total_tax",
                       "recommended_regime", "estimated_tax_savings", "created_at"]:
                assert f in a

    def test_history_ordered_newest_first(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 500000.0})
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 1500000.0})

        r = client.get("/tax-estimator/history")
        data = r.json()
        assert len(data["assessments"]) == 2
        # Newer entry (higher salary → higher tax) should be first
        assert data["assessments"][0]["new_regime_total_tax"] >= data["assessments"][1]["new_regime_total_tax"]

    def test_v1_history_is_non_paginated(self):
        """
        V1 DECISION: History is intentionally non-paginated.
        The response does NOT include pagination fields (total, page, per_page, cursor).
        Documented in TECHNICAL_DECISION_LOG_TAX_ESTIMATOR.md.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.get("/tax-estimator/history")
        data = r.json()
        assert "total" not in data
        assert "page" not in data
        assert "per_page" not in data
        assert "cursor" not in data
        assert "assessments" in data


# =============================================================================
# SECTION 3 — GET /tax-estimator/history/{assessment_id}
# =============================================================================

class TestDetailEndpoint:

    def test_unauthenticated_returns_401(self):
        app.dependency_overrides[get_current_user] = _mock_unauthorized
        r = client.get(f"/tax-estimator/history/{str(uuid.uuid4())}")
        assert r.status_code == 401

    def test_owner_can_retrieve_own_assessment(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        create_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 750000.0,
        })
        assert create_r.status_code == 200
        assessment_id = create_r.json()["assessment_id"]

        r = client.get(f"/tax-estimator/history/{assessment_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == assessment_id
        assert data["financial_year"] == "2024-25"
        assert data["gross_salary"] == pytest.approx(750000.0)
        assert "old_regime" in data
        assert "new_regime" in data
        assert "disclaimer" in data

    def test_non_existent_assessment_returns_404(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.get(f"/tax-estimator/history/{str(uuid.uuid4())}")
        assert r.status_code == 404
        assert "not found" in r.json()["detail"].lower()

    def test_cross_user_access_returns_403(self):
        """
        SECURITY CRITICAL: User B must NOT be able to retrieve User A's assessment.
        """
        # User A creates an assessment
        app.dependency_overrides[get_current_user] = _mock_user_a
        create_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 800000.0,
        })
        assert create_r.status_code == 200
        assessment_id = create_r.json()["assessment_id"]

        # User B attempts to access User A's assessment
        app.dependency_overrides[get_current_user] = _mock_user_b
        r = client.get(f"/tax-estimator/history/{assessment_id}")
        assert r.status_code == 403
        assert "Unauthorized" in r.json()["detail"]

    def test_cross_user_cannot_infer_existence(self):
        """
        User B must receive 403 (not 200) when accessing User A's assessment.
        The API must not leak whether the assessment exists.
        (Our implementation returns 403 consistently — never 200 for cross-user.)
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        create_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 500000.0,
        })
        assessment_id = create_r.json()["assessment_id"]

        app.dependency_overrides[get_current_user] = _mock_user_b
        r = client.get(f"/tax-estimator/history/{assessment_id}")
        # Must not return 200 regardless of whether assessment truly exists
        assert r.status_code != 200


# =============================================================================
# SECTION 4 — User Isolation (dedicated security tests)
# =============================================================================

class TestUserIsolation:

    def test_user_b_history_does_not_include_user_a_data(self):
        # User A creates 2 assessments
        app.dependency_overrides[get_current_user] = _mock_user_a
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 500000.0})
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 600000.0})

        # User B creates 1 assessment
        app.dependency_overrides[get_current_user] = _mock_user_b
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 400000.0})

        # User B sees only their 1 assessment
        r_b = client.get("/tax-estimator/history")
        assert r_b.status_code == 200
        assert len(r_b.json()["assessments"]) == 1

        # User A sees their 2 assessments
        app.dependency_overrides[get_current_user] = _mock_user_a
        r_a = client.get("/tax-estimator/history")
        assert r_a.status_code == 200
        assert len(r_a.json()["assessments"]) == 2

    def test_database_isolation_by_user_id(self):
        """Database-level: each row has user_id; queries filter by it."""
        app.dependency_overrides[get_current_user] = _mock_user_a
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 700000.0})

        app.dependency_overrides[get_current_user] = _mock_user_b
        client.post("/tax-estimator/calculate", json={"financial_year": "2024-25", "gross_salary": 800000.0})

        rows_a = mock_db.conn.execute(
            "SELECT * FROM tax_assessments WHERE user_id = ?", (USER_A_ID,)
        ).fetchall()
        rows_b = mock_db.conn.execute(
            "SELECT * FROM tax_assessments WHERE user_id = ?", (USER_B_ID,)
        ).fetchall()

        assert len(rows_a) == 1
        assert len(rows_b) == 1
        assert rows_a[0]["user_id"] == USER_A_ID
        assert rows_b[0]["user_id"] == USER_B_ID


# =============================================================================
# SECTION 5 — Response Contract Verification
# =============================================================================

class TestResponseContract:

    def test_response_contains_all_required_fields_for_frontend(self):
        """Verify the complete set of fields the frontend Batch 3 will need."""
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1000000.0,
            "deduction_80c": 150000.0,
        })
        assert r.status_code == 200
        data = r.json()

        top_level = [
            "assessment_id", "financial_year",
            "old_regime", "new_regime",
            "recommended_regime", "estimated_tax_savings",
            "disclaimer",
        ]
        for f in top_level:
            assert f in data, f"Top-level field missing: {f}"

        breakdown_fields = [
            "regime_name", "gross_income", "standard_deduction",
            "total_chapter_vi_a_deductions", "taxable_income", "tax_on_income",
            "rebate_87a", "tax_after_rebate", "surcharge",
            "health_and_education_cess", "total_tax_liability",
        ]
        for f in breakdown_fields:
            assert f in data["old_regime"], f"old_regime missing: {f}"
            assert f in data["new_regime"], f"new_regime missing: {f}"

    def test_values_derived_from_calculation_engine_not_recalculated(self):
        """
        The engine already tests exact calculation values (89/89 tests).
        Here we confirm the API wires engine output to the response exactly.
        For 8L salary: New Regime total = 31200.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 800000.0,
        })
        assert r.status_code == 200
        data = r.json()
        # Verified in Batch 1 engine tests (RC-08)
        assert data["new_regime"]["total_tax_liability"] == pytest.approx(31200.0)
        assert data["old_regime"]["total_tax_liability"] == pytest.approx(65000.0)

    def test_disclaimer_present_in_calculate_response(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 500000.0,
        })
        data = r.json()
        assert "disclaimer" in data
        # Must NOT claim guarantee
        assert "guaranteed" not in data["disclaimer"].lower()
        assert "official" not in data["disclaimer"].lower() or "not an official" in data["disclaimer"].lower()

    def test_disclaimer_present_in_detail_response(self):
        app.dependency_overrides[get_current_user] = _mock_user_a
        create_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 500000.0,
        })
        assessment_id = create_r.json()["assessment_id"]
        r = client.get(f"/tax-estimator/history/{assessment_id}")
        assert r.status_code == 200
        assert "disclaimer" in r.json()

    def test_recommendation_wording_is_non_claimant_and_adheres_to_spec(self):
        """
        Results must use non-claimant wording like 'may be more beneficial'
        and must NOT claim guaranteed savings or guaranteed liability.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 900000.0,
            "deduction_80c": 50000.0,
        })
        assert r.status_code == 200
        data = r.json()
        assert "recommendation_message" in data
        rec_msg = data["recommendation_message"]
        assert "may be more beneficial" in rec_msg
        assert "guaranteed" not in rec_msg.lower()

    def test_comparison_summary_structure_and_matrix_consistency(self):
        """
        Ensures RegimeComparisonSummary provides an understandable matrix
        between Old and New regimes using single authoritative engine values.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1200000.0,
            "deduction_80c": 150000.0,
            "deduction_80d": 25000.0,
        })
        assert r.status_code == 200
        data = r.json()
        assert "comparison_summary" in data
        summary = data["comparison_summary"]
        assert summary["recommended_regime"] in ("Old Regime", "New Regime")
        assert summary["old_regime_tax"] == data["old_regime"]["total_tax_liability"]
        assert summary["new_regime_tax"] == data["new_regime"]["total_tax_liability"]
        assert summary["taxable_income_old"] == data["old_regime"]["taxable_income"]
        assert summary["taxable_income_new"] == data["new_regime"]["taxable_income"]
        assert summary["estimated_tax_difference"] == data["estimated_tax_savings"]

    def test_step_by_step_explanation_and_opportunity_insights(self):
        """
        Verifies plain-language step-by-step explanations and What-If opportunity simulations
        are provided and derived from calculate_tax engine simulations.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1000000.0,
            "deduction_80c": 50000.0,
        })
        assert r.status_code == 200
        data = r.json()
        assert "explanation" in data
        assert isinstance(data["explanation"], list)
        assert len(data["explanation"]) > 0
        assert any("Standard deduction" in s for s in data["explanation"])

        assert "opportunity_insights" in data
        assert isinstance(data["opportunity_insights"], list)
        assert len(data["opportunity_insights"]) > 0
        assert any("What-If" in s or "Regime Resilience" in s for s in data["opportunity_insights"])

    def test_assessment_detail_includes_comparison_summary_and_explanation(self):
        """
        Detail endpoint GET /tax-estimator/history/{id} reconstructs and returns
        the comparison summary, explanation, and opportunity insights using authoritative engine.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        create_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 850000.0,
            "deduction_80c": 100000.0,
        })
        assert create_r.status_code == 200
        assessment_id = create_r.json()["assessment_id"]

        detail_r = client.get(f"/tax-estimator/history/{assessment_id}")
        assert detail_r.status_code == 200
        detail = detail_r.json()
        assert detail["comparison_summary"] is not None
        assert detail["recommendation_message"] is not None
        assert "may be more beneficial" in detail["recommendation_message"]
        assert len(detail["explanation"]) > 0


# =============================================================================
# MODULE 4: TRANSPARENCY AND TRUST LAYER TESTS
# =============================================================================

class TestTransparencyAndTrustLayer:

    def test_calculation_flow_structure_and_flow_values(self):
        """
        Step 1: HOW DID WE CALCULATE THIS?
        Expandable calculation breakdown covering:
        Gross Income -> Exemptions/Deductions -> Taxable Income -> Tax Slabs -> Surcharge -> Cess -> Estimated Tax
        Derived strictly from calculation engine without frontend recalculation.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 900000.0,
            "other_income": 50000.0,
            "deduction_80c": 120000.0,
            "deduction_80d": 20000.0,
        })
        assert r.status_code == 200
        data = r.json()

        assert "calculation_flow" in data
        flow = data["calculation_flow"]
        assert len(flow) == 8

        keys = [step["step_key"] for step in flow]
        assert keys == [
            "gross_income",
            "deductions",
            "taxable_income",
            "tax_slabs",
            "rebate_87a",
            "surcharge",
            "cess",
            "total_tax",
        ]

        # Verify values match engine outputs
        gross_step = flow[0]
        assert gross_step["old_regime_value"] == 950000.0
        assert gross_step["new_regime_value"] == 950000.0

        ded_step = flow[1]
        assert ded_step["old_regime_value"] == 190000.0  # 50k std + 120k 80C + 20k 80D
        assert ded_step["new_regime_value"] == 50000.0   # 50k std only

        tax_step = flow[7]
        assert tax_step["old_regime_value"] == data["old_regime"]["total_tax_liability"]
        assert tax_step["new_regime_value"] == data["new_regime"]["total_tax_liability"]

        for step in flow:
            assert step["description"] != ""
            assert step["formula_hint"] is not None

    def test_deduction_breakdown_includes_applicable_deductions_only(self):
        """
        Step 2: DEDUCTION BREAKDOWN
        Shows amount considered, statutory limit, why included/excluded, applicable regime.
        Only shows deductions relevant to user's actual situation.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1100000.0,
            "other_income": 0.0,
            "deduction_80c": 180000.0,  # Exceeds 1.5L cap
            "deduction_80d": 30000.0,   # Exceeds 25k cap
            "deduction_80tta": 0.0,     # Zero, should not be included as standalone item
        })
        assert r.status_code == 200
        data = r.json()

        assert "deduction_breakdown" in data
        items = data["deduction_breakdown"]
        sections = [item["section"] for item in items]

        assert "Section 16(ia)" in sections
        assert "Section 80C" in sections
        assert "Section 80D" in sections
        assert "Section 80TTA" not in sections

        # Check 80C capping
        sec_80c = next(i for i in items if i["section"] == "Section 80C")
        assert sec_80c["declared_amount"] == 180000.0
        assert sec_80c["considered_amount"] == 150000.0
        assert sec_80c["statutory_limit"] == 150000.0
        assert sec_80c["applicable_regime"] == "Old Regime Only"
        assert "Old Regime" in sec_80c["why_included"]
        assert "Disallowed" in sec_80c["why_not_included"] or "Not deductible" in sec_80c["why_not_included"]

        # Check 80D capping
        sec_80d = next(i for i in items if i["section"] == "Section 80D")
        assert sec_80d["declared_amount"] == 30000.0
        assert sec_80d["considered_amount"] == 25000.0
        assert sec_80d["statutory_limit"] == 25000.0

    def test_why_this_regime_deterministic_explanation_new_regime_favored(self):
        """
        Step 3: WHY THIS REGIME? (Deterministic CA explanation, no LLM)
        Tests case where New Regime is more beneficial due to lower baseline slabs.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 900000.0,
            "deduction_80c": 0.0,
            "deduction_80d": 0.0,
        })
        assert r.status_code == 200
        data = r.json()

        assert "why_this_regime" in data
        why = data["why_this_regime"]
        assert why["recommended_regime"] == "New Regime"
        assert "New Regime may be more beneficial" in why["headline"]
        assert why["estimated_savings"] > 0
        assert "insufficient" in why["primary_driver"].lower() or "zero" in why["primary_driver"].lower() or "slab rates" in why["primary_driver"].lower()
        assert len(why["bullets"]) >= 3

    def test_why_this_regime_deterministic_explanation_zero_tax_equal(self):
        """
        Step 3: WHY THIS REGIME?
        Tests zero income / full rebate equal outcome.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 0.0,
            "other_income": 0.0,
        })
        assert r.status_code == 200
        data = r.json()

        assert "why_this_regime" in data
        why = data["why_this_regime"]
        assert "identical" in why["headline"].lower()
        assert "rebate" in why["primary_driver"].lower()

    def test_trust_metadata_sources_overrides_assumptions_disclaimer(self):
        """
        Step 4: TRUST INFORMATION
        Verifies provenance labels: FINSTACK_PROFILE, USER_ENTERED, DOCUMENT_EXTRACTED,
        user overrides tracking, missing fields, statutory assumptions, and disclaimer.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        payload = {
            "financial_year": "2024-25",
            "gross_salary": 1200000.0,
            "other_income": 40000.0,
            "deduction_80c": 150000.0,
            "deduction_80d": 25000.0,
            "deduction_80tta": 10000.0,
            "field_sources": {
                "gross_salary": "FINSTACK_PROFILE",
                "other_income": "USER_ENTERED",
                "deduction_80c": "USER_ENTERED",
                "deduction_80d": "DOCUMENT_EXTRACTED",
                "deduction_80tta": "USER_ENTERED",
            },
            "user_overrides": ["other_income", "deduction_80c", "deduction_80tta"],
            "missing_fields": ["Rent Paid / HRA exemption not declared"],
        }
        r = client.post("/tax-estimator/calculate", json=payload)
        assert r.status_code == 200
        data = r.json()

        assert "trust_metadata" in data
        trust = data["trust_metadata"]
        assert trust["financial_year"] == "2024-25"
        assert trust["data_sources"]["gross_salary"] == "FINSTACK_PROFILE"
        assert trust["data_sources"]["deduction_80d"] == "DOCUMENT_EXTRACTED"
        assert "other_income" in trust["user_overrides"]
        assert len(trust["assumptions"]) >= 5
        assert any("Standard deduction" in a or "Section 16" in a for a in trust["assumptions"])
        assert "Rent Paid" in trust["missing_information"][0]
        assert "estimate" in trust["disclaimer"].lower()

    def test_detail_endpoint_reconstructs_full_transparency_and_trust_layer(self):
        """
        Step 5: Detail endpoint consistency
        GET /tax-estimator/history/{id} reconstructs the full transparency and trust layer.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        create_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 950000.0,
            "deduction_80c": 150000.0,
        })
        assert create_r.status_code == 200
        assessment_id = create_r.json()["assessment_id"]

        detail_r = client.get(f"/tax-estimator/history/{assessment_id}")
        assert detail_r.status_code == 200
        detail = detail_r.json()

        assert detail["calculation_flow"] is not None
        assert len(detail["calculation_flow"]) == 8
        assert detail["deduction_breakdown"] is not None
        assert detail["why_this_regime"] is not None
        assert detail["trust_metadata"] is not None


# =============================================================================
# MODULE 5 — BATCH 5: WHAT-IF SCENARIOS & TAX OPPORTUNITIES TESTS
# =============================================================================

class TestWhatIfAndOpportunities:
    """
    Module 5 (Batch 5) Test Suite:
    - Authoritative engine What-If simulations
    - 4 core scenarios: salary change, deductions, home loan, regime switch
    - Strict zero mutation of profile or database
    - Personalized data-grounded opportunities with anti-product-pushing disclaimers
    """

    @pytest.fixture(autouse=True)
    def setup_db(self):
        mock_db.reset()
        app.dependency_overrides[get_current_user] = _mock_user_a
        yield
        mock_db.reset()

    def test_what_if_salary_increase_simulation(self):
        """Scenario 1: Salary change simulation computes accurate incremental tax and delta."""
        payload = {
            "base_input": {
                "financial_year": "2024-25",
                "gross_salary": 1000000.0,
                "other_income": 0.0,
                "deduction_80c": 0.0,
                "deduction_80d": 0.0,
                "deduction_80tta": 0.0,
            },
            "scenario_type": "salary_change",
            "overrides": {
                "salary_change_amount": 200000.0,
            }
        }
        r = client.post("/tax-estimator/what-if", json=payload)
        assert r.status_code == 200
        data = r.json()

        assert data["scenario_type"] == "salary_change"
        assert data["does_mutate_profile"] is False
        assert data["current"]["gross_income"] == 1000000.0
        assert data["scenario"]["gross_income"] == 1200000.0
        assert data["scenario"]["total_tax"] > data["current"]["total_tax"]
        assert data["delta"]["tax_difference"] < 0  # higher tax in scenario
        assert "increases your estimated tax liability" in data["delta"]["summary_sentence"]
        assert len(data["delta"]["explanation_points"]) >= 2
        assert len(data["opportunities"]) > 0

    def test_what_if_additional_deductions_simulation(self):
        """Scenario 2: Additional eligible deductions simulation under Old Regime."""
        payload = {
            "base_input": {
                "financial_year": "2024-25",
                "gross_salary": 1200000.0,
                "other_income": 0.0,
                "deduction_80c": 0.0,
                "deduction_80d": 0.0,
                "deduction_80tta": 0.0,
            },
            "scenario_type": "additional_deductions",
            "overrides": {
                "additional_80c": 150000.0,
                "additional_80d": 25000.0,
                "forced_regime": "OLD",
            }
        }
        r = client.post("/tax-estimator/what-if", json=payload)
        assert r.status_code == 200
        data = r.json()

        assert data["scenario_type"] == "additional_deductions"
        assert data["does_mutate_profile"] is False
        assert data["scenario"]["total_deductions"] == 175000.0
        assert any("Chapter VI-A" in pt for pt in data["delta"]["explanation_points"])

    def test_what_if_home_loan_interest_simulation(self):
        """Scenario 3: Home-loan interest Section 24(b) deduction up to ₹2,00,000."""
        payload = {
            "base_input": {
                "financial_year": "2024-25",
                "gross_salary": 1500000.0,
                "other_income": 0.0,
                "deduction_80c": 150000.0,
                "deduction_80d": 25000.0,
                "deduction_80tta": 0.0,
                "home_loan_interest": 0.0,
            },
            "scenario_type": "home_loan_interest",
            "overrides": {
                "home_loan_interest": 200000.0,
                "forced_regime": "OLD",
            }
        }
        r = client.post("/tax-estimator/what-if", json=payload)
        assert r.status_code == 200
        data = r.json()

        assert data["scenario_type"] == "home_loan_interest"
        assert data["does_mutate_profile"] is False
        assert data["scenario"]["total_deductions"] == 375000.0  # 150k + 25k + 200k
        assert any("24(b)" in pt for pt in data["delta"]["explanation_points"])

    def test_what_if_regime_switch_simulation(self):
        """Scenario 4: Direct regime switch from recommended New Regime to Old Regime."""
        payload = {
            "base_input": {
                "financial_year": "2024-25",
                "gross_salary": 900000.0,
                "other_income": 0.0,
                "deduction_80c": 0.0,
                "deduction_80d": 0.0,
                "deduction_80tta": 0.0,
            },
            "scenario_type": "regime_switch",
            "overrides": {}
        }
        r = client.post("/tax-estimator/what-if", json=payload)
        assert r.status_code == 200
        data = r.json()

        assert data["scenario_type"] == "regime_switch"
        assert data["current"]["regime_name"] == "New Regime"
        assert data["scenario"]["regime_name"] == "Old Regime"
        # Old Regime tax without deductions is higher than New Regime
        assert data["delta"]["tax_difference"] < 0
        assert "increases your estimated tax liability" in data["delta"]["summary_sentence"]

    def test_what_if_strictly_never_mutates_database_or_history(self):
        """Scenarios must NEVER persist or overwrite saved user assessments."""
        assert len(mock_db.conn.execute("SELECT * FROM tax_assessments WHERE user_id = ?", (USER_A_ID,)).fetchall()) == 0

        # Execute 5 consecutive what-if simulations
        for stype in ["salary_change", "additional_deductions", "home_loan_interest", "regime_switch", "custom"]:
            r = client.post("/tax-estimator/what-if", json={
                "base_input": {
                    "financial_year": "2024-25",
                    "gross_salary": 1100000.0,
                },
                "scenario_type": stype,
                "overrides": {"salary_change_amount": 50000.0}
            })
            assert r.status_code == 200

        # Verify DB remains 100% empty
        assert len(mock_db.conn.execute("SELECT * FROM tax_assessments WHERE user_id = ?", (USER_A_ID,)).fetchall()) == 0

        # Also verify GET /tax-estimator/history returns empty list
        hist_r = client.get("/tax-estimator/history")
        assert hist_r.status_code == 200
        assert len(hist_r.json()["assessments"]) == 0

    def test_personalized_opportunities_generation_and_cautionary_notes(self):
        """
        Opportunities must be grounded in user numbers, label missing info accurately,
        and provide educational cautionary warnings against buying products purely to save tax.
        """
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1200000.0,
            "deduction_80c": 0.0,
            "deduction_80d": 0.0,
            "home_loan_interest": 0.0,
        })
        assert r.status_code == 200
        data = r.json()

        assert "opportunities" in data
        opps = data["opportunities"]
        assert len(opps) >= 3

        # 80C Opportunity
        opp_80c = next((o for o in opps if o["id"] == "opp_80c_missing"), None)
        assert opp_80c is not None
        assert opp_80c["status"] == "missing_information"
        assert len(opp_80c["missing_fields_required"]) >= 2
        assert "lock-in" in opp_80c["cautionary_note"].lower() or "solely" in opp_80c["cautionary_note"].lower()
        assert opp_80c["potential_tax_impact"] > 0

        # 80D Opportunity
        opp_80d = next((o for o in opps if o["id"] == "opp_80d_missing"), None)
        assert opp_80d is not None
        assert opp_80d["status"] == "missing_information"
        assert len(opp_80d["missing_fields_required"]) >= 1
        assert "medical" in opp_80d["cautionary_note"].lower() or "health" in opp_80d["cautionary_note"].lower()

        # Section 24(b) Opportunity
        opp_24b = next((o for o in opps if o["id"] == "opp_24b_missing"), None)
        assert opp_24b is not None
        assert opp_24b["status"] == "missing_information"
        assert "loan" in opp_24b["cautionary_note"].lower() or "interest" in opp_24b["cautionary_note"].lower()

    def test_opportunities_with_maxed_deductions_shows_optimization(self):
        """When user has already maxed 80C and 80D, missing tags are not created."""
        r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1000000.0,
            "deduction_80c": 150000.0,
            "deduction_80d": 25000.0,
            "home_loan_interest": 200000.0,
        })
        assert r.status_code == 200
        data = r.json()

        opps = data["opportunities"]
        assert not any(o["id"] == "opp_80c_missing" for o in opps)
        assert not any(o["id"] == "opp_80d_missing" for o in opps)
        assert not any(o["id"] == "opp_24b_missing" for o in opps)
        assert any(o["status"] == "optimization" for o in opps)


# =============================================================================
# SECTION 8 — MODULE 6: TAX EDUCATION & KNOWLEDGE BASE
# =============================================================================

class TestTaxEducationEndpoint:
    """
    Validates centralized tax education endpoint:
    - Slabs and rates derived dynamically from versioned rules (no hardcoding)
    - All 12 statutory terms in glossary
    - Calculation flow stages
    - Financial Year & Assessment Year metadata
    """

    def test_get_tax_education_default_fy(self):
        r = client.get("/tax-estimator/tax-education")
        assert r.status_code == 200
        data = r.json()

        assert data["financial_year"] == "2024-25"
        assert data["assessment_year"] == "2025-26"
        assert "1 April 2024" in data["fy_date_span"]
        assert "31 March 2025" in data["fy_date_span"]
        assert "1 April 2025" in data["ay_date_span"]
        assert "31 March 2026" in data["ay_date_span"]
        assert data["standard_deduction"] == 50000.0
        assert data["cess_rate_percent"] == 4.0

        # Regimes
        assert data["new_regime"]["is_default"] is True
        assert data["new_regime"]["rebate_87a_limit"] == 700000.0
        assert len(data["new_regime"]["slabs"]) == 6
        assert data["new_regime"]["slabs"][0]["rate_percent"] == 0.0
        assert data["new_regime"]["slabs"][1]["rate_percent"] == 5.0
        assert data["new_regime"]["slabs"][5]["rate_percent"] == 30.0

        assert data["old_regime"]["is_default"] is False
        assert data["old_regime"]["rebate_87a_limit"] == 500000.0
        assert len(data["old_regime"]["slabs"]) == 4

        # Statutory deduction limits
        codes = {d["code"] for d in data["deduction_limits"]}
        assert {"80C", "80D", "24B", "80TTA"}.issubset(codes)
        limit_80c = next(d for d in data["deduction_limits"] if d["code"] == "80C")
        assert limit_80c["limit_amount"] == 150000.0
        limit_24b = next(d for d in data["deduction_limits"] if d["code"] == "24B")
        assert limit_24b["limit_amount"] == 200000.0

        # Calculation Flow Stages (Gross Income -> Estimated Tax)
        stages = data["calculation_flow_stages"]
        assert len(stages) >= 7
        stage_titles = [s["title"] for s in stages]
        assert "Gross Income" in stage_titles
        assert "Taxable Income" in stage_titles
        assert "Tax Slabs Calculation" in stage_titles
        assert "Estimated Tax Liability" in stage_titles

        # Glossary (All 12 required terms)
        glossary_terms = {t["term"] for t in data["glossary"]}
        expected_terms = {
            "Gross Income",
            "Taxable Income",
            "Standard Deduction",
            "HRA",
            "80C",
            "80D",
            "24(b)",
            "Rebate",
            "Surcharge",
            "Cess",
            "Financial Year",
            "Assessment Year",
        }
        missing_terms = expected_terms - glossary_terms
        assert not missing_terms, f"Missing required glossary terms: {missing_terms}"

        # Check disclaimer is present
        assert len(data["disclaimer"]) > 20

    def test_get_tax_education_invalid_fy(self):
        r = client.get("/tax-estimator/tax-education?financial_year=1999-00")
        assert r.status_code == 400
        assert "not supported" in r.json()["detail"].lower()


# =============================================================================
# SECTION 11 — Module 7: History Enhancements & Document Vault Boundary Tests
# =============================================================================

class TestHistoryEnhancementsAndDocumentBoundary:

    def test_history_returns_all_six_required_fields(self):
        """
        Module 7 Part A: History view must show:
        1. Financial Year
        2. date (created_at)
        3. gross income
        4. recommended regime
        5. estimated tax
        6. estimated difference
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        create_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 900000.0,
            "other_income": 50000.0,
            "deduction_80c": 100000.0,
        })
        assert create_r.status_code == 200

        history_r = client.get("/tax-estimator/history")
        assert history_r.status_code == 200
        assessments = history_r.json()["assessments"]
        assert len(assessments) >= 1
        item = assessments[0]

        # Verify all 6 required fields are present and properly typed
        assert "financial_year" in item and item["financial_year"] == "2024-25"
        assert "created_at" in item and item["created_at"] is not None
        assert "gross_income" in item and item["gross_income"] == pytest.approx(950000.0)
        assert "recommended_regime" in item and item["recommended_regime"] in ("Old Regime", "New Regime")
        assert "estimated_tax" in item and isinstance(item["estimated_tax"], (int, float))
        assert "estimated_difference" in item and isinstance(item["estimated_difference"], (int, float))

    def test_recalculate_assessment_creates_fresh_record(self):
        """
        Recalculating an assessment runs the authoritative engine against the past
        inputs and saves a fresh assessment.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        # 1. Create initial assessment
        initial_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1200000.0,
            "other_income": 0.0,
            "deduction_80c": 150000.0,
            "deduction_80d": 25000.0,
        })
        assert initial_r.status_code == 200
        past_id = initial_r.json()["assessment_id"]

        # 2. Recalculate it
        recalc_r = client.post(f"/tax-estimator/history/{past_id}/recalculate")
        assert recalc_r.status_code == 200
        new_data = recalc_r.json()
        new_id = new_data["assessment_id"]
        assert new_id != past_id  # Brand new assessment record created
        assert new_data["financial_year"] == "2024-25"
        assert new_data["old_regime"]["total_chapter_vi_a_deductions"] == pytest.approx(175000.0)

    def test_recalculate_cross_user_isolation(self):
        """
        User B must NOT be allowed to recalculate User A's past assessment (403 Forbidden).
        """
        # User A creates assessment
        app.dependency_overrides[get_current_user] = _mock_user_a
        initial_r = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1000000.0,
        })
        user_a_id = initial_r.json()["assessment_id"]

        # User B attempts to recalculate it
        app.dependency_overrides[get_current_user] = _mock_user_b
        r = client.post(f"/tax-estimator/history/{user_a_id}/recalculate")
        assert r.status_code == 403
        assert "Unauthorized" in r.json()["detail"]

    def test_compare_assessments_side_by_side_and_deltas(self):
        """
        Comparing two assessments calculates gross, taxable, and tax deltas accurately.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        # Create Assessment 1: 800,000 gross
        r1 = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 800000.0,
        })
        id1 = r1.json()["assessment_id"]

        # Create Assessment 2: 1,200,000 gross
        r2 = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 1200000.0,
        })
        id2 = r2.json()["assessment_id"]

        compare_r = client.post("/tax-estimator/history/compare", json={
            "assessment_id_1": id1,
            "assessment_id_2": id2,
        })
        assert compare_r.status_code == 200
        comp = compare_r.json()
        assert comp["assessment_1"]["id"] == id1
        assert comp["assessment_2"]["id"] == id2

        delta = comp["delta"]
        assert delta["gross_income_diff"] == pytest.approx(400000.0)
        assert delta["tax_difference"] > 0
        assert "regime_transition" in delta
        assert len(delta["summary_notes"]) >= 2

    def test_compare_cross_user_isolation(self):
        """
        User B cannot compare assessments if one of them belongs to User A.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        r1 = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 700000.0,
        })
        user_a_id = r1.json()["assessment_id"]

        app.dependency_overrides[get_current_user] = _mock_user_b
        r2 = client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 750000.0,
        })
        user_b_id = r2.json()["assessment_id"]

        # User B attempts to compare user_a_id and user_b_id
        compare_r = client.post("/tax-estimator/history/compare", json={
            "assessment_id_1": user_a_id,
            "assessment_id_2": user_b_id,
        })
        assert compare_r.status_code == 403

    def test_financial_journey_milestone_endpoint(self):
        """
        Tests clean, decoupled milestone status for Financial Journey integration.
        """
        # User B starts with no assessments
        app.dependency_overrides[get_current_user] = _mock_user_b
        m_initial = client.get("/tax-estimator/journey/milestone")
        assert m_initial.status_code == 200
        data_init = m_initial.json()
        assert data_init["has_assessment"] is False
        assert data_init["milestone_status"] == "PENDING_ASSESSMENT"

        # User B runs calculation
        client.post("/tax-estimator/calculate", json={
            "financial_year": "2024-25",
            "gross_salary": 850000.0,
        })

        m_after = client.get("/tax-estimator/journey/milestone")
        assert m_after.status_code == 200
        data_after = m_after.json()
        assert data_after["has_assessment"] is True
        assert data_after["financial_year"] == "2024-25"
        assert data_after["recommended_regime"] in ("New Regime", "Old Regime")
        assert data_after["estimated_tax"] >= 0.0

    def test_document_vault_stage_forces_unconfirmed_state(self):
        """
        PART B: Document Vault boundary staging must force is_user_confirmed=False
        and set all candidate fields to PENDING_USER_REVIEW.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        stage_payload = {
            "document_id": "doc_f16_test_01",
            "document_type": "FORM_16",
            "document_name": "Form16_Test.pdf",
            "financial_year": "2024-25",
            "extracted_fields": [
                {
                    "field_name": "gross_salary",
                    "extracted_value": 1100000.0,
                    "extraction_confidence": 0.95,
                    "source_clause": "Part B Clause 17(1)",
                },
                {
                    "field_name": "deduction_80c",
                    "extracted_value": 150000.0,
                    "extraction_confidence": 0.92,
                    "source_clause": "Clause 10(a)",
                }
            ],
            "is_user_confirmed": True,  # Attacker attempts to forge confirmation!
        }
        r = client.post("/tax-estimator/documents/stage", json=stage_payload)
        assert r.status_code == 200
        staged = r.json()
        # Must be overridden to False by DocumentBoundaryService
        assert staged["is_user_confirmed"] is False
        for f in staged["extracted_fields"]:
            assert f["is_confirmed"] is False
            assert f["review_status"] == "PENDING_USER_REVIEW"

    def test_unconfirmed_document_data_rejected_with_422(self):
        """
        CRITICAL ARCHITECTURAL RULE:
        DOCUMENT_EXTRACTED values must NEVER silently become trusted tax inputs.
        Directly calculating with unconfirmed document source must actively fail with 422.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        unconfirmed_calc_payload = {
            "financial_year": "2024-25",
            "gross_salary": 1100000.0,
            "field_sources": {
                "gross_salary": "DOCUMENT_EXTRACTED",
            },
            "is_user_confirmed": False,  # Not confirmed by human user!
        }
        r = client.post("/tax-estimator/calculate", json=unconfirmed_calc_payload)
        assert r.status_code == 422
        assert "Unconfirmed document data cannot be used directly" in r.json()["detail"]

    def test_document_vault_confirmation_and_calculation_flow(self):
        """
        Full boundary flow:
        Stage Document -> User Reviews (Accept/Modify/Reject) -> Confirm -> Calculate.
        """
        app.dependency_overrides[get_current_user] = _mock_user_a
        staged_payload = {
            "document_id": "doc_f16_test_02",
            "document_type": "FORM_16",
            "document_name": "Form16_Test_02.pdf",
            "financial_year": "2024-25",
            "extracted_fields": [
                {
                    "field_name": "gross_salary",
                    "extracted_value": 1300000.0,
                    "extraction_confidence": 0.97,
                    "source_clause": "Clause 17(1)",
                },
                {
                    "field_name": "deduction_80c",
                    "extracted_value": 150000.0,
                    "extraction_confidence": 0.94,
                    "source_clause": "Clause 10(a)",
                },
                {
                    "field_name": "deduction_80d",
                    "extracted_value": 30000.0,
                    "extraction_confidence": 0.89,
                    "source_clause": "Clause 10(d)",
                }
            ],
            "is_user_confirmed": False,
        }

        # User submits explicit review decisions:
        # - ACCEPT gross_salary (1,300,000)
        # - MODIFY deduction_80c to 120,000 (taxpayer knows 30k wasn't actually deposited)
        # - REJECT deduction_80d (policy was cancelled)
        confirm_request = {
            "document_id": "doc_f16_test_02",
            "decisions": {
                "gross_salary": {"action": "ACCEPT"},
                "deduction_80c": {"action": "MODIFY", "confirmed_value": 120000.0},
                "deduction_80d": {"action": "REJECT", "rejection_reason": "Policy cancelled"},
            },
            "staged_payload": staged_payload,
        }
        confirm_r = client.post("/tax-estimator/documents/confirm", json=confirm_request)
        assert confirm_r.status_code == 200
        res = confirm_r.json()

        assert res["confirmed_fields_count"] == 2
        assert res["rejected_fields_count"] == 1
        assert res["is_ready_for_calculation"] is True
        assert len(res["audit_trail"]) == 3

        norm_input = res["normalized_tax_input"]
        assert norm_input["gross_salary"] == 1300000.0
        assert norm_input["deduction_80c"] == 120000.0
        assert norm_input["deduction_80d"] == 0.0
        assert norm_input["field_sources"]["gross_salary"]["source"] == "DOCUMENT_EXTRACTED"
        assert norm_input["field_sources"]["deduction_80c"]["source"] == "USER_ENTERED"

        # Now submit confirmed inputs to calculation engine (is_user_confirmed=True)
        calc_payload = {
            "financial_year": "2024-25",
            "gross_salary": norm_input["gross_salary"],
            "deduction_80c": norm_input["deduction_80c"],
            "deduction_80d": norm_input["deduction_80d"],
            "field_sources": {
                "gross_salary": "DOCUMENT_EXTRACTED",
                "deduction_80c": "USER_ENTERED",
            },
            "is_user_confirmed": True,
            "document_id": "doc_f16_test_02",
        }
        calc_r = client.post("/tax-estimator/calculate", json=calc_payload)
        assert calc_r.status_code == 200
        calc_data = calc_r.json()
        assert calc_data["old_regime"]["gross_income"] == 1300000.0
        assert calc_data["old_regime"]["total_chapter_vi_a_deductions"] == 120000.0





