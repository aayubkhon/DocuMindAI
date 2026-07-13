"""Pydantic schemas for chat, retrieval, summary and quiz."""
from typing import Literal

from pydantic import BaseModel, Field

# Languages the assistant can respond in (matches the frontend selector).
Language = Literal["en", "uz", "ru", "ko"]


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
    language: Language = "en"


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
    language: Language = "en"


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
