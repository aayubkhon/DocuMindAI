# DocuMind_AI — Backend (FastAPI)

RAG API gateway: upload PDFs, chat over them, summarize, and generate quizzes.
Uses **LangChain** as orchestrator, **Google Gemini** for LLM + embeddings,
and **Pinecone** as the managed vector store.

## Architecture

```
Upload PDF ─▶ Extract text (pypdf) ─▶ Chunk ─▶ Embed (Gemini) ─▶ Pinecone
Question   ─▶ Embed ─▶ Similarity search (Pinecone) ─▶ Context ─▶ Gemini ─▶ Answer + citations
```

## Prerequisites

1. **Python 3.11+** (API-only stack — no native ML wheels required).
2. A **Google Gemini API key** — https://aistudio.google.com/app/apikey
3. A **Pinecone API key** — https://app.pinecone.io (free starter tier works).

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in GOOGLE_API_KEY and PINECONE_API_KEY
uvicorn app.main:app --reload # http://localhost:8000
```

The Pinecone index is created automatically on first use (dimension 3072,
cosine metric) if it does not already exist.

Interactive API docs: http://localhost:8000/docs

## Endpoints

| Method | Path                     | Description                       |
|--------|--------------------------|-----------------------------------|
| GET    | `/health`                | Health check                      |
| POST   | `/api/documents`         | Upload & index a PDF              |
| GET    | `/api/documents`         | List indexed documents            |
| GET    | `/api/documents/{id}`    | Get one document's metadata       |
| DELETE | `/api/documents/{id}`    | Delete a document + its vectors   |
| POST   | `/api/chat`              | Ask a question (RAG)              |
| POST   | `/api/summary`           | Summarize a document              |
| POST   | `/api/quiz`              | Generate a quiz from a document   |

## Project layout

```
app/
├── main.py            # FastAPI app + CORS + routers
├── config.py          # Settings from .env
├── api/routes/        # documents.py, chat.py
├── services/          # pdf, chunking, llm (Gemini), vectorstore (Pinecone), registry, rag
└── schemas/           # Pydantic models
```
