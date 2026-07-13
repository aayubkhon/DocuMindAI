# Deploying DocuMind_AI (free)

The app splits into two free deployments:

| Part      | Host   | Notes                                    |
|-----------|--------|------------------------------------------|
| Frontend  | Vercel | Next.js, free Hobby plan                 |
| Backend   | Render | FastAPI, free web service                |
| LLM       | Groq   | free tier (~14,400 requests/day)         |
| Embeddings| Gemini | free tier (used at upload time)          |
| Vectors   | Pinecone | free Starter tier                      |

> Ollama can't be deployed (it needs a local GPU/RAM). The deployed app uses
> cloud APIs. To run locally with unlimited Ollama instead, set
> `LLM_PROVIDER=ollama` and `EMBED_PROVIDER=ollama` (and `EMBED_DIMENSION=768`,
> `PINECONE_INDEX=documind-ollama`).

## 1. Get the keys (all free)

- **Groq:** https://console.groq.com → API Keys → create key.
- **Gemini:** https://aistudio.google.com/app/apikey
- **Pinecone:** https://app.pinecone.io → API Keys.

## 2. Backend → Render

1. Push this repo to GitHub (already done).
2. https://dashboard.render.com → **New → Blueprint** → select the repo.
   Render reads `render.yaml` and creates the `documind-ai-backend` web service.
3. In the service's **Environment**, set the secrets:
   - `GROQ_API_KEY`, `GOOGLE_API_KEY`, `PINECONE_API_KEY`
   - `CORS_ORIGINS` = `["https://YOUR-APP.vercel.app"]` (fill in after step 3)
4. Deploy. Note the backend URL, e.g. `https://documind-ai-backend.onrender.com`.
   Check `https://…/health` returns `{"status":"ok"}`.

> Free Render services sleep after ~15 min idle and cold-start on the next
> request (~30–60 s). The document list (a local file) resets on restart, but
> vectors stay in Pinecone.

## 3. Frontend → Vercel

1. https://vercel.com → **Add New → Project** → import the repo.
2. Set **Root Directory** = `frontend`.
3. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://documind-ai-backend.onrender.com/api`
4. Deploy. Vercel gives you `https://YOUR-APP.vercel.app`.
5. Go back to Render and put that URL in `CORS_ORIGINS`, then redeploy the backend.

## 4. Verify

Open the Vercel URL, upload a PDF, and chat. First backend request may be slow
(Render cold start).
