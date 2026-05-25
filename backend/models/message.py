"""
Message database query helpers.
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


async def insert_chat_messages(conn: Connection, conversation_id: str, user_msg: str, assistant_msg: str, sources: list | None = None):
    import uuid
    sources_json = json.dumps(_strip_nulls(sources)) if sources else None
    await conn.execute(
        "INSERT INTO messages (id, conversation_id, user_msg, assistant_msg, sources) VALUES ($1, $2, $3, $4, $5::jsonb)",
        str(uuid.uuid4()), conversation_id, _strip_nulls(user_msg), _strip_nulls(assistant_msg), sources_json,
    )


async def get_recent_messages(conn: Connection, conversation_id: str, limit: int = 200) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT user_msg, assistant_msg FROM (
            SELECT user_msg, assistant_msg, created_at
            FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        ) sub ORDER BY created_at ASC
        """,
        conversation_id, limit,
    )
    result = []
    for r in rows:
        result.append({"role": "user", "content": r["user_msg"]})
        result.append({"role": "assistant", "content": r["assistant_msg"]})
    return result


async def trim_messages(conn: Connection, conversation_id: str, keep: int = 200):
    """Delete oldest messages beyond the buffer limit."""
    await conn.execute(
        """
        DELETE FROM messages
        WHERE id IN (
            SELECT id FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at DESC
            OFFSET $2
        )
        """,
        conversation_id, keep,
    )