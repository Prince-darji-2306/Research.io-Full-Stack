"""
asyncpg-based connection pool for PostgreSQL (Neon DB).
No SQLAlchemy. Raw SQL with $1/$2 style parameters.
"""
import asyncpg
import logging
from core.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


def _dsn() -> str:
    """asyncpg requires postgresql:// not postgresql+asyncpg://"""
    url = settings.DATABASE_URL
    return url.replace("postgresql+asyncpg://", "postgresql://").replace("postgres+asyncpg://", "postgresql://")


async def init_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=_dsn(),
        min_size=2,
        max_size=10,
        command_timeout=30,
    )


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialised — call init_pool() first.")
    return _pool


async def init_db():
    """Create tables with consistent TEXT types for IDs."""
    logger.info("Initializing database tables...")
    async with get_pool().acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS papers (
                id            TEXT PRIMARY KEY,
                title         TEXT NOT NULL,
                source_url    TEXT DEFAULT 'local',
                storage_url   TEXT,
                created_at    TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id            TEXT PRIMARY KEY,
                mode          TEXT NOT NULL,
                paper_a_id    TEXT REFERENCES papers(id) ON DELETE CASCADE,
                paper_b_id    TEXT REFERENCES papers(id) ON DELETE CASCADE,
                created_at    TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS messages (
                id            TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                user_msg      TEXT NOT NULL,
                assistant_msg TEXT NOT NULL,
                sources       JSONB,
                created_at    TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS debate_sessions (
                id            TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE UNIQUE,
                perspective   TEXT,
                debate_data   JSONB,
                winner        TEXT,
                created_at    TIMESTAMPTZ DEFAULT NOW()
            );
        """)
    logger.info("Database tables verified.")