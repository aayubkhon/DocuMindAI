"""Pinecone vector store wrapper (managed, serverless-friendly).

Holds the "Vektorli Ma'lumotlar Bazasi" from the architecture diagram. Each
chunk is stored with a deterministic id ("{document_id}-{index}") so a document
can be deleted without needing delete-by-metadata (unsupported on serverless).
"""
import time
from functools import lru_cache

from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

from app.config import settings
from app.services.llm import get_embeddings


@lru_cache
def _client() -> Pinecone:
    return Pinecone(api_key=settings.pinecone_api_key)


def _ensure_index(pc: Pinecone) -> None:
    """Create the serverless index if missing and wait until it is ready."""
    if settings.pinecone_index in pc.list_indexes().names():
        return
    pc.create_index(
        name=settings.pinecone_index,
        dimension=settings.embed_dimension,
        metric="cosine",
        spec=ServerlessSpec(
            cloud=settings.pinecone_cloud, region=settings.pinecone_region
        ),
    )
    # Index creation is asynchronous; block until it can accept writes.
    for _ in range(30):
        if pc.describe_index(settings.pinecone_index).status.get("ready"):
            return
        time.sleep(1)


@lru_cache
def get_vectorstore() -> PineconeVectorStore:
    pc = _client()
    _ensure_index(pc)
    return PineconeVectorStore(
        index=pc.Index(settings.pinecone_index), embedding=get_embeddings()
    )


def _chunk_ids(document_id: str, count: int) -> list[str]:
    return [f"{document_id}-{i}" for i in range(count)]


_SUBBATCH = 64  # chunks embedded+committed per step (keeps progress if we stop)


def add_documents(documents: list[Document], *, document_id: str) -> int:
    """Embed and store chunks in sub-batches (local Ollama has no rate limit).

    If a sub-batch fails, chunks already stored for this document are removed to
    avoid orphaned vectors.
    """
    if not documents:
        return 0
    vs = get_vectorstore()
    ids = _chunk_ids(document_id, len(documents))
    added = 0
    try:
        for start in range(0, len(documents), _SUBBATCH):
            end = min(start + _SUBBATCH, len(documents))
            vs.add_documents(documents[start:end], ids=ids[start:end])
            added = end
    except Exception:
        if added:
            vs.delete(ids=ids[:added])
        raise
    return len(documents)


def delete_document(document_id: str, *, num_chunks: int) -> None:
    """Remove every chunk belonging to a document by its deterministic ids."""
    if num_chunks > 0:
        get_vectorstore().delete(ids=_chunk_ids(document_id, num_chunks))


def similarity_search(
    query: str, *, k: int, document_id: str | None = None
) -> list[tuple[Document, float]]:
    """Retrieval pipeline: return top-k chunks with similarity scores."""
    where = {"document_id": document_id} if document_id else None
    return get_vectorstore().similarity_search_with_score(query, k=k, filter=where)
