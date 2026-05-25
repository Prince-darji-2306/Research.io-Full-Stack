"""
Conversation buffer memory using raw asyncpg.
Keeps the last MAX_MEMORY_MESSAGES messages per session.
"""
from asyncpg import Connection
from models.message import get_recent_messages, insert_chat_messages, trim_messages
from core.config import settings


async def get_conversation_history(conn: Connection, session_id: str) -> list[dict]:
    return await get_recent_messages(conn, session_id, limit=settings.MAX_MEMORY_MESSAGES)


async def save_messages(conn: Connection, session_id: str, user_msg: str, assistant_msg: str, chunks: list | None = None):
    await insert_chat_messages(conn, session_id, user_msg, assistant_msg, chunks)
    await trim_messages(conn, session_id, keep=settings.MAX_MEMORY_MESSAGES)
