"""
Document Vault Integration Boundary
===================================
Establishes the formal integration boundary between the Document Vault / Intelligence
system and the Tax Estimator's Normalized Tax Input layer.

Architecture Flow:
Document Vault
  → Extracted Data (provisional candidates)
  → User Review (per-field acceptance/modification/rejection)
  → User Confirmation (human approval gate)
  → Normalized Tax Input (with audited provenance)
  → Tax Calculation (deterministic engine)

CRITICAL RULE:
DOCUMENT_EXTRACTED values must NEVER silently become trusted tax inputs.
A human user MUST review and confirm them before calculation.
DO NOT fake OCR or document extraction.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from fastapi import HTTPException
from pydantic import BaseModel, Field

from modules.tax_estimator.normalized_input import (
    NormalizedTaxInput,
    FieldProvenance,
    TaxInputSource,
)


class DocumentType(str, Enum):
    FORM_16 = "FORM_16"
    SALARY_SLIP = "SALARY_SLIP"
    ITR_ACKNOWLEDGEMENT = "ITR_ACKNOWLEDGEMENT"
    TAX_COMPUTATION_SHEET = "TAX_COMPUTATION_SHEET"
    INTEREST_CERTIFICATE = "INTEREST_CERTIFICATE"
    INSURANCE_PREMIUM_RECEIPT = "INSURANCE_PREMIUM_RECEIPT"
    OTHER = "OTHER"


class ReviewStatus(str, Enum):
    PENDING_USER_REVIEW = "PENDING_USER_REVIEW"
    USER_CONFIRMED = "USER_CONFIRMED"
    USER_REJECTED = "USER_REJECTED"


class ExtractedFieldCandidate(BaseModel):
    """A single candidate financial value extracted by Document Vault."""
    field_name: str = Field(..., description="Target tax field name, e.g. 'gross_salary', 'deduction_80c'")
    extracted_value: float = Field(..., ge=0.0, description="Raw monetary value extracted from document")
    extraction_confidence: float = Field(default=0.90, ge=0.0, le=1.0, description="OCR/Parser confidence score")
    source_clause: Optional[str] = Field(None, description="Document citation, e.g. 'Form 16 Part B, Clause 17(1)'")
    is_confirmed: bool = False
    confirmed_value: Optional[float] = None
    review_status: ReviewStatus = ReviewStatus.PENDING_USER_REVIEW
    review_notes: Optional[str] = None


class DocumentStagedPayload(BaseModel):
    """
    Contract received from Document Vault when a tax document is processed.
    Critical rule: Staged values are PROVISIONAL and UNCONFIRMED.
    They cannot be used directly in calculate_tax until confirmed by user.
    """
    document_id: str
    document_type: DocumentType
    document_name: str
    financial_year: str = "2024-25"
    extracted_fields: List[ExtractedFieldCandidate]
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_user_confirmed: bool = False
    disclaimer: str = (
        "Document extracted values are unconfirmed drafts. "
        "A human user must review and confirm or override all figures before they can become trusted tax inputs."
    )


class FieldReviewDecision(BaseModel):
    action: str = Field(..., description="'ACCEPT', 'MODIFY', or 'REJECT'")
    confirmed_value: Optional[float] = Field(None, ge=0.0)
    rejection_reason: Optional[str] = None


class DocumentReviewConfirmationRequest(BaseModel):
    """
    User review submission where user explicitly confirms, modifies, or rejects each candidate field.
    """
    document_id: str
    decisions: Dict[str, FieldReviewDecision] = Field(..., description="Mapping of field_name to user review decision")
    staged_payload: Optional[DocumentStagedPayload] = Field(
        None,
        description="The original staged payload being confirmed"
    )


class ConfirmedDocumentTaxInputResponse(BaseModel):
    """
    Result of human user confirmation.
    Contains verified NormalizedTaxInput where confirmed fields carry:
    source: DOCUMENT_EXTRACTED
    confidence: 1.0
    notes: Confirmed by user from document
    """
    document_id: str
    document_type: DocumentType
    normalized_tax_input: NormalizedTaxInput
    confirmed_fields_count: int
    rejected_fields_count: int
    is_ready_for_calculation: bool = True
    audit_trail: List[str]


class DocumentBoundaryService:
    """
    Service enforcing the boundary between Document Vault and Tax Estimator.
    Guarantees no silent ingestion without human confirmation.
    """

    @staticmethod
    def stage_document_extracted_data(payload: DocumentStagedPayload) -> DocumentStagedPayload:
        """
        Ingest extracted data from Document Vault into a provisional staging state.
        Always forces is_user_confirmed=False.
        """
        payload.is_user_confirmed = False
        for field in payload.extracted_fields:
            field.is_confirmed = False
            field.review_status = ReviewStatus.PENDING_USER_REVIEW
        return payload

    @staticmethod
    def confirm_document_extracted_data(
        user_id: str,
        request: DocumentReviewConfirmationRequest,
        staged_payload: DocumentStagedPayload
    ) -> ConfirmedDocumentTaxInputResponse:
        """
        Processes human user review of staged document fields.
        Applies decisions (ACCEPT, MODIFY, REJECT) and transitions approved values
        into a trusted NormalizedTaxInput.
        """
        if request.document_id != staged_payload.document_id:
            raise HTTPException(
                status_code=400,
                detail=f"Document ID mismatch: '{request.document_id}' vs staged '{staged_payload.document_id}'"
            )

        confirmed_count = 0
        rejected_count = 0
        audit_trail: List[str] = []

        field_sources: Dict[str, FieldProvenance] = {}
        normalized_values: Dict[str, Any] = {
            "financial_year": staged_payload.financial_year,
            "age": 30,
            "gross_salary": 0.0,
            "other_income": 0.0,
            "deduction_80c": 0.0,
            "deduction_80d": 0.0,
            "deduction_80tta": 0.0,
        }

        # Index staged fields by field_name
        staged_map = {f.field_name: f for f in staged_payload.extracted_fields}

        for field_name, decision in request.decisions.items():
            staged_field = staged_map.get(field_name)
            if not staged_field:
                continue

            action = decision.action.upper()

            if action == "ACCEPT":
                final_val = float(staged_field.extracted_value)
                normalized_values[field_name] = final_val
                field_sources[field_name] = FieldProvenance(
                    source=TaxInputSource.DOCUMENT_EXTRACTED,
                    raw_value=staged_field.extracted_value,
                    confidence=1.0,
                    notes=(
                        f"Accepted by user from {staged_payload.document_name} "
                        f"({staged_field.source_clause or 'Document Data'})"
                    )
                )
                confirmed_count += 1
                audit_trail.append(f"ACCEPTED {field_name} = ₹{final_val:,.2f} from {staged_payload.document_type}")

            elif action == "MODIFY":
                if decision.confirmed_value is None:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Action MODIFY requires 'confirmed_value' for field '{field_name}'"
                    )
                final_val = float(decision.confirmed_value)
                normalized_values[field_name] = final_val
                field_sources[field_name] = FieldProvenance(
                    source=TaxInputSource.USER_ENTERED,
                    raw_value=final_val,
                    confidence=1.0,
                    notes=(
                        f"Modified by user during document review (Extracted: ₹{staged_field.extracted_value:,.2f}, "
                        f"Overridden: ₹{final_val:,.2f})"
                    )
                )
                confirmed_count += 1
                audit_trail.append(
                    f"MODIFIED {field_name} from ₹{staged_field.extracted_value:,.2f} to ₹{final_val:,.2f}"
                )

            elif action == "REJECT":
                normalized_values[field_name] = 0.0
                reason = decision.rejection_reason or "Taxpayer declined to use document extracted figure"
                field_sources[field_name] = FieldProvenance(
                    source=TaxInputSource.DEFAULT,
                    raw_value=0.0,
                    confidence=1.0,
                    notes=f"Rejected by user: {reason}"
                )
                rejected_count += 1
                audit_trail.append(f"REJECTED {field_name} (Extracted was ₹{staged_field.extracted_value:,.2f}): {reason}")

            else:
                raise HTTPException(
                    status_code=422,
                    detail=f"Unknown decision action '{action}'. Must be 'ACCEPT', 'MODIFY', or 'REJECT'."
                )

        normalized_input = NormalizedTaxInput(
            financial_year=staged_payload.financial_year,
            age=normalized_values.get("age", 30),
            gross_salary=normalized_values.get("gross_salary", 0.0),
            other_income=normalized_values.get("other_income", 0.0),
            deduction_80c=normalized_values.get("deduction_80c", 0.0),
            deduction_80d=normalized_values.get("deduction_80d", 0.0),
            deduction_80tta=normalized_values.get("deduction_80tta", 0.0),
            field_sources=field_sources,
        )

        return ConfirmedDocumentTaxInputResponse(
            document_id=staged_payload.document_id,
            document_type=staged_payload.document_type,
            normalized_tax_input=normalized_input,
            confirmed_fields_count=confirmed_count,
            rejected_fields_count=rejected_count,
            is_ready_for_calculation=True,
            audit_trail=audit_trail,
        )

    @staticmethod
    def assert_no_unconfirmed_document_data(
        field_sources: Optional[Dict[str, Any]],
        is_user_confirmed: bool = True
    ):
        """
        Critical architectural enforcement:
        If any input field originates from DOCUMENT_EXTRACTED without explicit human confirmation,
        reject immediately.
        """
        if not field_sources:
            return

        if not is_user_confirmed:
            for field, prov in field_sources.items():
                if isinstance(prov, str):
                    src = prov
                elif isinstance(prov, dict):
                    src = prov.get("source")
                elif hasattr(prov, "source"):
                    src = getattr(prov, "source")
                else:
                    src = str(prov)

                if hasattr(src, "value"):
                    src = src.value

                if str(src).upper() in (
                    TaxInputSource.DOCUMENT_EXTRACTED.value,
                    "DOCUMENT_EXTRACTED",
                    "DOCUMENT_VAULT",
                    "OCR_EXTRACTED"
                ):
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"Critical Guardrail Violation: Field '{field}' has source DOCUMENT_EXTRACTED "
                            "but has not been confirmed by the user. Document extracted values must NEVER silently "
                            "become trusted tax inputs without explicit user review and confirmation. "
                            "Unconfirmed document data cannot be used directly in tax calculations."
                        )
                    )

