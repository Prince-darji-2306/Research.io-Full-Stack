"""
Aggregate all API routers.
"""
from api.papers import router as papers_router
from api.chat import router as chat_router
from api.search import router as search_router
from api.arena import router as arena_router

__all__ = ["papers_router", "chat_router", "search_router", "arena_router"]