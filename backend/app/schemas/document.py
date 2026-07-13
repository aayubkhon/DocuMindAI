"""Pydantic schemas for documents."""
from datetime import datetime

from pydantic import BaseModel


class DocumentMeta(BaseModel):
    id: str
    filename: str
    size_bytes: int
    num_chunks: int
    uploaded_at: datetime


class UploadResponse(BaseModel):
    document: DocumentMeta
    message: str = "Document processed and indexed."
