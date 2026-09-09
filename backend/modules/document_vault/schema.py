from datetime import datetime
from typing import Optional
from typing_extensions import Literal

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: str
    document_type: str
    original_filename: str
    storage_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    processing_status: Optional[str] = None
    expires_at: Optional[datetime] = None
    uploaded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Computed by the backend
    is_expired: bool = False

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int

class DocumentStatusUpdate(BaseModel):
    processing_status: Literal[
        "pending",
        "processing",
        "completed",
        "failed",
    ]