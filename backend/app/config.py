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

    # CORS — frontend origins
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Google Gemini (LLM + embeddings)
    google_api_key: str = ""
    gemini_llm_model: str = "gemini-2.5-flash"
    gemini_embed_model: str = "models/gemini-embedding-001"
    embed_dimension: int = 3072  # gemini-embedding-001 default output size

    # Pinecone vector store
    pinecone_api_key: str = ""
    pinecone_index: str = "documind-ai"
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
