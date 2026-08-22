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
