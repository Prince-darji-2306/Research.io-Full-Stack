import re
import json
import numpy as np
from functools import lru_cache
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from core.config import settings
from services.qdrant_service import similarity_search


def expit(x):
    """Sigmoid function — converts logits to probability-like scores."""
    return 1 / (1 + np.exp(-x))


@lru_cache(maxsize=1)
def get_chat_llm() -> ChatGroq:
    return ChatGroq(
        model=settings.CHAT_MODEL,
        temperature=0.3,
        api_key=settings.GROQ_API_KEY,
        streaming=True,
    )


@lru_cache(maxsize=1)
def get_search_llm() -> ChatGroq:
    return ChatGroq(
        model=settings.SEARCH_MODEL,
        temperature=0.1,
        api_key=settings.GROQ_API_KEY,
    )


@lru_cache(maxsize=1)
def get_optimizer_llm() -> ChatGroq:
    return ChatGroq(
        model=settings.SEARCH_MODEL,
        temperature=0.1,
        api_key=settings.GROQ_API_KEY,
    )


OPTIMIZER_SYSTEM_PROMPT = (
    "You are a retrieval query optimizer for a research paper Q&A system.\n\n"
    "Your job is to decide whether to rewrite the user's query before it is sent "
    "to a vector embedding search, or keep it as-is.\n\n"
    "ONLY rewrite when you are confident the original query will produce poor "
    "embedding matches — generic questions that lack specific terminology the "
    "paper would use.\n\n"
    "---\n\n"
    "WHEN TO REWRITE:\n\n"
    "Broad or vague queries where the user is asking for general understanding "
    "and the query has no domain-specific terms. You feel that this query needs "
    "rewriting.\n"
    'Examples: "what is this paper about", "summarize", "what problem does this '
    'solve", "explain the main idea", "what is the contribution"\n\n'
    "Rewrite into a single query that targets the core of what would answer this:\n"
    "- Use terms like \"proposed method\", \"problem motivation\", "
    "\"key contribution\", \"approach overview\"\n"
    "- The rewritten query should be dense enough that embeddings land on "
    "abstract, introduction, or the core method section\n"
    "- The goal is to retrieve sections that give a complete picture of the paper\n"
    "---\n\n"
    "WHEN TO KEEP AS-IS:\n\n"
    "- Query already contains specific technical terms, method names, or "
    "section-relevant language\n"
    "- Query is about a specific result, experiment, comparison, or detail\n"
    '- Query is short but highly specific (e.g., "attention mechanism", '
    '"memory module", "benchmark results")\n\n'
    "---\n\n"
    "OUTPUT FORMAT (JSON only, no explanation):\n\n"
    "{\n"
    '  "action": "rewrite" | "keep",\n'
    '  "query": "final query string"\n'
    "}"
)

ANSWER_SYSTEM_PROMPT = (
    "You are a research paper assistant. Answer the user's question strictly "
    "using the provided context chunks retrieved from the paper.\n\n"
    "RULES:\n"
    "- If the answer is present in the context, answer clearly and directly.\n"
    "- If the context only partially answers the question, answer what you can "
    "and explicitly state what is missing or unclear.\n"
    "- If the answer is not in the context at all, say: \"I don't have enough "
    "context from the paper to answer this.\"\n"
    "- Never use outside knowledge to fill gaps. Only use what is in the context.\n"
    "- Do not mention chunk numbers, retrieval, or any internal system details "
    "in your answer."
)


async def optimize_query(user_query: str) -> dict:
    """
    Sends the user query to the optimizer LLM and returns
    {'action': 'rewrite'|'keep', 'query': '...'}.
    Falls back to keeping the original query on any error.
    """
    llm = get_optimizer_llm()
    messages = [
        SystemMessage(content=OPTIMIZER_SYSTEM_PROMPT),
        HumanMessage(content=f"User query: {user_query}"),
    ]
    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()
        json_match = re.search(r"\{.*?\}", content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            action = parsed.get("action", "keep")
            query = parsed.get("query", user_query)
            return {"action": action, "query": query}
    except Exception:
        pass
    return {"action": "keep", "query": user_query}


async def get_context(query: str, pdf_id: str) -> tuple[str, list[dict]]:
    """
    Returns (context_string, raw_chunks_list).
    raw_chunks_list: [{"text": ..., "page": ..., "score": ..., "embed_score": ..., "rerank_score": ...}, ...]
    """
    from services.embeddings import get_reranker_model
    import asyncio

    # 1. Initial retrieval (top_k=16 for fast + precise filtering)
    chunks = await similarity_search(pdf_id, query, top_k=16)
    if not chunks:
        return "No relevant context found.", []

    # 2. Rerank using CrossEncoder
    reranker = get_reranker_model()
    pairs = [[query, c["text"]] for c in chunks]

    # Run reranking in thread to avoid blocking event loop
    scores = await asyncio.to_thread(
        reranker.predict,
        pairs,
        batch_size=32,
        show_progress_bar=False,
    )

    # 3. Apply expit (sigmoid) to get probability-like scores
    prob_scores = expit(np.array([float(s) for s in scores]))

    # 4. Attach both scores to each chunk
    for i, chunk in enumerate(chunks):
        chunk["embed_score"] = float(chunk["score"])  # Original Qdrant cosine similarity
        chunk["rerank_score"] = float(prob_scores[i])  # Reranker confidence via sigmoid
        chunk["score"] = float(prob_scores[i])  # Backward compatibility: score = rerank_score

    # 5. Sort descending by reranker score
    reranked_chunks = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)

    # 6. Select top K for context (top 7 after reranking)
    top_chunks = reranked_chunks[:7]

    parts = [f"[Page {c['page']}]\n{c['text']}" for c in top_chunks]
    return "\n\n---\n\n".join(parts), top_chunks


def build_chat_messages(
    query: str,
    context: str,
    history: list[dict],
) -> list:
    msgs = [SystemMessage(content=settings.SYSTEM_PROMPT)]

    for m in history:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        else:
            msgs.append(AIMessage(content=m["content"]))

    user_content = f"Context from paper:\n{context}\n\n"
    user_content += f"Question: {query}"
    msgs.append(HumanMessage(content=user_content))
    return msgs


def build_answer_messages(
    query: str,
    context: str,
    history: list[dict],
) -> list:
    msgs = [SystemMessage(content=ANSWER_SYSTEM_PROMPT)]

    for m in history:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        else:
            msgs.append(AIMessage(content=m["content"]))

    user_content = f"Context:\n{context}\n\n"
    user_content += f"Question: {query}"
    msgs.append(HumanMessage(content=user_content))
    return msgs
