"""
Shared FastAPI dependencies for dependency injection.
"""
from typing import AsyncGenerator
from asyncpg import Connection
from core.database import get_pool


async def get_db_conn() -> AsyncGenerator[Connection, None]:
    """
    FastAPI dependency that yields a database connection.
    Usage: `conn: Connection = Depends(get_db_conn)`
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn