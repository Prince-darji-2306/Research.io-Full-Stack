"""
Search router — streams agent events as SSE.
Client POSTs query, server streams thought/tool/result events.

SSE event shapes:
  data: {"type": "thought",     "content": "...", "step": N}
  data: {"type": "tool_call",   "tool": "...", "label": "...", "step": N}
  data: {"type": "tool_result", "tool": "...", "label": "...", "success": bool, "summary": "..."}
  data: {"type": "result",      "recommended": {...}, "others": [...]}
  data: {"type": "error",       "message": "..."}
"""
from collections.abc import AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from core.sse import SSE_HEADERS, sse_event
from schemas.search import SearchReq
from services.agent import run_search_agent

router = APIRouter(prefix="/api/search", tags=["search"])


async def _search_generator(query: str) -> AsyncGenerator[str, None]:
    async for event in run_search_agent(query):
        yield sse_event(event)


@router.post("/stream")
async def search_stream(req: SearchReq):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty.")

    return StreamingResponse(
        _search_generator(req.query.strip()),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )