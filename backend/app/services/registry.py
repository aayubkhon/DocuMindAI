"""Lightweight JSON-backed registry of uploaded documents (for CRUD list/delete).

Vectors live in Chroma; this just tracks document-level metadata shown in the
UI "Document Library (CRUD)" panel.
"""
import json
import threading
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings
from app.schemas.document import DocumentMeta, DocumentStatus

_REGISTRY_PATH = Path(settings.upload_dir) / "registry.json"
_lock = threading.Lock()


def _load() -> dict[str, dict]:
    if not _REGISTRY_PATH.exists():
        return {}
    with _REGISTRY_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save(data: dict[str, dict]) -> None:
    _REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _REGISTRY_PATH.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, default=str)


def add(
    document_id: str,
    filename: str,
    size_bytes: int,
    num_chunks: int,
    status: DocumentStatus = "ready",
) -> DocumentMeta:
    with _lock:
        data = _load()
        meta = DocumentMeta(
            id=document_id,
            filename=filename,
            size_bytes=size_bytes,
            num_chunks=num_chunks,
            uploaded_at=datetime.now(timezone.utc),
            status=status,
        )
        data[document_id] = json.loads(meta.model_dump_json())
        _save(data)
        return meta


def set_status(
    document_id: str, status: DocumentStatus, error: str | None = None
) -> None:
    with _lock:
        data = _load()
        if document_id in data:
            data[document_id]["status"] = status
            data[document_id]["error"] = error
            _save(data)


def list_all() -> list[DocumentMeta]:
    data = _load()
    items = [DocumentMeta(**v) for v in data.values()]
    return sorted(items, key=lambda d: d.uploaded_at, reverse=True)


def get(document_id: str) -> DocumentMeta | None:
    data = _load()
    raw = data.get(document_id)
    return DocumentMeta(**raw) if raw else None


def remove(document_id: str) -> bool:
    with _lock:
        data = _load()
        if document_id not in data:
            return False
        del data[document_id]
        _save(data)
        return True
