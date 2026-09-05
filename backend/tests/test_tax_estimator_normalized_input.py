"""
Tax Estimator Normalized Input Layer Tests
==========================================
Verifies:
1. Normalization from FinStack profiles (user_profile + financial_profile).
2. Semantic protection:
   - Annualization of monthly_income (monthly * 12).
   - Non-leakage: cumulative portfolio investments NOT mapped to Section 80C.
   - Non-leakage: life insurance sum assured NOT mapped to Section 80D health premium.
3. Accurate age calculation from date_of_birth.
4. Precedence rules: USER_ENTERED > DOCUMENT_EXTRACTED > FINSTACK_PROFILE > DEFAULT.
5. Domain conversion to deterministic engine TaxEstimatorInput.
6. API endpoint GET /tax-estimator/profile-defaults:
   - Authentication requirement (401 when missing/invalid token).
   - Profile-enriched response when profiles exist.
   - Graceful fallback when profiles do not exist (independent usability).
"""

import sys
import os
import sqlite3
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import patch

# Ensure backend root is on sys.path
_backend_root = os.path.join(os.path.dirname(__file__), "..", "..", "backend")
_backend_root = os.path.abspath(_backend_root)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

import pytest
from fastapi.testclient import TestClient
from main import app
from common.database import get_current_user

from modules.tax_estimator.normalized_input import (
    TaxInputSource,
    FieldProvenance,
    NormalizedTaxInput,
    ProfileDefaultsResponse,
    TaxInputNormalizer,
)
from modules.tax_estimator.engine import calculate_tax


# =============================================================================
# UNIT TESTS: TaxInputNormalizer logic
# =============================================================================

class TestTaxInputNormalizerUnit:

    def test_calculate_age_from_dob_standard(self):
        ref = date(2025, 4, 1)
        dob = "1995-03-15"
        age = TaxInputNormalizer.calculate_age_from_dob(dob, ref_date=ref)
        assert age == 30

    def test_calculate_age_from_dob_before_birthday(self):
        ref = date(2025, 4, 1)
        dob = "1995-05-15"
        age = TaxInputNormalizer.calculate_age_from_dob(dob, ref_date=ref)
        assert age == 29

    def test_calculate_age_from_dob_invalid_inputs(self):
        assert TaxInputNormalizer.calculate_age_from_dob(None) is None
        assert TaxInputNormalizer.calculate_age_from_dob("") is None
        assert TaxInputNormalizer.calculate_age_from_dob("invalid-date") is None

    def test_normalize_from_profiles_full_data(self):
        user_prof = {
            "date_of_birth": "1990-01-01",
            "full_name": "Test User",
        }
        fin_prof = {
            "monthly_income": 75000.0,
            "investments": 450000.0,
            "insurance_cover": 5000000.0,
        }

        normalized = TaxInputNormalizer.normalize_from_profiles(
            user_profile=user_prof,
            financial_profile=fin_prof,
            financial_year="2024-25"
        )

        # 1. Gross salary annualized: 75,000 * 12 = 900,000
        assert normalized.gross_salary == 900000.0
        assert normalized.field_sources["gross_salary"].source == TaxInputSource.FINSTACK_PROFILE
        assert normalized.field_sources["gross_salary"].confidence == 0.80

        # 2. Semantic check: investments (4.5L) MUST NOT be mapped to 80C
        assert normalized.deduction_80c == 0.0
        assert normalized.field_sources["deduction_80c"].source == TaxInputSource.DEFAULT
        assert "portfolio investments" in normalized.field_sources["deduction_80c"].notes

        # 3. Semantic check: insurance_cover (50L sum assured) MUST NOT be mapped to 80D
        assert normalized.deduction_80d == 0.0
        assert normalized.field_sources["deduction_80d"].source == TaxInputSource.DEFAULT
        assert "sum assured" in normalized.field_sources["deduction_80d"].notes

        # 4. Age computed from DOB
        assert normalized.age >= 34
        assert normalized.field_sources["age"].source == TaxInputSource.FINSTACK_PROFILE

    def test_normalize_from_profiles_empty_data_independent_usability(self):
        normalized = TaxInputNormalizer.normalize_from_profiles(None, None)

        assert normalized.gross_salary == 0.0
        assert normalized.age == 30
        assert normalized.deduction_80c == 0.0
        assert normalized.deduction_80d == 0.0
        assert normalized.deduction_80tta == 0.0
        assert normalized.field_sources["gross_salary"].source == TaxInputSource.DEFAULT
        assert normalized.field_sources["age"].source == TaxInputSource.DEFAULT

    def test_precedence_merging(self):
        base = TaxInputNormalizer.normalize_from_profiles(
            user_profile={"date_of_birth": "1995-01-01"},
            financial_profile={"monthly_income": 50000.0},
        )
        assert base.gross_salary == 600000.0
        assert base.field_sources["gross_salary"].source == TaxInputSource.FINSTACK_PROFILE

        # 1. Document extracted overrides profile
        doc_inputs = {"gross_salary": 650000.0, "deduction_80c": 120000.0}
        merged_doc = TaxInputNormalizer.merge_inputs(base, document_inputs=doc_inputs)
        assert merged_doc.gross_salary == 650000.0
        assert merged_doc.deduction_80c == 120000.0
        assert merged_doc.field_sources["gross_salary"].source == TaxInputSource.DOCUMENT_EXTRACTED
        assert merged_doc.field_sources["deduction_80c"].source == TaxInputSource.DOCUMENT_EXTRACTED

        # 2. User entered overrides document
        user_inputs = {"gross_salary": 700000.0}
        merged_user = TaxInputNormalizer.merge_inputs(merged_doc, user_inputs=user_inputs)
        assert merged_user.gross_salary == 700000.0
        assert merged_user.deduction_80c == 120000.0  # Kept from doc
        assert merged_user.field_sources["gross_salary"].source == TaxInputSource.USER_ENTERED
        assert merged_user.field_sources["deduction_80c"].source == TaxInputSource.DOCUMENT_EXTRACTED

    def test_to_domain_input_and_engine_execution(self):
        normalized = NormalizedTaxInput(
            financial_year="2024-25",
            age=32,
            gross_salary=1200000.0,
            other_income=25000.0,
            deduction_80c=150000.0,
            deduction_80d=25000.0,
            deduction_80tta=10000.0,
        )

        domain_input = normalized.to_domain_input()
        assert domain_input.gross_salary == Decimal('1200000.0')
        assert domain_input.other_income == Decimal('25000.0')
        assert domain_input.deduction_80c == Decimal('150000.0')

        # Pass to authoritative deterministic calculation engine
        result = calculate_tax(domain_input)
        assert result.financial_year == "2024-25"
        assert result.new_regime.gross_income == Decimal('1225000.0')
        assert result.old_regime.gross_income == Decimal('1225000.0')
        assert result.recommended_regime in ("Old Regime", "New Regime")


# =============================================================================
# INTEGRATION TESTS: Mocked Supabase Database for Profile Defaults Endpoint
# =============================================================================

class MockSupabaseMultiTable:
    """Mock Supabase client supporting user_profile and financial_profile queries."""

    def __init__(self):
        self.conn = sqlite3.connect(":memory:", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_db()

    def _init_db(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profile (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                full_name TEXT,
                date_of_birth TEXT
            );
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS financial_profile (
                id TEXT PRIMARY KEY,
                user_profile_id TEXT NOT NULL,
                monthly_income REAL DEFAULT 0,
                investments REAL DEFAULT 0,
                insurance_cover REAL DEFAULT 0
            );
        """)
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
            );
        """)
        self.conn.commit()

    def reset(self):
        self.conn.execute("DELETE FROM user_profile")
        self.conn.execute("DELETE FROM financial_profile")
        self.conn.execute("DELETE FROM tax_assessments")
        self.conn.commit()

    def table(self, name):
        return _MultiTableQueryBuilder(self.conn, name)


class _MultiTableQueryBuilder:
    def __init__(self, conn, table_name):
        self.conn = conn
        self.table_name = table_name
        self._op = "SELECT"
        self._insert_data = None
        self._select_cols = "*"
        self._filters = []

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

    def execute(self):
        if self._op == "INSERT":
            import uuid
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
            self.conn.execute(
                f"INSERT INTO {self.table_name} ({cols}) VALUES ({placeholders})",
                list(record.values()),
            )
            self.conn.commit()
            return type("MockResponse", (), {"data": [record]})()

        sql = f"SELECT * FROM {self.table_name}"
        params = []
        if self._filters:
            clauses = [f"{col} = ?" for col, _ in self._filters]
            sql += " WHERE " + " AND ".join(clauses)
            params = [val for _, val in self._filters]

        cur = self.conn.execute(sql, params)
        rows = cur.fetchall()
        data = [dict(row) for row in rows]
        return type("MockResponse", (), {"data": data})()


class MockUser:
    def __init__(self, user_id="usr-normalized-001"):
        self.id = user_id


@pytest.fixture
def multi_db_client():
    mock_db = MockSupabaseMultiTable()
    current_user = MockUser("usr-normalized-001")

    # Seed user profile and financial profile
    mock_db.conn.execute(
        "INSERT INTO user_profile (id, user_id, full_name, date_of_birth) VALUES (?, ?, ?, ?)",
        ("prof-uuid-1", "usr-normalized-001", "Priya Sharma", "1992-06-15")
    )
    mock_db.conn.execute(
        "INSERT INTO financial_profile (id, user_profile_id, monthly_income, investments, insurance_cover) VALUES (?, ?, ?, ?, ?)",
        ("fin-uuid-1", "prof-uuid-1", 80000.0, 300000.0, 2500000.0)
    )
    mock_db.conn.commit()

    app.dependency_overrides[get_current_user] = lambda: current_user

    with patch("modules.tax_estimator.service.supabase", mock_db):
        client = TestClient(app)
        yield client, mock_db, current_user

    app.dependency_overrides.clear()


class TestProfileDefaultsEndpoint:

    def test_profile_defaults_unauthenticated_returns_401(self):
        app.dependency_overrides[get_current_user] = lambda: None
        client = TestClient(app)
        resp = client.get("/tax-estimator/profile-defaults")
        assert resp.status_code == 401
        app.dependency_overrides.clear()

    def test_profile_defaults_with_existing_profile(self, multi_db_client):
        client, db, user = multi_db_client
        resp = client.get("/tax-estimator/profile-defaults")
        assert resp.status_code == 200

        data = resp.json()
        assert data["financial_year"] == "2024-25"
        assert data["has_profile_data"] is True
        # Annualized: 80,000 * 12 = 960,000
        assert data["gross_salary"] == 960000.0
        assert data["deduction_80c"] == 0.0  # Not corrupted by portfolio balance
        assert data["deduction_80d"] == 0.0  # Not corrupted by life cover
        assert "field_sources" in data
        assert data["field_sources"]["gross_salary"]["source"] == "FINSTACK_PROFILE"
        assert "disclaimer" in data

    def test_profile_defaults_no_profile_returns_graceful_defaults(self, multi_db_client):
        client, db, user = multi_db_client
        db.reset()  # Remove all profiles

        resp = client.get("/tax-estimator/profile-defaults")
        assert resp.status_code == 200

        data = resp.json()
        assert data["has_profile_data"] is False
        assert data["gross_salary"] == 0.0
        assert data["age"] == 30
        assert data["field_sources"]["gross_salary"]["source"] == "DEFAULT"

    def test_manual_override_precedence_and_both_regimes(self, multi_db_client):
        """Simulates full workflow: profile load -> manual override -> both regimes calculated."""
        client, db, user = multi_db_client

        # 1. Fetch defaults (pre-filled from profile: 80k/mo -> 960k annual)
        defaults_resp = client.get("/tax-estimator/profile-defaults")
        assert defaults_resp.status_code == 200
        defaults = defaults_resp.json()

        # 2. User enters manual overrides for salary and conditional deductions
        overridden_salary = 1100000.0  # ₹11,00,000
        calc_payload = {
            "financial_year": defaults["financial_year"],
            "gross_salary": overridden_salary,
            "other_income": 30000.0,
            "deduction_80c": 150000.0,  # Max 80C
            "deduction_80d": 25000.0,   # Max 80D
            "deduction_80tta": 10000.0, # Max 80TTA
        }

        calc_resp = client.post("/tax-estimator/calculate", json=calc_payload)
        assert calc_resp.status_code == 200
        res = calc_resp.json()

        # New Regime: standard deduction ₹50k applied, 80C/80D/80TTA ignored
        assert res["new_regime"]["gross_income"] == 1130000.0
        assert res["new_regime"]["standard_deduction"] == 50000.0
        assert res["new_regime"]["total_chapter_vi_a_deductions"] == 0.0
        assert res["new_regime"]["taxable_income"] == 1080000.0

        # Old Regime: standard deduction ₹50k + ₹1,85,000 Chapter VI-A deductions applied
        assert res["old_regime"]["gross_income"] == 1130000.0
        assert res["old_regime"]["standard_deduction"] == 50000.0
        assert res["old_regime"]["total_chapter_vi_a_deductions"] == 185000.0
        assert res["old_regime"]["taxable_income"] == 895000.0

        # Regime comparison
        assert res["recommended_regime"] in ("Old Regime", "New Regime")
        assert res["estimated_tax_savings"] >= 0

    def test_incomplete_information_continuation_zero_income(self, multi_db_client):
        """User continues with incomplete information (₹0 salary / deductions)."""
        client, db, user = multi_db_client

        calc_payload = {
            "financial_year": "2024-25",
            "gross_salary": 0.0,
            "other_income": 0.0,
            "deduction_80c": 0.0,
            "deduction_80d": 0.0,
            "deduction_80tta": 0.0,
        }

        calc_resp = client.post("/tax-estimator/calculate", json=calc_payload)
        assert calc_resp.status_code == 200
        res = calc_resp.json()
        assert res["new_regime"]["total_tax_liability"] == 0.0
        assert res["old_regime"]["total_tax_liability"] == 0.0
        assert res["estimated_tax_savings"] == 0.0
