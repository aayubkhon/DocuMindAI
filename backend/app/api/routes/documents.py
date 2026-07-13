"""Document CRUD + upload endpoints (UI: "Document Library (CRUD)")."""
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.schemas.document import DocumentMeta, UploadResponse
from app.services import registry
from app.services.rag import delete_document, ingest_pdf

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=UploadResponse, status_code=201)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()
    if len(contents) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413, detail=f"File exceeds {settings.max_upload_mb} MB limit."
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = upload_dir / f"{uuid.uuid4().hex}_{file.filename}"
    tmp_path.write_bytes(contents)

    try:
        meta = ingest_pdf(tmp_path, file.filename)
    except ValueError as exc:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return UploadResponse(document=meta)


@router.get("", response_model=list[DocumentMeta])
async def list_documents() -> list[DocumentMeta]:
    return registry.list_all()


@router.get("/{document_id}", response_model=DocumentMeta)
async def get_document(document_id: str) -> DocumentMeta:
    meta = registry.get(document_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Document not found.")
    return meta


@router.delete("/{document_id}", status_code=204)
async def remove_document(document_id: str) -> None:
    if not delete_document(document_id):
        raise HTTPException(status_code=404, detail="Document not found.")
