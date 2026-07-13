# DocuMind_AI — Backend (FastAPI)

RAG API gateway: upload PDFs, chat over them, summarize, and generate quizzes.
Uses **LangChain** as orchestrator, **Ollama** (local, free, unlimited) for the
LLM + embeddings, and **Pinecone** as the vector store.

## Architecture

```
Upload PDF ─▶ Extract text (pypdf) ─▶ Chunk ─▶ Embed (Ollama) ─▶ Pinecone
Question   ─▶ Embed ─▶ Similarity search (Pinecone) ─▶ Context ─▶ Ollama ─▶ Answer + citations
```

## Prerequisites

1. **Python 3.11–3.13** (API-only stack — no native ML wheels required).
2. **Ollama** — install from https://ollama.com, then pull the models:
   ```bash
   ollama serve                    # keep running (http://localhost:11434)
   ollama pull qwen2.5:7b          # multilingual LLM (uz/ko/ru/en)
   ollama pull nomic-embed-text    # 768-dim embeddings
   ```
3. A **Pinecone API key** — https://app.pinecone.io (free starter tier works).

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in PINECONE_API_KEY
uvicorn app.main:app --reload # http://localhost:8000
```

The Pinecone index is created automatically on first use (dimension 768,
cosine metric) if it does not already exist.

Interactive API docs: http://localhost:8000/docs

## Endpoints

| Method | Path                     | Description                       |
|--------|--------------------------|-----------------------------------|
| GET    | `/health`                | Health check                      |
| POST   | `/api/documents`         | Upload & index a PDF (async)      |
| GET    | `/api/documents`         | List indexed documents            |
| GET    | `/api/documents/{id}`    | Get one document's metadata       |
| DELETE | `/api/documents/{id}`    | Delete a document + its vectors   |
| POST   | `/api/chat`              | Ask a question (RAG)              |
| POST   | `/api/summary`           | Summarize a document              |
| POST   | `/api/quiz`              | Generate a quiz from a document   |

Chat/summary/quiz accept a `language` field: `en`, `uz-latn`, `uz-cyrl`, `ru`, `ko`.

## Project layout

```
app/
├── main.py            # FastAPI app + CORS + routers
├── config.py          # Settings from .env
├── api/routes/        # documents.py, chat.py
├── services/          # pdf, chunking, llm (Ollama), vectorstore (Pinecone), registry, rag
└── schemas/           # Pydantic models
```
