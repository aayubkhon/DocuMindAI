# DocuMind_AI

AI-powered document intelligence platform. Upload PDFs, chat over them with
citations, generate summaries and quizzes — powered by a **RAG** pipeline.

Monorepo: a **FastAPI** (Python) backend + a **Next.js** (TypeScript, SCSS) frontend.

## Architecture

```
┌──────────────┐   upload / ask    ┌────────────────────┐
│  Next.js UI  │ ───────────────▶  │  FastAPI Gateway   │
└──────────────┘  ◀─── answer ──── └─────────┬──────────┘
                                             │
        Indexing:   PDF ─▶ chunk ─▶ embed (Gemini) ─▶ Pinecone
        Retrieval:  question ─▶ search ─▶ context ─▶ Gemini ─▶ answer + citations
```

- **Orchestrator:** LangChain
- **LLM + embeddings:** Google Gemini
- **Vector DB:** Pinecone (managed)

## Structure

```
DocuMind_AI/
├── backend/    # FastAPI RAG API (Python) — see backend/README.md
└── frontend/   # Next.js app (TypeScript, SCSS, App Router)
```

## Quick start

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Python 3.11–3.13
pip install -r requirements.txt
cp .env.example .env                                  # add GOOGLE_API_KEY + PINECONE_API_KEY
uvicorn app.main:app --reload                         # http://localhost:8000  (docs: /docs)
```

### Frontend
```bash
cd frontend
npm install
PORT=3001 npm run dev                                 # http://localhost:3001
```

## Deployment

The frontend deploys to **Vercel** out of the box. Set `NEXT_PUBLIC_API_URL`
to the deployed backend URL in the Vercel project settings.

## License

MIT
