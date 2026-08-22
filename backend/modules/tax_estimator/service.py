"""
Tax Estimator Service Layer
Handles authenticated context, calculation invocation, persistence, and retrieval.
The deterministic calculation engine remains independent of this layer.
Architecture: Router → Service → Engine → Rules
               Service → Supabase (persistence)
"""
from decimal import Decimal
from fastapi import HTTPException

from common.database import supabase
from modules.tax_estimator.engine import calculate_tax
from modules.tax_estimator.domain import TaxEstimatorInput, RegimeCalculationResult
from modules.tax_estimator.schema import (
    TaxCalculateRequest,
    TaxCalculateResponse,
    RegimeBreakdownResponse,
    TaxAssessmentDetailResponse,
    TaxAssessmentSummary,
    TaxAssessmentHistoryResponse,
)

TABLE = "tax_assessments"


def _regime_to_response(r: RegimeCalculationResult) -> RegimeBreakdownResponse:
    """Map domain result → API response model."""
    return RegimeBreakdownResponse(
        regime_name=r.regime_name,
        gross_income=float(r.gross_income),
        standard_deduction=float(r.standard_deduction),
        total_chapter_vi_a_deductions=float(r.total_chapter_vi_a_deductions),
        taxable_income=float(r.taxable_income),
        tax_on_income=float(r.tax_on_income),
        rebate_87a=float(r.rebate_87a),
        tax_after_rebate=float(r.tax_after_rebate),
        surcharge=float(r.surcharge),
        health_and_education_cess=float(r.health_and_education_cess),
        total_tax_liability=float(r.total_tax_liability),
    )


class TaxEstimatorService:

    @staticmethod
    def calculate_and_save(user_id: str, request: TaxCalculateRequest) -> TaxCalculateResponse:
        """
        1. Build domain input from API request.
        2. Invoke deterministic calculation engine.
        3. Persist assessment linked to authenticated user_id.
        4. Return structured response.

        user_id is ALWAYS derived from the authenticated token — never from
        the request body.
        """
        # --- Build engine input ---
        try:
            domain_input = TaxEstimatorInput(
                financial_year=request.financial_year,
                gross_salary=Decimal(str(request.gross_salary)),
                other_income=Decimal(str(request.other_income)),
                deduction_80c=Decimal(str(request.deduction_80c)),
                deduction_80d=Decimal(str(request.deduction_80d)),
                deduction_80tta=Decimal(str(request.deduction_80tta)),
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # --- Invoke calculation engine ---
        try:
            result = calculate_tax(domain_input)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # --- Persist to Supabase ---
        record = {
            "user_id": user_id,
            "financial_year": request.financial_year,
            "gross_salary": float(request.gross_salary),
            "other_income": float(request.other_income),
            "deduction_80c": float(request.deduction_80c),
            "deduction_80d": float(request.deduction_80d),
            "deduction_80tta": float(request.deduction_80tta),
            # Old regime breakdown
            "old_gross_income": float(result.old_regime.gross_income),
            "old_standard_deduction": float(result.old_regime.standard_deduction),
            "old_chapter_vi_deductions": float(result.old_regime.total_chapter_vi_a_deductions),
            "old_taxable_income": float(result.old_regime.taxable_income),
            "old_tax_on_income": float(result.old_regime.tax_on_income),
            "old_rebate_87a": float(result.old_regime.rebate_87a),
            "old_tax_after_rebate": float(result.old_regime.tax_after_rebate),
            "old_surcharge": float(result.old_regime.surcharge),
            "old_cess": float(result.old_regime.health_and_education_cess),
            "old_total_tax": float(result.old_regime.total_tax_liability),
            # New regime breakdown
            "new_gross_income": float(result.new_regime.gross_income),
            "new_standard_deduction": float(result.new_regime.standard_deduction),
            "new_chapter_vi_deductions": float(result.new_regime.total_chapter_vi_a_deductions),
            "new_taxable_income": float(result.new_regime.taxable_income),
            "new_tax_on_income": float(result.new_regime.tax_on_income),
            "new_rebate_87a": float(result.new_regime.rebate_87a),
            "new_tax_after_rebate": float(result.new_regime.tax_after_rebate),
            "new_surcharge": float(result.new_regime.surcharge),
            "new_cess": float(result.new_regime.health_and_education_cess),
            "new_total_tax": float(result.new_regime.total_tax_liability),
            # Comparison
            "recommended_regime": result.recommended_regime,
            "estimated_tax_savings": float(result.tax_savings),
        }

        try:
            response = supabase.table(TABLE).insert(record).execute()
            if not response.data:
                raise Exception("Insert returned no data")
            saved = response.data[0]
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail="Failed to save assessment. Please try again."
            )

        return TaxCalculateResponse(
            assessment_id=saved["id"],
            financial_year=result.financial_year,
            old_regime=_regime_to_response(result.old_regime),
            new_regime=_regime_to_response(result.new_regime),
            recommended_regime=result.recommended_regime,
            estimated_tax_savings=float(result.tax_savings),
        )

    @staticmethod
    def get_history(user_id: str) -> TaxAssessmentHistoryResponse:
        """Return all assessments for the authenticated user, newest first."""
        try:
            response = (
                supabase.table(TABLE)
                .select(
                    "id, financial_year, old_total_tax, new_total_tax, "
                    "recommended_regime, estimated_tax_savings, created_at"
                )
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to retrieve assessment history.")

        assessments = [
            TaxAssessmentSummary(
                id=row["id"],
                financial_year=row["financial_year"],
                old_regime_total_tax=row["old_total_tax"],
                new_regime_total_tax=row["new_total_tax"],
                recommended_regime=row["recommended_regime"],
                estimated_tax_savings=row["estimated_tax_savings"],
                created_at=row["created_at"],
            )
            for row in (response.data or [])
        ]
        return TaxAssessmentHistoryResponse(assessments=assessments)

    @staticmethod
    def get_assessment(assessment_id: str, user_id: str) -> TaxAssessmentDetailResponse:
        """
        Return a single assessment by ID.
        Enforces user ownership: raises 403 if the record does not belong
        to the authenticated user. Returns 404 if not found.
        """
        try:
            response = (
                supabase.table(TABLE)
                .select("*")
                .eq("id", assessment_id)
                .single()
                .execute()
            )
        except Exception:
            raise HTTPException(status_code=404, detail="Assessment not found.")

        row = response.data
        if not row:
            raise HTTPException(status_code=404, detail="Assessment not found.")

        # Ownership check — server enforced, never trust client-supplied user_id
        if row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized.")

        old = RegimeBreakdownResponse(
            regime_name="Old Regime",
            gross_income=row["old_gross_income"],
            standard_deduction=row["old_standard_deduction"],
            total_chapter_vi_a_deductions=row["old_chapter_vi_deductions"],
            taxable_income=row["old_taxable_income"],
            tax_on_income=row["old_tax_on_income"],
            rebate_87a=row["old_rebate_87a"],
            tax_after_rebate=row["old_tax_after_rebate"],
            surcharge=row["old_surcharge"],
            health_and_education_cess=row["old_cess"],
            total_tax_liability=row["old_total_tax"],
        )
        new = RegimeBreakdownResponse(
            regime_name="New Regime",
            gross_income=row["new_gross_income"],
            standard_deduction=row["new_standard_deduction"],
            total_chapter_vi_a_deductions=row["new_chapter_vi_deductions"],
            taxable_income=row["new_taxable_income"],
            tax_on_income=row["new_tax_on_income"],
            rebate_87a=row["new_rebate_87a"],
            tax_after_rebate=row["new_tax_after_rebate"],
            surcharge=row["new_surcharge"],
            health_and_education_cess=row["new_cess"],
            total_tax_liability=row["new_total_tax"],
        )

        return TaxAssessmentDetailResponse(
            id=row["id"],
            financial_year=row["financial_year"],
            gross_salary=row["gross_salary"],
            other_income=row["other_income"],
            deduction_80c=row["deduction_80c"],
            deduction_80d=row["deduction_80d"],
            deduction_80tta=row["deduction_80tta"],
            old_regime=old,
            new_regime=new,
            recommended_regime=row["recommended_regime"],
            estimated_tax_savings=row["estimated_tax_savings"],
            created_at=row["created_at"],
        )
