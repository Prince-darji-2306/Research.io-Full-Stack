"""
Arena Router
=============
POST /api/arena/upload    — Upload up to 2 PDFs (processed in parallel)
POST /api/arena/debate/stream — SSE stream of the full debate
"""
import asyncio
import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse

from core.config import settings
from core.database import get_pool
from core.sse import SSE_HEADERS, sse_event
from models.paper import get_paper
from models.conversation import get_conversation, update_conversation_papers, insert_conversation
from models.debate import insert_debate_session
from schemas.arena import SelectArenaFromURL, DebateRequest
from services.pdf_processor import process_pdf_file, download_pdf_from_url
from services.debate_agent import run_debate
from services.cloudinary_service import upload_pdf_to_cloudinary
from utils.file_utils import pdf_path, save_pdf

router = APIRouter(prefix="/api/arena", tags=["arena"])


async def _process_single_paper(
    conn,
    pdf_bytes: bytes,
    title: str,
) -> dict:
    """Process a single PDF: embed chunks, store, return paper record."""
    paper_id = str(uuid.uuid4())

    await process_pdf_file(paper_id, pdf_bytes)
    save_pdf(paper_id, pdf_bytes)

    # Insert paper record
    await conn.execute(
        "INSERT INTO papers (id, title, source_url) VALUES ($1, $2, $3)",
        paper_id, title, "local",
    )

    return {
        "paper_id": paper_id,
        "title": title,
    }


# ── Upload 2 PDFs ──────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_arena_papers(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
):
    """Accept 2 PDFs and process them in parallel."""
    if not file_a.filename.endswith(".pdf") or not file_b.filename.endswith(".pdf"):
        raise HTTPException(400, "Both files must be PDFs.")

    bytes_a, bytes_b = await asyncio.gather(
        file_a.read(),
        file_b.read(),
    )

    title_a = file_a.filename.replace(".pdf", "")
    title_b = file_b.filename.replace(".pdf", "")

    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            paper_a, paper_b = await asyncio.gather(
                _process_single_paper(conn, bytes_a, title_a),
                _process_single_paper(conn, bytes_b, title_b),
            )

    # Fire and forget Cloudinary uploads
    asyncio.create_task(upload_pdf_to_cloudinary(paper_a["paper_id"], str(pdf_path(paper_a["paper_id"])), file_a.filename))
    asyncio.create_task(upload_pdf_to_cloudinary(paper_b["paper_id"], str(pdf_path(paper_b["paper_id"])), file_b.filename))

    return {"paper_a": paper_a, "paper_b": paper_b}


# ── Select paper from URL for Arena (same as /papers/select but lighter) ─

@router.post("/select-url")
async def select_arena_paper_from_url(req: SelectArenaFromURL):
    """Download PDF from URL and process it for the Arena."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Arena select-url: title='{req.title}', url='{req.pdf_url}'")
    
    pdf_bytes = await download_pdf_from_url(req.pdf_url)
    paper_id = str(uuid.uuid4())

    await process_pdf_file(paper_id, pdf_bytes)
    save_pdf(paper_id, pdf_bytes)

    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO papers (id, title, source_url) VALUES ($1, $2, $3)",
            paper_id, req.title, req.pdf_url,
        )

    # Fire and forget Cloudinary upload
    filename = f"{req.title}.pdf"
    asyncio.create_task(upload_pdf_to_cloudinary(paper_id, str(pdf_path(paper_id)), filename))

    return {
        "paper_id": paper_id,
        "title": req.title,
    }


# ── Debate Stream ──────────────────────────────────────────────────────────

async def _debate_generator(paper_a_id: str, paper_b_id: str, perspective: Optional[str], restart_count: int):
    pool = get_pool()

    async with pool.acquire() as conn:
        paper_a = await get_paper(conn, paper_a_id)
        paper_b = await get_paper(conn, paper_b_id)

    if not paper_a:
        yield sse_event({"type": "error", "message": f"Paper A not found: {paper_a_id}"})
        return
    if not paper_b:
        yield sse_event({"type": "error", "message": f"Paper B not found: {paper_b_id}"})
        return

    debate_data = []
    current_turn = None
    winner = None

    try:
        async for event in run_debate(
            paper_a_id=paper_a["id"],
            paper_a_title=paper_a["title"],
            paper_b_id=paper_b["id"],
            paper_b_title=paper_b["title"],
            perspective=perspective,
            restart_count=restart_count,
        ):
            # Accumulate debate data
            if event["type"] == "round_start":
                current_turn = {
                    "round": event["round"],
                    "speaker": event["speaker"],
                    "topic": event["topic"],
                    "content": ""
                }
            elif event["type"] == "token":
                if current_turn:
                    current_turn["content"] += event["content"]
            elif event["type"] == "round_end":
                if current_turn:
                    debate_data.append(current_turn)
                    current_turn = None
            elif event["type"] == "verdict":
                winner = event["winner"]

            yield sse_event(event)
            
        # Store debate session upon completion
        async with pool.acquire() as conn:
            cid = await insert_conversation(conn, mode="debate", paper_a_id=paper_a["id"], paper_b_id=paper_b["id"])
            await insert_debate_session(conn, conversation_id=cid, perspective=perspective, debate_data=debate_data, winner=winner)

    except Exception as e:
        yield sse_event({"type": "error", "message": f"Debate error: {str(e)[:200]}"})


@router.post("/debate/stream")
async def debate_stream(req: DebateRequest):
    return StreamingResponse(
        _debate_generator(req.paper_a_id, req.paper_b_id, req.perspective, req.restart_count),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )