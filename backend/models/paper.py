"""
Paper database query helpers.
"""
from asyncpg import Connection


async def insert_paper(conn: Connection, *, title: str, source_url: str | None = 'local', storage_url: str | None = None) -> str:
    import uuid
    pid = str(uuid.uuid4())
    if source_url is None:
        source_url = 'local'
    await conn.execute(
        "INSERT INTO papers (id, title, source_url, storage_url) VALUES ($1, $2, $3, $4)",
        pid, title, source_url, storage_url,
    )
    return pid


async def get_paper(conn: Connection, paper_id: str) -> dict | None:
    row = await conn.fetchrow("SELECT * FROM papers WHERE id = $1", paper_id)
    return dict(row) if row else None


async def update_paper_storage_url(conn: Connection, paper_id: str, storage_url: str):
    await conn.execute(
        "UPDATE papers SET storage_url = $1 WHERE id = $2",
        storage_url, paper_id,
    )