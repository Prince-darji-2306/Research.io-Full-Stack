"""
Conversation database query helpers.
"""
from asyncpg import Connection


async def insert_conversation(conn: Connection, mode: str, paper_a_id: str | None = None, paper_b_id: str | None = None, cid: str | None = None) -> str:
    import uuid
    if not cid:
        cid = str(uuid.uuid4())
    await conn.execute(
        "INSERT INTO conversations (id, mode, paper_a_id, paper_b_id) VALUES ($1, $2, $3, $4)",
        cid, mode, paper_a_id, paper_b_id,
    )
    return cid


async def get_conversation(conn: Connection, conversation_id: str) -> dict | None:
    row = await conn.fetchrow("SELECT * FROM conversations WHERE id = $1", conversation_id)
    return dict(row) if row else None


async def update_conversation_papers(conn: Connection, conversation_id: str, paper_a_id: str | None, paper_b_id: str | None = None):
    await conn.execute(
        "UPDATE conversations SET paper_a_id = $1, paper_b_id = $2 WHERE id = $3",
        paper_a_id, paper_b_id, conversation_id,
    )