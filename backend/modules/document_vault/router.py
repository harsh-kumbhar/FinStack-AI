from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
    Query,
)
from typing import Optional

from modules.document_vault.classification_service import (
    classify_document,
)
from modules.document_vault.schema import (
    DocumentListResponse,
    DocumentResponse,
    DocumentStatusUpdate,
)

from modules.document_vault.service import (
    DuplicateDocumentError,
    DocumentNotFoundError,
    FileTooLargeError,
    InvalidDocumentTypeError,
    UserProfileNotFoundError,
    create_download_url,
    delete_document,
    filter_documents,
    get_document_statistics,
    get_document,
    list_documents,
    update_document_status,
    search_documents,
    upload_document,
    extract_document_text,
)

from common.database import get_current_user
from common.database import supabase

router = APIRouter(
    prefix="/documents",
    tags=["Document Vault"],
)


# =========================================================
# UPLOAD DOCUMENT
# =========================================================

@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document_endpoint(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    user=Depends(get_current_user),
):
    """
    Upload a document to the user's Document Vault.
    """

    # ---------------------------------------------------------
    # Read file
    # ---------------------------------------------------------

    file_bytes = await file.read()

    # ---------------------------------------------------------
    # Validate filename
    # ---------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    # ---------------------------------------------------------
    # Upload document
    # ---------------------------------------------------------

    try:
        document = upload_document(
            user_id=user.id,
            document_type=document_type,
            filename=file.filename,
            mime_type=file.content_type or "",
            file_bytes=file_bytes,
        )

        return document

    except InvalidDocumentTypeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    except DuplicateDocumentError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except FileTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


# =========================================================
# SEARCH DOCUMENTS
# IMPORTANT: Must come before /{document_id}
# =========================================================

@router.get("/search")
async def search_documents_endpoint(
    q: str = Query(..., min_length=1),
    user=Depends(get_current_user),
):
    """
    Search the authenticated user's documents by filename.
    """

    try:
        return search_documents(
            user_id=user.id,
            search_query=q,
        )

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search documents: {str(exc)}",
        )


# =========================================================
# DOCUMENT STATISTICS
# IMPORTANT: Must come before /{document_id}
# =========================================================

@router.get("/stats")
async def get_document_stats_endpoint(
    user=Depends(get_current_user),
):
    """
    Return document vault statistics for the authenticated user.
    """

    try:
        return get_document_statistics(user.id)

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document statistics: {str(exc)}",
        )


# =========================================================
# FILTER DOCUMENTS
# IMPORTANT: Must come before /{document_id}
# =========================================================

@router.get("/filter")
async def filter_documents_endpoint(
    document_type: Optional[str] = None,
    processing_status: Optional[str] = None,
    expired: Optional[bool] = None,
    user=Depends(get_current_user),
):
    """
    Filter documents belonging to the authenticated user.
    """

    try:
        return filter_documents(
            user_id=user.id,
            document_type=document_type,
            processing_status=processing_status,
            expired=expired,
        )

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to filter documents: {str(exc)}",
        )


# =========================================================
# LIST DOCUMENTS
# =========================================================

@router.get(
    "",
    response_model=DocumentListResponse,
)
async def list_documents_endpoint(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
):
    """
    Return paginated documents belonging to the authenticated user.
    """

    try:
        documents = list_documents(
            user_id=user.id,
            page=page,
            page_size=page_size,
        )

        return {
            "documents": documents["documents"],
            "total": documents["total_documents"],
        }

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve documents: {str(exc)}",
        )


# =========================================================
# UPDATE DOCUMENT PROCESSING STATUS
# IMPORTANT: Must come before /{document_id}
# =========================================================

@router.patch(
    "/{document_id}/status",
)
async def update_document_status_endpoint(
    document_id: str,
    request: DocumentStatusUpdate,
    user=Depends(get_current_user),
):
    """
    Update the processing status of a user's document.
    """

    try:
        return update_document_status(
            user_id=user.id,
            document_id=document_id,
            processing_status=request.processing_status,
        )

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except DocumentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update document status: {str(exc)}",
        )


# =========================================================
# DOWNLOAD DOCUMENT
# IMPORTANT: Must come before /{document_id}
# =========================================================

@router.get(
    "/{document_id}/download",
)
async def download_document_endpoint(
    document_id: str,
    user=Depends(get_current_user),
):
    """
    Generate a temporary signed URL for downloading a document.
    """

    try:
        signed_url = create_download_url(
            user_id=user.id,
            document_id=document_id,
        )

        return {
            "download_url": signed_url,
            "expires_in": 300,
        }

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except DocumentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

# =========================================================
# EXTRACT DOCUMENT TEXT
# =========================================================

@router.post(
    "/{document_id}/extract",
)
async def extract_document_text_endpoint(
    document_id: str,
    user=Depends(get_current_user),
):
    """
    Extract text from a user's PDF document.
    """

    try:
        return extract_document_text(
            user_id=user.id,
            document_id=document_id,
        )

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except DocumentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

# =========================================================
# DELETE DOCUMENT
# =========================================================

@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document_endpoint(
    document_id: str,
    user=Depends(get_current_user),
):
    """
    Delete a document after verifying ownership.
    """

    try:
        delete_document(
            user_id=user.id,
            document_id=document_id,
        )

        return None

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except DocumentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

@router.post("/documents/{document_id}/extract")
async def extract_document_text_endpoint(
    document_id: str,
    user=Depends(get_current_user),
):
    """
    Extract text from a user's PDF document.
    """

    try:
        return extract_document_text(
            user_id=user.id,
            document_id=document_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract document text: {str(exc)}",
        )

# =========================================================
# CLASSIFY DOCUMENT
# =========================================================

@router.post("/{document_id}/classify")
async def classify_document_endpoint(
    document_id: str,
    user=Depends(get_current_user),
):
    """
    Classify an uploaded document using its extracted text.
    """

    try:
        document = get_document(
            user_id=user.id,
            document_id=document_id,
        )

        # Only extracted text can be classified.
        extracted_response = (
            supabase
            .table("document_extracted_data")
            .select("raw_text")
            .eq("document_id", document_id)
            .maybe_single()
            .execute()
        )

        if not extracted_response or not extracted_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Extracted document text not found.",
            )

        raw_text = extracted_response.data.get("raw_text")

        if not raw_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document does not contain extracted text.",
            )

        document_type, confidence, matched_keywords = (
            classify_document(raw_text)
        )

        if not document_type:
            return {
                "document_id": document_id,
                "document_type": None,
                "confidence_score": confidence,
                "matched_keywords": {},
                "message": "Unable to classify document.",
            }

        return {
            "document_id": document_id,
            "document_type": document_type,
            "confidence_score": confidence,
            "matched_keywords": matched_keywords.get(
                document_type,
                [],
            ),
        }

    except HTTPException:
        raise

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except DocumentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to classify document: {str(exc)}",
        )

# =========================================================
# GET DOCUMENT
# IMPORTANT: Dynamic route LAST
# =========================================================

@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
async def get_document_endpoint(
    document_id: str,
    user=Depends(get_current_user),
):
    """
    Return metadata for one document after verifying ownership.
    """

    try:
        return get_document(
            user_id=user.id,
            document_id=document_id,
        )

    except UserProfileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except DocumentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document: {str(exc)}",
        )

