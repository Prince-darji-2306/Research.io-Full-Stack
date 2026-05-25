import asyncio
import logging
import numpy as np
from functools import lru_cache
from huggingface_hub import InferenceClient
from sentence_transformers import CrossEncoder
from core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_hf_client() -> InferenceClient:
    return InferenceClient(provider="auto", api_key=settings.HF_TOKEN)


@lru_cache(maxsize=1)
def get_reranker_model() -> CrossEncoder:
    return CrossEncoder(settings.RERANK_MODEL)


def _feature_extraction(texts: list[str]) -> list:
    """Synchronous HF Inference API call."""
    client = get_hf_client()
    return client.feature_extraction(texts, model=settings.EMBED_MODEL)


def embed_texts_sync(texts: list[str]) -> list[list[float]]:
    """
    Synchronous batch embedding via HuggingFace Inference API.
    Used by tools that run in sync contexts (e.g. LangChain agent tools).
    """
    batch_size = settings.EMBED_BATCH_SIZE
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        logger.info(f"Embedding batch of {len(batch)} texts via HF Inference API...")
        result = _feature_extraction(batch)

        for emb in result:
            arr = np.array(emb).squeeze()
            all_embeddings.append(arr.tolist())

    logger.info(f"Finished embedding {len(all_embeddings)} vectors.")
    return all_embeddings


def embed_query_sync(query: str) -> list[float]:
    """Synchronous single-query embedding."""
    result = _feature_extraction([query])
    arr = np.array(result[0]).squeeze()
    return arr.tolist()


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Async batch embedding via HuggingFace Inference API.
    Runs the sync InferenceClient in a thread pool to avoid blocking the event loop.
    Returns list of 768-dim float vectors.
    """
    return await asyncio.to_thread(embed_texts_sync, texts)


async def embed_query(query: str) -> list[float]:
    """
    Async single-query embedding via HuggingFace Inference API.
    """
    return await asyncio.to_thread(embed_query_sync, query)
