"""Pydantic schemas for documents."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

DocumentStatus = Literal["processing", "ready", "failed"]


class DocumentMeta(BaseModel):
    id: str
    filename: str
    size_bytes: int
    num_chunks: int
    uploaded_at: datetime
    status: DocumentStatus = "ready"
    error: str | None = None


class UploadResponse(BaseModel):
    document: DocumentMeta
    message: str = "Document received; indexing in the background."
