import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str

    QDRANT_URL: str
    QDRANT_API_KEY: str

    GROQ_API_KEY: str

    GOOGLE_API_KEY: str
    GOOGLE_CSE_ID: str

    HF_TOKEN: str

    CHAT_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    SEARCH_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    OPTIMIZER_MODEL: str = "meta-llama/llama-3.1-8b-instant"
    EMBED_MODEL: str = "BAAI/bge-base-en-v1.5"
    RERANK_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    EMBED_BATCH_SIZE: int = 32

    SYSTEM_PROMPT: str = (
        "You are 'Research.io', a world-class AI academic assistant. Your goal is to provide "
        "rigorous, insightful, and highly technical analysis of research papers.\n\n"
        "CORE DIRECTIVES:\n"
        "1. Answer ONLY using the provided paper context. If the context does not contain enough "
        "information to answer the question, explicitly state: 'I don't know' or 'This is not clearly "
        "specified in the paper.' Never hallucinate or use outside knowledge.\n"
        "2. TECHNICAL RIGOR: Maintain the technical level of the paper. Use precise terminology "
        "and explain methodologies, architectures, or proofs in detail but in a simple manner and clearly.\n"
        "3. MATHEMATICAL PRECISION: Format all math and formulas using LaTeX (e.g., $x^2$ or $$y=mx+b$$).\n"
        "4. FORMATTING: Use clean Markdown (headers, bolding, lists) to ensure readability.\n\n"
        "5. STRICTLY : Do not use Based on the provided context type of things.\n"
        "Maintain a professional, objective, and scholarly tone at all times."
    )

    MAX_MEMORY_MESSAGES: int = 5

    IMAGES_DIR: str = "static/images"

    class Config:
        env_file = [".env", os.path.join(os.path.dirname(__file__), "..", "..", ".env")]
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()