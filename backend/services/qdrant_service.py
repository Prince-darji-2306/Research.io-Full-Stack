import asyncio
import uuid
import logging
from qdrant_client import AsyncQdrantClient, models
from functools import lru_cache
from core.config import settings
from services.embeddings import embed_texts, embed_query

logger = logging.getLogger(__name__)

VECTOR_SIZE = 768  # BAAI/bge-base-en-v1.5
GLOBAL_COLLECTION = "Research_pdfs"


@lru_cache(maxsize=1)
def get_qdrant_client() -> AsyncQdrantClient:
    return AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)


async def init_qdrant():
    """Ensure the global Research_pdfs collection exists and has necessary indices."""
    client = get_qdrant_client()
    logger.info(f"Checking Qdrant collection: {GLOBAL_COLLECTION}")

    existing = [c.name for c in (await client.get_collections()).collections]
    if GLOBAL_COLLECTION not in existing:
        logger.info(f"Creating global collection: {GLOBAL_COLLECTION}")
        await client.create_collection(
            collection_name=GLOBAL_COLLECTION,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )
    else:
        try:
            col_info = await client.get_collection(GLOBAL_COLLECTION)
            if col_info.config.params.vectors.size != VECTOR_SIZE:
                logger.warning(f"Vector size mismatch (expected {VECTOR_SIZE}). Recreating collection {GLOBAL_COLLECTION}...")
                await client.delete_collection(GLOBAL_COLLECTION)
                await client.create_collection(
                    collection_name=GLOBAL_COLLECTION,
                    vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
                )
        except Exception as e:
            logger.warning(f"Could not verify collection vector size: {e}")

    try:
        logger.info(f"Ensuring payload index for 'pdf_id' in {GLOBAL_COLLECTION}")
        await client.create_payload_index(
            collection_name=GLOBAL_COLLECTION,
            field_name="pdf_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
    except Exception:
        pass

    logger.info(f"Qdrant initialization complete for '{GLOBAL_COLLECTION}'.")


async def ensure_global_collection():
    await init_qdrant()


def _build_points(pdf_id: str, batch_chunks: list[dict], embeddings: list[list[float]]) -> list[models.PointStruct]:
    return [
        models.PointStruct(
            id=str(uuid.uuid4()),
            vector=embeddings[i],
            payload={
                "text": batch_chunks[i]["text"],
                "pdf_id": pdf_id,
                "page_number": batch_chunks[i]["metadata"]["page_number"],
                "chunk_id": batch_chunks[i]["metadata"].get("chunk_id", i),
            },
        )
        for i in range(len(batch_chunks))
    ]


async def store_chunks(pdf_id: str, chunks: list[dict]):
    """
    Store document chunks with OVERLAPPED PIPELINE:
    - Embed batch N -> build points -> start upsert batch N
    - While upsert batch N is in flight, embed batch N+1
    - This minimizes latency by overlapping Qdrant I/O with HF API calls
    """
    await ensure_global_collection()
    client = get_qdrant_client()
    batch_size = settings.EMBED_BATCH_SIZE

    if not chunks:
        return

    logger.info(f"[paper={pdf_id}] Storing {len(chunks)} chunks with overlapped pipeline (batch={batch_size})...")

    prev_upsert = None

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        texts = [c["text"] for c in batch]

        # Embed current batch (I/O via thread pool)
        embeddings = await embed_texts(texts)

        # Build Qdrant points
        logger.info(f"[paper={pdf_id}]  Embedding batch {i // batch_size + 1}/{(len(chunks) + batch_size - 1) // batch_size} ({len(batch)} chunks)...")

        points = _build_points(pdf_id, batch, embeddings)

        # Start upsert for current batch (async I/O, non-blocking)
        current_upsert = asyncio.create_task(
            client.upsert(collection_name=GLOBAL_COLLECTION, points=points)
        )

        # Wait for previous upsert — it was running while we embedded this batch
        if prev_upsert is not None:
            await prev_upsert

        prev_upsert = current_upsert

    # Wait for final upsert
    if prev_upsert is not None:
        await prev_upsert

    logger.info(f"[paper={pdf_id}] All {len(chunks)} chunks stored successfully in Qdrant.")


async def similarity_search(pdf_id: str, query: str, top_k: int = 25) -> list[dict]:
    """Search Qdrant for relevant chunks, filtered by pdf_id."""
    client = get_qdrant_client()

    query_vector = await embed_query(query)
    response = await client.query_points(
        collection_name=GLOBAL_COLLECTION,
        query=query_vector,
        limit=top_k,
        with_payload=True,
        query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="pdf_id",
                    match=models.MatchValue(value=pdf_id),
                )
            ]
        ),
    )

    return [
        {
            "text": r.payload.get("text", ""),
            "page": r.payload.get("page_number", 0),
            "score": r.score,
        }
        for r in response.points
    ]


async def delete_pdf_chunks(pdf_id: str):
    """Delete all chunks for a specific pdf_id from the global collection."""
    client = get_qdrant_client()
    await client.delete(
        collection_name=GLOBAL_COLLECTION,
        points_selector=models.Filter(
            must=[
                models.FieldCondition(
                    key="pdf_id",
                    match=models.MatchValue(value=pdf_id),
                )
            ]
        ),
    )
