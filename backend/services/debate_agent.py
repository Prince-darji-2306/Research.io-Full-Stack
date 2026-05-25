"""
Two-agent Debate Service
========================
PaperDefenderAgent: Represents one research paper and argues for it.
DebateOrchestrator : Runs the full structured debate as an SSE generator.

Debate structure (6 rounds):
  0. Moderator Introduction
  1. Paper A — Opening argument (methodology focus)
  2. Paper B — Response + rebuttal
  3. Paper A — Rebuttal of B's claims
  4. Paper B — Counter-rebuttal
  5. Paper A — Closing statement
  6. Paper B — Closing statement
  7. Moderator — Final verdict

SSE event shapes:
  {"type": "round_start", "round": N, "speaker": "moderator"|"paper_a"|"paper_b", "topic": "..."}
  {"type": "token",       "speaker": "...", "content": "..."}
  {"type": "round_end",   "round": N, "speaker": "..."}
  {"type": "verdict",     "winner": "paper_a"|"paper_b"|"draw", "reasoning": "..."}
  {"type": "error",       "message": "..."}
"""

import json
from collections.abc import AsyncGenerator
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from core.config import settings
from services.qdrant_service import similarity_search


# ── System Prompts ─────────────────────────────────────────────────────────


def _defender_system_prompt(paper_title: str, slot: str) -> str:
    """Exceptional debater prompt for a paper defender agent."""
    return f"""You are an elite academic debater representing the research paper titled:
"{paper_title}"

Your role is to DEFEND this paper with intellectual rigour and conviction.

DEBATE PERSONA:
- You speak in the first person as the representative of Paper {slot.upper()}.
- You are a world-class researcher who deeply understands this work.
- You are sharp, evidence-driven, and get straight to the point.

DEBATE RULES:
1. Ground every claim in the CONTEXT provided below. Do not fabricate.
2. Attack your opponent's WEAKNESSES specifically — cite methodology gaps, evaluation limits, or scope issues.
3. Highlight your paper's STRENGTHS with precision — novel contributions, rigour, reproducibility.
4. Be EXTREMELY CONCISE. Use 3-5 short bullet points maximum. No paragraphs.
5. Maintain intellectual honesty: acknowledge minor weaknesses briefly, then pivot to strengths.
6. Address the TOPIC of each round directly.

WRITING STYLE:
- Bullet points only. Each point is 1-2 sentences maximum.
- Sharp, direct, punchy. No fluff, no transition phrases.
- No closing sentences, no greetings.

The CONTEXT from the paper is your only source of truth. Use it well."""


_MODERATOR_SYSTEM = """You are Dr. Aria Chen, a world-renowned AI research conference chair moderating a live academic debate between two research papers.

Your role:
- INTRODUCTIONS: Present both papers with 1 sentence each, then the key tension — all in 3-5 bullet points.
- VERDICTS: Assess on (1) methodological rigour, (2) novelty, (3) argumentation quality, (4) evidence strength.
- Be neutral, authoritative, and extremely concise. Bullet points only, max 6 points.
- For the VERDICT: declare winner (or draw), 2-3 specific reasons, no long explanations."""


# ── Context Retrieval ──────────────────────────────────────────────────────


async def _get_debate_context(pdf_id: str, query: str, top_k: int = 6) -> str:
    """Retrieve relevant chunks for a debate query."""
    chunks = await similarity_search(pdf_id, query, top_k=top_k)
    if not chunks:
        return "No relevant context found in this paper."
    parts = [f"[Page {c['page']}] {c['text']}" for c in chunks]
    return "\n\n---\n\n".join(parts)


# ── Single Agent Stream ────────────────────────────────────────────────────


async def _stream_agent_turn(
    llm: ChatGroq,
    system: str,
    context_a: str,
    context_b: str,
    history: list[dict],
    speaker: str,
    turn_prompt: str,
) -> AsyncGenerator[str, None]:
    """Stream a single agent's response tokens."""
    messages = [SystemMessage(content=system)]

    # Inject context
    context_block = f"""
CONTEXT FROM YOUR PAPER:
{context_a}

CONTEXT FROM OPPONENT'S PAPER:
{context_b}
"""
    messages.append(HumanMessage(content=context_block))

    # Replay debate history
    for entry in history:
        if entry["speaker"] == speaker:
            messages.append(AIMessage(content=entry["content"]))
        else:
            messages.append(HumanMessage(content=f"[{entry['speaker'].replace('_',' ').title()}]: {entry['content']}"))

    # Current turn instruction
    messages.append(HumanMessage(content=turn_prompt))

    async for chunk in llm.astream(messages):
        token = chunk.content or ""
        if token:
            yield token


# ── Debate Orchestrator ────────────────────────────────────────────────────


DEBATE_ROUNDS = [
    {
        "round": 1,
        "speaker": "paper_a",
        "topic": "Methodology & Core Contribution",
        "prompt": (
            "Present your paper's core contribution and methodology in 3-5 bullet points. "
            "Explain why your approach is more rigorous or impactful than your opponent's. "
            "No paragraphs, no greetings."
        ),
    },
    {
        "round": 2,
        "speaker": "paper_b",
        "topic": "Response & Rebuttal",
        "prompt": (
            "Respond to Paper A with 3-5 bullet points. Identify specific weaknesses in their methodology. "
            "Present your paper's superior approach. No paragraphs."
        ),
    },
    {
        "round": 3,
        "speaker": "paper_a",
        "topic": "Counter-Rebuttal",
        "prompt": (
            "Address Paper B's criticisms in 3-5 bullet points. Refute with evidence from your paper. "
            "Expose limitations in Paper B's methodology. No paragraphs."
        ),
    },
    {
        "round": 4,
        "speaker": "paper_b",
        "topic": "Counter-Rebuttal",
        "prompt": (
            "Respond to Paper A's counter-rebuttal with 3-5 bullet points. "
            "Cite concrete evidence from your paper. No paragraphs."
        ),
    },
    {
        "round": 5,
        "speaker": "paper_a",
        "topic": "Closing Statement",
        "prompt": (
            "Deliver your closing statement as 3-5 bullet points. "
            "Summarise your strongest points. Acknowledge one limitation briefly. No paragraphs."
        ),
    },
    {
        "round": 6,
        "speaker": "paper_b",
        "topic": "Closing Statement",
        "prompt": (
            "Deliver your closing statement as 3-5 bullet points. "
            "Summarise your strongest points. Acknowledge one limitation briefly. No paragraphs."
        ),
    },
]


async def run_debate(
    paper_a_id: str,
    paper_a_title: str,
    paper_b_id: str,
    paper_b_title: str,
    perspective: str | None = None,
    restart_count: int = 0,
) -> AsyncGenerator[dict, None]:
    """
    Full debate generator. Yields dicts for SSE streaming.
    Uses CHAT_MODEL for defender agents, SEARCH_MODEL for moderator.
    """
    chat_llm = ChatGroq(
        model=settings.CHAT_MODEL,
        temperature=0.65,
        api_key=settings.GROQ_API_KEY,
        streaming=True,
    )
    moderator_llm = ChatGroq(
        model=settings.SEARCH_MODEL,
        temperature=0.3,
        api_key=settings.GROQ_API_KEY,
        streaming=True,
    )

    system_a = _defender_system_prompt(paper_a_title, "A")
    system_b = _defender_system_prompt(paper_b_title, "B")

    history: list[dict] = []

    # ── 0. Moderator Introduction ───────────────────────────────────
    if perspective:
        focus_text = f"The user has explicitly requested to focus this debate on: '{perspective}'."
        intro_query = f"{perspective} {paper_a_title} {paper_b_title}"
    elif restart_count > 0:
        focus_text = "This is a restarted debate. Choose a completely new, unexpected, and highly interesting perspective (e.g. ethical implications, societal impact, or real-world deployment challenges) to frame this debate."
        intro_query = f"limitations ethical societal deployment {paper_a_title} {paper_b_title}"
    else:
        focus_text = "Frame the core intellectual tension. What is at stake?"
        intro_query = f"introduction overview methodology {paper_a_title} {paper_b_title}"

    ctx_a_intro, ctx_b_intro = (
        await _get_debate_context(paper_a_id, intro_query, top_k=4),
        await _get_debate_context(paper_b_id, intro_query, top_k=4),
    )

    intro_prompt = f"""Introduce this debate concisely as 3-5 bullet points:

Paper A: "{paper_a_title}"
Summary: {ctx_a_intro[:800]}

Paper B: "{paper_b_title}"
Summary: {ctx_b_intro[:800]}

{focus_text} No paragraphs, no greetings."""

    yield {"type": "round_start", "round": 0, "speaker": "moderator", "topic": "Introduction"}

    intro_content = ""
    async for token in _stream_agent_turn(
        moderator_llm, _MODERATOR_SYSTEM,
        ctx_a_intro, ctx_b_intro, [],
        "moderator", intro_prompt,
    ):
        intro_content += token
        yield {"type": "token", "speaker": "moderator", "content": token}

    history.append({"speaker": "moderator", "content": intro_content})
    yield {"type": "round_end", "round": 0, "speaker": "moderator"}

    # ── 1-6. Main Debate Rounds ─────────────────────────────────────
    for rd in DEBATE_ROUNDS:
        # Fetch context relevant to this round's topic
        ctx_a, ctx_b = (
            await _get_debate_context(paper_a_id, rd["topic"], top_k=5),
            await _get_debate_context(paper_b_id, rd["topic"], top_k=5),
        )

        is_a = rd["speaker"] == "paper_a"
        system = system_a if is_a else system_b
        ctx_self = ctx_a if is_a else ctx_b
        ctx_opp = ctx_b if is_a else ctx_a

        yield {"type": "round_start", "round": rd["round"], "speaker": rd["speaker"], "topic": rd["topic"]}

        turn_content = ""
        async for token in _stream_agent_turn(
            chat_llm, system,
            ctx_self, ctx_opp,
            history, rd["speaker"], rd["prompt"],
        ):
            turn_content += token
            yield {"type": "token", "speaker": rd["speaker"], "content": token}

        history.append({"speaker": rd["speaker"], "content": turn_content})
        yield {"type": "round_end", "round": rd["round"], "speaker": rd["speaker"]}

    # ── 7. Moderator Verdict ────────────────────────────────────────
    debate_summary = "\n\n".join([
        f"[{e['speaker'].replace('_', ' ').title()}]: {e['content'][:400]}…"
        for e in history
    ])

    verdict_prompt = f"""The debate between Paper A ("{paper_a_title}") and Paper B ("{paper_b_title}") has concluded.

Transcript:
{debate_summary}

Deliver your VERDICT as 4-6 bullet points:
1. Who won and why (2-3 specific reasons).
2. What each paper does best.

End with a line formatted exactly as:
WINNER: paper_a
or
WINNER: paper_b
or
WINNER: draw"""

    yield {"type": "round_start", "round": 7, "speaker": "moderator", "topic": "Final Verdict"}

    verdict_content = ""
    async for token in _stream_agent_turn(
        moderator_llm, _MODERATOR_SYSTEM,
        "", "", history, "moderator", verdict_prompt,
    ):
        verdict_content += token
        yield {"type": "token", "speaker": "moderator", "content": token}

    yield {"type": "round_end", "round": 7, "speaker": "moderator"}

    # Parse winner
    winner = "draw"
    for line in verdict_content.split("\n"):
        if line.strip().upper().startswith("WINNER:"):
            raw = line.split(":", 1)[-1].strip().lower()
            if "paper_a" in raw:
                winner = "paper_a"
            elif "paper_b" in raw:
                winner = "paper_b"
            else:
                winner = "draw"
            break

    yield {
        "type": "verdict",
        "winner": winner,
        "reasoning": verdict_content,
    }
