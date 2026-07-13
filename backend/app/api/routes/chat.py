"""Chat / RAG endpoints: question answering, summary, quiz."""
from typing import Callable, TypeVar

from fastapi import APIRouter, HTTPException

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    QuizResponse,
    SummaryRequest,
)
from app.services import rag

router = APIRouter(tags=["chat"])

T = TypeVar("T")


def _guard(fn: Callable[[], T]) -> T:
    """Run a generation call, turning Gemini quota errors into a clear 503."""
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001 — inspect provider errors by message
        msg = str(exc)
        if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
            raise HTTPException(
                status_code=503,
                detail="AI request quota exceeded. The Gemini free tier is "
                "limited (about 20 requests/day for this model). Please wait a "
                "while or use a paid API key.",
            ) from exc
        raise


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Ask a question over one or all documents (Retrieval + Generation)."""
    return _guard(
        lambda: rag.answer_question(
            request.question,
            document_id=request.document_id,
            params=request.params,
            language=request.language,
        )
    )


@router.post("/summary", response_model=ChatResponse)
async def summarize(request: SummaryRequest) -> ChatResponse:
    """Summarize a document (UI: "Summarize Document")."""
    return _guard(
        lambda: rag.summarize(request.document_id, request.params, request.language)
    )


@router.post("/quiz", response_model=QuizResponse)
async def quiz(request: SummaryRequest) -> QuizResponse:
    """Generate a multiple-choice quiz (UI: "Generate Quiz")."""
    return _guard(
        lambda: rag.generate_quiz(
            request.document_id, request.params, request.language
        )
    )
