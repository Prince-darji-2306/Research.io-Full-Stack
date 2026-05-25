"""
Shared SSE (Server-Sent Events) utilities.
Eliminates duplicate SSE streaming patterns across routers.
"""
import json
from collections.abc import AsyncGenerator
from typing import Any


SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


def sse_event(data: dict) -> str:
    """Format a dict as a single SSE data event."""
    return f"data: {json.dumps(data)}\n\n"


async def stream_response(
    generator: AsyncGenerator[dict, None],
) -> AsyncGenerator[str, None]:
    """
    Wraps any async generator yielding dicts into SSE-formatted strings.
    Appends a [DONE] signal at the end.
    """
    async for chunk in generator:
        yield sse_event(chunk)
    yield "data: [DONE]\n\n"