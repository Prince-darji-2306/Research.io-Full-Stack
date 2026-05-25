"""
Chat router — streams LLM responses as Server-Sent Events (SSE).
Client uses fetch() + ReadableStream, not EventSource (since we POST).

SSE event shapes:
  data: {"type": "start"}
  data: {"type": "token",  "content": "..."}
  data: {"type": "done",   "image": null, "chunks": [...]}
  data: {"type": "error",  "message": "..."}
"""
from collections.abc import AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from core.database import get_pool
from core.sse import SSE_HEADERS, sse_event
from models.conversation import get_conversation, insert_conversation, update_conversation_papers
from models.paper import get_paper
from schemas.chat import ChatReq
from services.llm import get_chat_llm, get_context, build_chat_messages, optimize_query
from services.memory import get_conversation_history, save_messages

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _chat_generator(session_id: str, query: str, paper_id: str | None = None) -> AsyncGenerator[str, None]:
    pool = get_pool()

    async with pool.acquire() as conn:
        conversation = await get_conversation(conn, session_id)

        if not conversation:
            if not paper_id:
                yield sse_event({"type": "error", "message": "No paper loaded for this session."})
                return
            await insert_conversation(conn, mode='chat', paper_a_id=paper_id, cid=session_id)
            conversation = await get_conversation(conn, session_id)
        else:
            # If the user switched papers in the same session, update the conversation
            if paper_id and conversation["paper_a_id"] != paper_id:
                await update_conversation_papers(conn, session_id, paper_a_id=paper_id)
                conversation["paper_a_id"] = paper_id
                # Clear old chat history for the new paper
                await conn.execute("DELETE FROM messages WHERE conversation_id = $1", session_id)
        if not conversation or not conversation["paper_a_id"]:
            yield sse_event({"type": "error", "message": "No paper loaded for this session."})
            return

        paper = await get_paper(conn, conversation["paper_a_id"])
        if not paper:
            yield sse_event({"type": "error", "message": "Paper record not found."})
            return

        history = await get_conversation_history(conn, session_id)

    # Step 1: Optimize the user query for retrieval
    optimized = await optimize_query(query)
    retrieval_query = optimized["query"]

    print(f"Query optimizer: action={optimized['action']} | original='{query}' | rewritten='{retrieval_query}'")
    yield sse_event({"type": "optimized_query", "action": optimized["action"], "original": query, "query": retrieval_query})

    # Step 2: Retrieve context using the optimized query
    context, chunks = await get_context(retrieval_query, paper["id"])

    # Step 3: Build messages with the original system prompt
    messages = build_chat_messages(query, context, history)

    yield sse_event({"type": "start"})

    llm = get_chat_llm()
    full_response = ""

    async for chunk in llm.astream(messages):
        token = chunk.content or ""
        if token:
            full_response += token
            yield sse_event({"type": "token", "content": token})

    # Serialize chunks for the frontend (text + page + scores)
    chunks_payload = [
        {
            "text": c["text"],
            "page": c["page"],
            "score": round(c["score"], 4),
            "embed_score": round(c.get("embed_score", c["score"]), 4),
            "rerank_score": round(c.get("rerank_score", c["score"]), 4),
        }
        for c in chunks
    ]

    yield sse_event({"type": "done", "image": None, "chunks": chunks_payload})

    # Persist messages
    async with pool.acquire() as conn:
        await save_messages(conn, session_id, query, full_response, chunks=chunks_payload)


@router.post("/stream")
async def chat_stream(req: ChatReq):
    if not req.content.strip():
        raise HTTPException(400, "Empty message.")

    return StreamingResponse(
        _chat_generator(req.session_id, req.content.strip(), req.paper_id),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )