"""
Debate session database query helpers.
"""
import json
from asyncpg import Connection


def _strip_nulls(obj):
    """Recursively remove \u0000 from strings to avoid PostgreSQL asyncpg errors."""
    if isinstance(obj, str):
        return obj.replace("\u0000", "")
    if isinstance(obj, list):
        return [_strip_nulls(item) for item in obj]
    if isinstance(obj, dict):
        return {k: _strip_nulls(v) for k, v in obj.items()}
    return obj


async def insert_debate_session(conn: Connection, conversation_id: str, perspective: str | None, debate_data: list, winner: str | None) -> str:
    import uuid
    did = str(uuid.uuid4())
    debate_json = json.dumps(_strip_nulls(debate_data))
    await conn.execute(
        "INSERT INTO debate_sessions (id, conversation_id, perspective, debate_data, winner) VALUES ($1, $2, $3, $4::jsonb, $5)",
        did, conversation_id, perspective, debate_json, winner,
    )
    return did