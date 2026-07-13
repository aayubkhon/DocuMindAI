"""RAG orchestrator (the "Orkestrator (LangChain)" box in the diagram).

Ties together preprocessing (PDF -> chunks -> vectors) and retrieval
(question -> search -> context -> LLM -> answer).
"""
import json
import re
import uuid
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.schemas.chat import (
    ChatResponse,
    GenerationParams,
    QuizQuestion,
    QuizResponse,
    SourceChunk,
)
from app.schemas.document import DocumentMeta
from app.services import registry, vectorstore
from app.services.chunking import chunk_pages
from app.services.llm import get_llm
from app.services.pdf_service import extract_pages

# How each UI language should be described to the model (including script).
_LANGUAGE_NAMES = {
    "en": "English",
    "uz-latn": "Uzbek written in the Latin alphabet (lotin)",
    "uz-cyrl": "Uzbek written in the Cyrillic alphabet (kirill)",
    "ru": "Russian",
    "ko": "Korean",
}


def _language_name(code: str) -> str:
    return _LANGUAGE_NAMES.get(code, "English")


_ANSWER_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are DocuMind_AI, a document analysis assistant. Answer the "
            "user's question using ONLY the provided context. Cite the page "
            "number for each fact like (Page 3). If the answer is not in the "
            "context, say you could not find it in the document.\n"
            "CRITICAL LANGUAGE RULE: Write your ENTIRE reply in {language}. The "
            "document and the question may be in another language — you must "
            "still translate and respond only in {language}. Do not mix languages.",
        ),
        (
            "human",
            "Context:\n{context}\n\nQuestion: {question}\n\n"
            "(Reminder: respond entirely in {language}.)",
        ),
    ]
)

_SUMMARY_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are DocuMind_AI. Produce a concise bullet-point summary of the "
            "document context. Cite page numbers like (Page 3) where relevant.\n"
            "CRITICAL: Write the ENTIRE summary in {language}, translating from "
            "the document's language if needed. Do not mix languages.",
        ),
        ("human", "Document context:\n{context}\n\nWrite the summary:"),
    ]
)

_QUIZ_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are DocuMind_AI. Create a multiple-choice quiz from the context. "
            "Return ONLY valid JSON: a list of objects with keys "
            '"question", "options" (4 strings), and "answer" (one of the options). '
            "No markdown, no extra text. "
            "Write the question and all options in {language}.",
        ),
        ("human", "Context:\n{context}\n\nGenerate {n} quiz questions as JSON:"),
    ]
)


def _format_context(results) -> tuple[str, list[SourceChunk]]:
    context_parts: list[str] = []
    sources: list[SourceChunk] = []
    for doc, score in results:
        page = doc.metadata.get("page")
        # Pinecone stores numbers as floats; present pages as plain integers.
        page = int(page) if page is not None else None
        context_parts.append(f"[Page {page}] {doc.page_content}")
        sources.append(
            SourceChunk(
                document_id=doc.metadata.get("document_id", ""),
                filename=doc.metadata.get("filename", ""),
                page=page,
                snippet=doc.page_content[:240],
                score=round(score, 4) if score is not None else None,
            )
        )
    return "\n\n".join(context_parts), sources


def prepare_document(
    file_path: str | Path, filename: str
) -> tuple[DocumentMeta, list[Document]]:
    """Fast phase: PDF -> pages -> chunks, registered as 'processing'.

    Returns the chunks so the caller can embed them in the background.
    """
    document_id = uuid.uuid4().hex
    pages = extract_pages(file_path)
    if not pages:
        raise ValueError("No extractable text found in the PDF.")

    chunks = chunk_pages(pages, document_id=document_id, filename=filename)
    size_bytes = Path(file_path).stat().st_size
    meta = registry.add(
        document_id, filename, size_bytes, len(chunks), status="processing"
    )
    return meta, chunks


def embed_document(document_id: str, chunks: list[Document]) -> None:
    """Background phase: embed + store chunks, then mark the document ready."""
    try:
        vectorstore.add_documents(chunks, document_id=document_id)
        registry.set_status(document_id, "ready")
    except vectorstore.EmbeddingQuotaError:
        registry.set_status(
            document_id,
            "failed",
            "Embedding quota exceeded (Gemini free tier allows 100/min). "
            "Please try again in a minute.",
        )
    except Exception as exc:  # noqa: BLE001 — record any failure for the UI
        registry.set_status(document_id, "failed", str(exc)[:200])


def answer_question(
    question: str,
    *,
    document_id: str | None,
    params: GenerationParams,
    language: str = "en",
) -> ChatResponse:
    """Retrieval pipeline + generation."""
    results = vectorstore.similarity_search(
        question, k=params.top_k, document_id=document_id
    )
    if not results:
        return ChatResponse(
            answer="No indexed documents matched your question yet.", sources=[]
        )

    context, sources = _format_context(results)
    chain = _ANSWER_PROMPT | get_llm(params.temperature) | StrOutputParser()
    answer = chain.invoke(
        {"context": context, "question": question, "language": _language_name(language)}
    )
    return ChatResponse(answer=answer.strip(), sources=sources)


def _document_context(document_id: str, params: GenerationParams) -> str:
    """Grab a broad slice of a document for summary/quiz generation."""
    results = vectorstore.similarity_search(
        "overview summary key points main findings",
        k=max(params.top_k, 8),
        document_id=document_id,
    )
    context, _ = _format_context(results)
    return context


def summarize(
    document_id: str, params: GenerationParams, language: str = "en"
) -> ChatResponse:
    context = _document_context(document_id, params)
    if not context:
        return ChatResponse(answer="Document not found or empty.", sources=[])
    chain = _SUMMARY_PROMPT | get_llm(params.temperature) | StrOutputParser()
    summary = chain.invoke({"context": context, "language": _language_name(language)})
    _, sources = _format_context(
        vectorstore.similarity_search("summary", k=params.top_k, document_id=document_id)
    )
    return ChatResponse(answer=summary.strip(), sources=sources)


def generate_quiz(
    document_id: str, params: GenerationParams, language: str = "en", n: int = 5
) -> QuizResponse:
    context = _document_context(document_id, params)
    chain = _QUIZ_PROMPT | get_llm(params.temperature) | StrOutputParser()
    raw = chain.invoke(
        {"context": context, "n": n, "language": _language_name(language)}
    )

    # LLMs sometimes wrap JSON in prose/markdown; extract the array defensively.
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    payload = match.group(0) if match else raw
    try:
        items = json.loads(payload)
        questions = [QuizQuestion(**item) for item in items]
    except (json.JSONDecodeError, TypeError, ValueError):
        questions = []
    return QuizResponse(questions=questions)


def delete_document(document_id: str) -> bool:
    meta = registry.get(document_id)
    if not meta:
        return False
    vectorstore.delete_document(document_id, num_chunks=meta.num_chunks)
    return registry.remove(document_id)
