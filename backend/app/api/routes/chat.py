"""Chat / RAG endpoints: question answering, summary, quiz."""
from fastapi import APIRouter

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    QuizResponse,
    SummaryRequest,
)
from app.services import rag

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Ask a question over one or all documents (Retrieval + Generation)."""
    return rag.answer_question(
        request.question,
        document_id=request.document_id,
        params=request.params,
        language=request.language,
    )


@router.post("/summary", response_model=ChatResponse)
async def summarize(request: SummaryRequest) -> ChatResponse:
    """Summarize a document (UI: "Summarize Document")."""
    return rag.summarize(request.document_id, request.params, request.language)


@router.post("/quiz", response_model=QuizResponse)
async def quiz(request: SummaryRequest) -> QuizResponse:
    """Generate a multiple-choice quiz (UI: "Generate Quiz")."""
    return rag.generate_quiz(request.document_id, request.params, request.language)
