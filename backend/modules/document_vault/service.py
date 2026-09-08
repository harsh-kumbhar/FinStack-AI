import hashlib
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from common.database import supabase
from .extraction_service import extract_text_from_pdf
from .classification_service import classify_document
from .structured_extraction_service import (
    extract_structured_data,
    validate_extracted_data,
    calculate_extraction_confidence,
)
BUCKET_NAME = "documents"

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}

ALLOWED_DOCUMENT_TYPES = {
    "salary_slip",
    "bank_statement",
    "itr",
    "pan",
    "loan_statement",
    "insurance",
    "investment",
    "credit_card",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# =========================================================
# CUSTOM EXCEPTIONS
# =========================================================

class DuplicateDocumentError(Exception):
    """Raised when the same user uploads the same document twice."""
    pass


class UserProfileNotFoundError(Exception):
    """Raised when no user profile exists for the authenticated user."""
    pass


class DocumentNotFoundError(Exception):
    """Raised when a document cannot be found or does not belong to the user."""
    pass


class FileTooLargeError(Exception):
    """Raised when the uploaded file exceeds the size limit."""
    pass


class InvalidDocumentTypeError(Exception):
    """Raised when an unsupported document type is supplied."""
    pass


# =========================================================
# HELPERS
# =========================================================

def calculate_sha256(file_bytes: bytes) -> str:
    """Calculate SHA-256 hash of a file."""
    return hashlib.sha256(file_bytes).hexdigest()


def sanitize_filename(filename: str) -> str:
    """
    Keep only the filename portion and remove potentially unsafe
    path components.
    """
    filename = os.path.basename(filename)

    safe_chars = []

    for char in filename:
        if char.isalnum() or char in "._- ":
            safe_chars.append(char)
        else:
            safe_chars.append("_")

    sanitized = "".join(safe_chars).strip()

    return sanitized or "document"


def validate_document_type(document_type: str) -> None:
    """Validate the document type against the supported document types."""

    if document_type not in ALLOWED_DOCUMENT_TYPES:
        allowed_types = ", ".join(sorted(ALLOWED_DOCUMENT_TYPES))

        raise InvalidDocumentTypeError(
            f"Unsupported document type '{document_type}'. "
            f"Allowed types: {allowed_types}."
        )


def get_user_profile_id(user_id: str) -> str:
    """Get the user_profile ID associated with an authenticated user."""

    response = (
        supabase
        .table("user_profile")
        .select("id")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not response.data:
        raise UserProfileNotFoundError(
            "User profile not found."
        )

    return response.data["id"]


def check_duplicate_document(
    user_profile_id: str,
    file_hash: str,
) -> Optional[dict]:
    """Check whether the user has already uploaded the same file."""

    response = (
        supabase
        .table("uploaded_document")
        .select("*")
        .eq("user_profile_id", user_profile_id)
        .eq("sha256_hash", file_hash)
        .limit(1)
        .execute()
    )

    if not response or not response.data:
        return None

    return response.data[0]

def calculate_is_expired(
    expires_at: Optional[str | datetime],
) -> bool:
    """
    Determine whether a document has expired.

    Documents without an expiry date are considered active.
    """

    if not expires_at:
        return False

    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(
                expires_at.replace("Z", "+00:00")
            )
        except ValueError:
            return False

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    return expires_at < datetime.now(timezone.utc)


def enrich_document(document: dict) -> dict:
    """
    Add computed metadata to a document returned from the database.
    """

    document = dict(document)

    document["is_expired"] = calculate_is_expired(
        document.get("expires_at")
    )

    return document

# =========================================================
# UPLOAD
# =========================================================

def upload_document(
    user_id: str,
    document_type: str,
    filename: str,
    mime_type: str,
    file_bytes: bytes,
) -> dict:
    """
    Upload a document to Supabase Storage and create its metadata
    record in uploaded_document.

    For PDF documents:
        1. Extract text
        2. Automatically classify the document
        3. Extract structured financial data
        4. Store the structured data in document_extracted_data
    """

    # ---------------------------------------------------------
    # 1. Validate document type
    # ---------------------------------------------------------

    validate_document_type(document_type)

    # ---------------------------------------------------------
    # 2. Validate MIME type
    # ---------------------------------------------------------

    if mime_type not in ALLOWED_MIME_TYPES:
        raise ValueError(
            "Unsupported file type. "
            "Only PDF, JPEG and PNG files are allowed."
        )

    # ---------------------------------------------------------
    # 3. Validate file size
    # ---------------------------------------------------------

    file_size = len(file_bytes)

    if file_size == 0:
        raise ValueError(
            "The uploaded file is empty."
        )

    if file_size > MAX_FILE_SIZE:
        raise FileTooLargeError(
            "File size exceeds the 10 MB limit."
        )

    # ---------------------------------------------------------
    # 4. Get user profile
    # ---------------------------------------------------------

    user_profile_id = get_user_profile_id(user_id)

    # ---------------------------------------------------------
    # 5. Calculate SHA-256
    # ---------------------------------------------------------

    file_hash = calculate_sha256(file_bytes)

    # ---------------------------------------------------------
    # 6. Check duplicate
    # ---------------------------------------------------------

    existing_document = check_duplicate_document(
        user_profile_id,
        file_hash,
    )

    if existing_document:
        raise DuplicateDocumentError(
            "This document has already been uploaded."
        )

    # ---------------------------------------------------------
    # 7. Generate document ID
    # ---------------------------------------------------------

    document_id = str(uuid.uuid4())

    safe_filename = sanitize_filename(filename)

    # ---------------------------------------------------------
    # 8. Build Storage path
    # ---------------------------------------------------------

    storage_path = (
        f"{user_id}/{document_id}/{safe_filename}"
    )

    # ---------------------------------------------------------
    # 9. Upload to Supabase Storage
    # ---------------------------------------------------------

    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            storage_path,
            file_bytes,
            {
                "content-type": mime_type,
                "upsert": False,
            },
        )

    except Exception as exc:
        raise RuntimeError(
            f"Failed to upload document to storage: {str(exc)}"
        )

    # ---------------------------------------------------------
    # 10. Create database metadata
    # ---------------------------------------------------------

    document_data = {
        "id": document_id,
        "user_profile_id": user_profile_id,
        "document_type": document_type,
        "original_filename": filename,
        "storage_path": storage_path,
        "file_size": file_size,
        "mime_type": mime_type,
        "sha256_hash": file_hash,
        "processing_status": "pending",
    }

    try:
        response = (
            supabase
            .table("uploaded_document")
            .insert(document_data)
            .execute()
        )

    except Exception as exc:
        # Database insertion failed after Storage upload.
        # Remove the orphaned Storage object.
        try:
            supabase.storage.from_(BUCKET_NAME).remove(
                [storage_path]
            )
        except Exception:
            pass

        # Handle database-level duplicate protection.
        error_text = str(exc).lower()

        if (
            "uploaded_document_user_hash_unique" in error_text
            or "duplicate key" in error_text
            or "unique constraint" in error_text
        ):
            raise DuplicateDocumentError(
                "This document has already been uploaded."
            )

        raise RuntimeError(
            f"Failed to save document metadata: {str(exc)}"
        )

    if not response.data:
        try:
            supabase.storage.from_(BUCKET_NAME).remove(
                [storage_path]
            )
        except Exception:
            pass

        raise RuntimeError(
            "Document metadata could not be created."
        )

    document = enrich_document(response.data[0])

    # ---------------------------------------------------------
    # 11. Automatically extract PDF text
    # ---------------------------------------------------------

    if mime_type == "application/pdf":
        try:
            extract_document_text(
                user_id=user_id,
                document_id=document_id,
            )
        except Exception:
            # Extraction failure must not fail the upload.
            pass

    # ---------------------------------------------------------
    # 12. Automatically classify extracted PDF
    # ---------------------------------------------------------

    if mime_type == "application/pdf":
        try:
            extracted_response = (
                supabase
                .table("document_extracted_data")
                .select("raw_text")
                .eq("document_id", document_id)
                .maybe_single()
                .execute()
            )

            if extracted_response and extracted_response.data:
                raw_text = extracted_response.data.get("raw_text")

                if raw_text:

                    # -----------------------------------------
                    # 12A. Automatic classification
                    # -----------------------------------------

                    classified_type, confidence, matched_keywords = (
                        classify_document(raw_text)
                    )

                    if classified_type:

                        # -------------------------------------
                        # Update actual document type
                        # -------------------------------------

                        (
                            supabase
                            .table("uploaded_document")
                            .update({
                                "document_type": classified_type,
                            })
                            .eq("id", document_id)
                            .eq("user_profile_id", user_profile_id)
                            .execute()
                        )

                        extracted_data = extract_structured_data(
                            raw_text=raw_text,
                            document_type=classified_type,
                        )

                        # ---------------------------------------------------------
                        # 12B. Validate structured extraction
                        # ---------------------------------------------------------

                        validation_result = validate_extracted_data(
                            extracted_data=extracted_data,
                            document_type=classified_type,
                        )

                        # ---------------------------------------------------------
                        # 12C. Calculate extraction confidence
                        # ---------------------------------------------------------

                        extraction_confidence = calculate_extraction_confidence(
                            validation_result
                        )

                        # ---------------------------------------------------------
                        # 12D. Determine extraction status
                        # ---------------------------------------------------------

                        if validation_result["is_valid"]:
                            extraction_status = "completed"
                            extraction_error = None
                        else:
                            extraction_status = "completed"
                            extraction_error = "; ".join(
                                validation_result["errors"]
                            )

                        # ---------------------------------------------------------
                        # 12E. Store structured data + validation result
                        # ---------------------------------------------------------

                        (
                            supabase
                            .table("document_extracted_data")
                            .update({
                                "extracted_data": extracted_data,
                                "confidence_score": extraction_confidence,
                                "extraction_status": extraction_status,
                                "extraction_error": extraction_error,
                            })
                            .eq("document_id", document_id)
                            .execute()
                        )

        except Exception:
            # Classification / structured extraction failure
            # must not fail the upload.
            pass

    return document
# =========================================================
# LIST DOCUMENTS
# =========================================================
def list_documents(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """
    Return paginated documents belonging to the authenticated user.
    """

    if page < 1:
        raise ValueError("Page must be greater than or equal to 1.")

    if page_size < 1 or page_size > 100:
        raise ValueError("Page size must be between 1 and 100.")

    user_profile_id = get_user_profile_id(user_id)

    offset = (page - 1) * page_size

    response = (
        supabase
        .table("uploaded_document")
        .select("*", count="exact")
        .eq("user_profile_id", user_profile_id)
        .order("uploaded_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    documents = response.data or []

    return {
        "documents": [
            enrich_document(document)
            for document in documents
        ],
        "page": page,
        "page_size": page_size,
        "total_documents": response.count or 0,
        "total_pages": (
            (response.count + page_size - 1) // page_size
            if response.count
            else 0
        ),
    }

def filter_documents(
    user_id: str,
    document_type: Optional[str] = None,
    processing_status: Optional[str] = None,
    expired: Optional[bool] = None,
) -> list[dict]:
    """
    Return documents belonging to the authenticated user with
    optional filtering by document type, processing status,
    and expiry status.
    """

    user_profile_id = get_user_profile_id(user_id)

    query = (
        supabase
        .table("uploaded_document")
        .select("*")
        .eq("user_profile_id", user_profile_id)
        .order("uploaded_at", desc=True)
    )

    if document_type:
        query = query.eq("document_type", document_type)

    if processing_status:
        query = query.eq("processing_status", processing_status)

    response = query.execute()

    documents = response.data or []

    enriched_documents = [
        enrich_document(document)
        for document in documents
    ]

    if expired is not None:
        enriched_documents = [
            document
            for document in enriched_documents
            if document["is_expired"] == expired
        ]

    return enriched_documents

def search_documents(
    user_id: str,
    search_query: str,
) -> list[dict]:
    """
    Search the authenticated user's documents by filename.
    """

    if not search_query or not search_query.strip():
        raise ValueError("Search query cannot be empty.")

    user_profile_id = get_user_profile_id(user_id)

    response = (
        supabase
        .table("uploaded_document")
        .select("*")
        .eq("user_profile_id", user_profile_id)
        .ilike("original_filename", f"%{search_query.strip()}%")
        .order("uploaded_at", desc=True)
        .execute()
    )

    documents = response.data or []

    return [
        enrich_document(document)
        for document in documents
    ]

def get_document_statistics(user_id: str) -> dict:
    """
    Return summary statistics for the authenticated user's
    documents.
    """

    result = list_documents(
        user_id=user_id,
        page=1,
        page_size=100,
    )

    documents = result.get("documents", [])

    total_documents = result.get(
        "total_documents",
        len(documents),
    )

    expired_documents = sum(
        1
        for document in documents
        if document.get("is_expired", False)
    )

    active_documents = total_documents - expired_documents

    by_type = {}

    for document in documents:
        document_type = document.get("document_type")

        if document_type:
            by_type[document_type] = (
                by_type.get(document_type, 0) + 1
            )

    by_status = {}

    for document in documents:
        processing_status = document.get("processing_status")

        if processing_status:
            by_status[processing_status] = (
                by_status.get(processing_status, 0) + 1
            )

    return {
        "total_documents": total_documents,
        "active_documents": active_documents,
        "expired_documents": expired_documents,
        "by_document_type": by_type,
        "by_processing_status": by_status,
    }

# =========================================================
# GET DOCUMENT
# =========================================================

def get_document(
    user_id: str,
    document_id: str,
) -> dict:
    """Get one document after verifying ownership."""

    user_profile_id = get_user_profile_id(user_id)

    response = (
        supabase
        .table("uploaded_document")
        .select("*")
        .eq("id", document_id)
        .eq("user_profile_id", user_profile_id)
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise DocumentNotFoundError(
            "Document not found."
        )

    return enrich_document(response.data)

def update_document_status(
    user_id: str,
    document_id: str,
    processing_status: str,
) -> dict:
    """
    Update the processing status of a user's document.
    """

    allowed_statuses = {
        "pending",
        "processing",
        "completed",
        "failed",
    }

    if processing_status not in allowed_statuses:
        raise ValueError(
            "Invalid processing status."
        )

    document = get_document(
        user_id=user_id,
        document_id=document_id,
    )

    response = (
        supabase
        .table("uploaded_document")
        .update({
            "processing_status": processing_status,
        })
        .eq("id", document_id)
        .eq(
            "user_profile_id",
            document["user_profile_id"],
        )
        .execute()
    )

    if not response.data:
        raise RuntimeError(
            "Document status could not be updated."
        )

    return enrich_document(response.data[0])
# =========================================================
# DOWNLOAD URL
# =========================================================

def create_download_url(
    user_id: str,
    document_id: str,
) -> str:
    """Create a temporary signed URL for a user's document."""

    document = get_document(
        user_id,
        document_id,
    )

    try:
        response = (
            supabase
            .storage
            .from_(BUCKET_NAME)
            .create_signed_url(
                document["storage_path"],
                300,  # 5 minutes
            )
        )

    except Exception as exc:
        raise RuntimeError(
            f"Failed to generate download URL: {str(exc)}"
        )

    if not response:
        raise RuntimeError(
            "Could not generate document download URL."
        )

    # Supabase Python client versions may expose the key
    # as either signedURL or signedUrl.
    signed_url = (
        response.get("signedURL")
        or response.get("signedUrl")
    )

    if not signed_url:
        raise RuntimeError(
            "Could not generate document download URL."
        )

    return signed_url


# =========================================================
# DELETE
# =========================================================

def delete_document(
    user_id: str,
    document_id: str,
) -> None:
    """Delete a document from Storage and its metadata."""

    document = get_document(
        user_id,
        document_id,
    )

    storage_path = document["storage_path"]

    # ---------------------------------------------------------
    # 1. Delete Storage object
    # ---------------------------------------------------------

    try:
        supabase.storage.from_(BUCKET_NAME).remove(
            [storage_path]
        )

    except Exception as exc:
        raise RuntimeError(
            f"Failed to delete document from storage: {str(exc)}"
        )

    # ---------------------------------------------------------
    # 2. Delete database metadata
    # ---------------------------------------------------------

    try:
        (
            supabase
            .table("uploaded_document")
            .delete()
            .eq("id", document_id)
            .eq(
                "user_profile_id",
                document["user_profile_id"],
            )
            .execute()
        )

    except Exception as exc:
        raise RuntimeError(
            f"Failed to delete document metadata: {str(exc)}"
        )

def extract_document_text(
    user_id: str,
    document_id: str,
) -> dict:
    """
    Download a user's PDF from Supabase Storage,
    extract its text, and save the result.
    """

    # ---------------------------------------------------------
    # 1. Verify document ownership
    # ---------------------------------------------------------

    document = get_document(
        user_id=user_id,
        document_id=document_id,
    )

    if document["mime_type"] != "application/pdf":
        raise ValueError(
            "Text extraction is currently supported only for PDF files."
        )

    # ---------------------------------------------------------
    # 2. Mark extraction as processing
    # ---------------------------------------------------------

    existing = (
        supabase
        .table("document_extracted_data")
        .select("id")
        .eq("document_id", document_id)
        .maybe_single()
        .execute()
    )

    extraction_record = {
        "document_id": document_id,
        "extraction_status": "processing",
        "raw_text": None,
        "extracted_data": None,
        "confidence_score": None,
        "extraction_error": None,
    }

    if existing and existing.data:
        (
            supabase
            .table("document_extracted_data")
            .update(extraction_record)
            .eq("document_id", document_id)
            .execute()
        )
    else:
        (
            supabase
            .table("document_extracted_data")
            .insert(extraction_record)
            .execute()
        )

    # ---------------------------------------------------------
    # 3. Download PDF from Storage
    # ---------------------------------------------------------

    try:
        file_bytes = (
            supabase
            .storage
            .from_(BUCKET_NAME)
            .download(document["storage_path"])
        )
    except Exception as exc:
        error_message = f"Failed to download document: {str(exc)}"

        (
            supabase
            .table("document_extracted_data")
            .update({
                "extraction_status": "failed",
                "extraction_error": error_message,
            })
            .eq("document_id", document_id)
            .execute()
        )

        raise RuntimeError(error_message)

    # ---------------------------------------------------------
    # 4. Extract PDF text
    # ---------------------------------------------------------

    try:
        raw_text = extract_text_from_pdf(file_bytes)

    except Exception as exc:
        error_message = str(exc)

        (
            supabase
            .table("document_extracted_data")
            .update({
                "extraction_status": "failed",
                "extraction_error": error_message,
            })
            .eq("document_id", document_id)
            .execute()
        )

        raise RuntimeError(
            f"PDF text extraction failed: {error_message}"
        )

    # ---------------------------------------------------------
    # 5. Save extracted text
    # ---------------------------------------------------------

    response = (
        supabase
        .table("document_extracted_data")
        .update({
            "raw_text": raw_text,
            "extraction_status": "completed",
            "extraction_error": None,
        })
        .eq("document_id", document_id)
        .execute()
    )

    if not response or not response.data:
        raise RuntimeError(
            "Extracted text could not be saved."
        )

    return response.data[0]