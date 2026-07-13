"""LLM and embedding models, switchable by provider.

- Cloud (deploy-friendly): Groq for the LLM, Gemini for embeddings.
- Local (free, unlimited): Ollama for both.

Set LLM_PROVIDER / EMBED_PROVIDER in the environment.
"""
from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from app.config import settings


@lru_cache
def get_embeddings() -> Embeddings:
    if settings.embed_provider == "ollama":
        from langchain_ollama import OllamaEmbeddings

        return OllamaEmbeddings(
            model=settings.ollama_embed_model, base_url=settings.ollama_base_url
        )
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    return GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embed_model, google_api_key=settings.google_api_key
    )


def get_llm(temperature: float | None = None) -> BaseChatModel:
    temp = settings.temperature if temperature is None else temperature
    if settings.llm_provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=settings.ollama_llm_model,
            base_url=settings.ollama_base_url,
            temperature=temp,
        )
    from langchain_groq import ChatGroq

    return ChatGroq(
        model=settings.groq_llm_model,
        api_key=settings.groq_api_key,
        temperature=temp,
    )
