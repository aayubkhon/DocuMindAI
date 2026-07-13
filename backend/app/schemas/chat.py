"""Pydantic schemas for chat, retrieval, summary and quiz."""
from pydantic import BaseModel, Field


class GenerationParams(BaseModel):
    """Maps to the UI sliders: Response Precision & Creative Freedom."""

    temperature: float = Field(0.3, ge=0.0, le=1.0)
    top_k: int = Field(4, ge=1, le=20, description="Number of chunks to retrieve.")


class ChatRequest(BaseModel):
    question: str
    document_id: str | None = Field(
        None, description="Limit retrieval to a single document; None = all documents."
    )
    params: GenerationParams = GenerationParams()


class SourceChunk(BaseModel):
    document_id: str
    filename: str
    page: int | None = None
    snippet: str
    score: float | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk] = []


class SummaryRequest(BaseModel):
    document_id: str
    params: GenerationParams = GenerationParams()


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
