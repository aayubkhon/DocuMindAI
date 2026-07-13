"""DocuMind_AI — FastAPI application entrypoint (API Gateway)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, documents
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    description="AI-powered document intelligence: upload PDFs, chat, summarize, quiz.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Also allow any of this project's Vercel domains (production + previews).
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}
