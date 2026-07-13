"""Application configuration loaded from environment variables (.env)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "DocuMind_AI"
    api_prefix: str = "/api"

    # CORS — frontend origins (JSON array; set to your Vercel URL in production)
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Providers. Cloud (groq + gemini) is deploy-friendly; ollama is free & local.
    llm_provider: str = "groq"  # "groq" | "ollama"
    embed_provider: str = "gemini"  # "gemini" | "ollama"

    # Groq (cloud LLM — generous free tier)
    groq_api_key: str = ""
    groq_llm_model: str = "llama-3.3-70b-versatile"

    # Google Gemini (cloud embeddings)
    google_api_key: str = ""
    gemini_embed_model: str = "models/gemini-embedding-001"

    # Ollama (local LLM + embeddings — free, unlimited, private)
    ollama_base_url: str = "http://localhost:11434"
    ollama_llm_model: str = "qwen2.5:7b"
    ollama_embed_model: str = "nomic-embed-text"

    # Must match the active embedder: gemini-embedding-001 = 3072, nomic = 768.
    embed_dimension: int = 3072

    # Pinecone vector store
    pinecone_api_key: str = ""
    pinecone_index: str = "documind"
    pinecone_cloud: str = "aws"
    pinecone_region: str = "us-east-1"

    # File uploads
    upload_dir: str = str(BASE_DIR / "uploads")
    max_upload_mb: int = 25

    # RAG / chunking parameters. Chunks are kept fairly large so a typical book
    # stays under the Gemini free-tier embedding quota (100 requests/min).
    chunk_size: int = 3500
    chunk_overlap: int = 300
    retrieval_k: int = 4

    # Generation parameters (defaults; overridable per request)
    temperature: float = 0.3


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
