"""
Papers router — upload, select, SSE stream, get meta, serve PDF.
"""
import asyncio
import json
import uuid
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from core.config import settings
from core.database import get_pool
from core.sse import SSE_HEADERS, sse_event
from models.paper import insert_paper, get_paper
from schemas.paper import CreateSessionReq, SelectPaperReq
from services.pdf_processor import process_pdf_file, process_pdf_file_progress, download_pdf_from_url
from services.cloudinary_service import upload_pdf_to_cloudinary
from utils.file_utils import pdf_path, save_pdf

router = APIRouter(prefix="/api/papers", tags=["papers"])


# ── Session (Conversation) ────────────────────────────────────────────────────


@router.post("/session")
async def create_session(req: CreateSessionReq):
    sid = str(uuid.uuid4())
    return {"session_id": sid}


# ── Upload PDF ────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_paper(session_id: str, file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted.")

    pdf_bytes = await file.read()
    paper_id = str(uuid.uuid4())

    await process_pdf_file(paper_id, pdf_bytes)
    save_pdf(paper_id, pdf_bytes)

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "INSERT INTO papers (id, title, source_url) VALUES ($1, $2, $3)",
                paper_id, file.filename.replace(".pdf", ""), "local",
            )

    # Fire and forget Cloudinary upload
    asyncio.create_task(upload_pdf_to_cloudinary(paper_id, str(pdf_path(paper_id)), file.filename))

    return {"paper_id": paper_id, "title": file.filename.replace(".pdf", "")}


# ── Select from URL ───────────────────────────────────────────────────────────

@router.post("/select")
async def select_paper(req: SelectPaperReq):
    """Legacy endpoint — no progress streaming."""
    pdf_bytes = await download_pdf_from_url(req.pdf_url)
    paper_id = str(uuid.uuid4())

    await process_pdf_file(paper_id, pdf_bytes)
    save_pdf(paper_id, pdf_bytes)

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "INSERT INTO papers (id, title, source_url) VALUES ($1, $2, $3)",
                paper_id, req.title, req.pdf_url,
            )

    # Fire and forget Cloudinary upload
    filename = f"{req.title}.pdf"
    asyncio.create_task(upload_pdf_to_cloudinary(paper_id, str(pdf_path(paper_id)), filename))

    return {"paper_id": paper_id, "title": req.title}


async def _select_paper_stream_generator(req: SelectPaperReq) -> AsyncGenerator[str, None]:
    """SSE generator that streams paper processing progress stages."""
    import logging
    logger = logging.getLogger(__name__)

    # Stage: Downloading PDF
    logger.info(f"[paper_select] Stage: Downloading PDF from {req.pdf_url}")
    yield sse_event({
        "type": "paper_progress",
        "stage": "downloading",
        "label": "Downloading PDF",
    })
    pdf_bytes = await download_pdf_from_url(req.pdf_url)

    paper_id = str(uuid.uuid4())

    # Stage: Parsing + Splitting + Embedding + Storing (with their own sub-progress)
    async for progress_event in process_pdf_file_progress(paper_id, pdf_bytes):
        yield sse_event(progress_event)

    # Save PDF locally
    save_pdf(paper_id, pdf_bytes)

    # Insert into database
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "INSERT INTO papers (id, title, source_url) VALUES ($1, $2, $3)",
                paper_id, req.title, req.pdf_url,
            )

    # Fire and forget Cloudinary upload
    filename = f"{req.title}.pdf"
    asyncio.create_task(upload_pdf_to_cloudinary(paper_id, str(pdf_path(paper_id)), filename))

    # Final result
    logger.info(f"[paper_select] Complete — paper_id={paper_id}, title={req.title}")
    yield sse_event({
        "type": "paper_result",
        "paper_id": paper_id,
        "title": req.title,
    })


@router.post("/select/stream")
async def select_paper_stream(req: SelectPaperReq):
    """SSE endpoint that streams paper processing progress."""
    if not req.pdf_url.strip():
        raise HTTPException(400, "PDF URL cannot be empty.")

    return StreamingResponse(
        _select_paper_stream_generator(req),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


# ── Get paper metadata ────────────────────────────────────────────────────────

@router.get("/{paper_id}")
async def get_paper_meta(paper_id: str):
    pool = get_pool()
    async with pool.acquire() as conn:
        paper = await get_paper(conn, paper_id)
        if not paper:
            raise HTTPException(404, "Paper not found")

    return {
        "id": paper["id"],
        "title": paper["title"],
        "source_url": paper.get("source_url"),
        "storage_url": paper.get("storage_url"),
        "images": [],
    }


# ── Serve PDF ─────────────────────────────────────────────────────────────────

@router.get("/{paper_id}/pdf")
async def serve_pdf(paper_id: str):
    p = pdf_path(paper_id)
    if not p.exists():
        raise HTTPException(404, "PDF file not found")
    return FileResponse(
        path=str(p),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={paper_id}.pdf"},
    )