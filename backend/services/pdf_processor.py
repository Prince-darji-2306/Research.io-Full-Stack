import os
import tempfile
import httpx
import logging
from collections.abc import AsyncGenerator

logger = logging.getLogger(__name__)
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from services.qdrant_service import store_chunks


def _split_text(documents, chunk_size: int = 500, chunk_overlap: int = 80) -> list:
    logger.info(f"Splitting {len(documents)} page(s) with chunk_size={chunk_size}, overlap={chunk_overlap}...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    result = splitter.split_documents(documents)
    logger.info(f"Splitting complete → {len(result)} chunks created.")
    return result


async def process_pdf_file_progress(
    paper_id: str,
    pdf_bytes: bytes,
) -> AsyncGenerator[dict, None]:
    """
    Process PDF bytes with progress events: downloading -> splitting -> embedding -> storing.
    Yields progress dicts for SSE streaming.
    """
    # Write to temp file for loaders
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        import asyncio

        # Stage: Parsing PDF
        logger.info(f"[paper={paper_id}] Stage: Parsing PDF pages with PyMuPDF...")
        yield {
            "type": "paper_progress",
            "stage": "parsing_pdf",
            "label": "Parsing PDF pages",
            "paper_id": paper_id,
        }

        def _parse_pdf_sync():
            loader = PyMuPDFLoader(tmp_path)
            documents = loader.load()
            logger.info(f"[paper={paper_id}]  Loaded {len(documents)} page(s) from PDF.")
            chunks = _split_text(documents)
            return [
                {
                    "id": i,
                    "text": c.page_content,
                    "metadata": {
                        "page_number": c.metadata.get("page", 0),
                        "source": c.metadata.get("source", ""),
                        "chunk_id": f"{paper_id}_{i}",
                    },
                }
                for i, c in enumerate(chunks)
            ]

        # Run CPU-bound parsing in a background thread
        chunk_dicts = await asyncio.to_thread(_parse_pdf_sync)
        logger.info(f"[paper={paper_id}]  Stage complete: Parsing → {len(chunk_dicts)} chunks ready.")

        # Stage: Generating embeddings
        logger.info(f"[paper={paper_id}] Stage: Generating embeddings for {len(chunk_dicts)} chunks...")
        yield {
            "type": "paper_progress",
            "stage": "generating_embeddings",
            "label": f"Generating embeddings ({len(chunk_dicts)} chunks)",
            "paper_id": paper_id,
        }

        # Stage: Storing vectors in Qdrant
        logger.info(f"[paper={paper_id}] Stage: Storing embedded chunks in Qdrant...")
        yield {
            "type": "paper_progress",
            "stage": "storing_vectors",
            "label": "Storing vectors in database",
            "paper_id": paper_id,
        }

        await store_chunks(paper_id, chunk_dicts)

        logger.info(f"[paper={paper_id}] Paper processing complete!")
        yield {
            "type": "paper_progress",
            "stage": "complete",
            "label": "Paper ready for use",
            "paper_id": paper_id,
        }

    finally:
        os.unlink(tmp_path)


async def process_pdf_file(
    paper_id: str,
    pdf_bytes: bytes,
) -> list[dict]:
    """
    Legacy method — same logic but no progress yield.
    Process PDF bytes: chunk text -> store in Qdrant
    Returns an empty list for backward compatibility with router signatures.
    """
    # Write to temp file for loaders
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        import asyncio

        logger.info(f"[paper={paper_id}] Processing PDF (legacy mode)...")

        def _parse_pdf_sync():
            loader = PyMuPDFLoader(tmp_path)
            documents = loader.load()
            logger.info(f"[paper={paper_id}] Loaded {len(documents)} page(s).")
            chunks = _split_text(documents)
            return [
                {
                    "id": i,
                    "text": c.page_content,
                    "metadata": {
                        "page_number": c.metadata.get("page", 0),
                        "source": c.metadata.get("source", ""),
                        "chunk_id": f"{paper_id}_{i}",
                    },
                }
                for i, c in enumerate(chunks)
            ]

        chunk_dicts = await asyncio.to_thread(_parse_pdf_sync)
        logger.info(f"[paper={paper_id}] Generated {len(chunk_dicts)} chunks.")

        await store_chunks(paper_id, chunk_dicts)
        logger.info(f"[paper={paper_id}] Processing complete (legacy).")

        return []

    finally:
        os.unlink(tmp_path)


async def download_pdf_from_url(url: str) -> bytes:
    """Download PDF from URL, handling arXiv abs->pdf redirect."""
    logger.info(f"Downloading PDF from: {url}")

    # Handle arXiv abs -> pdf link conversion
    if "arxiv.org/abs/" in url:
        url = url.replace("/abs/", "/pdf/")
    if not url.endswith(".pdf") and "arxiv.org" in url and "/pdf/" not in url:
        pass

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
            r = await client.get(url, headers=headers)
            r.raise_for_status()

            content_type = r.headers.get("content-type", "").lower()
            if "application/pdf" not in content_type and len(r.content) < 1000:
                logger.warning(f"Downloaded content from {url} might not be a PDF (Content-Type: {content_type})")

            logger.info(f"Successfully downloaded PDF ({len(r.content)} bytes)")
            return r.content
        except Exception as e:
            logger.error(f"Failed to download PDF from {url}: {str(e)}")
            raise Exception(f"Could not download PDF: {str(e)}")