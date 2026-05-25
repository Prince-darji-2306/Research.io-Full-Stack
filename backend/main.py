from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from core.database import init_pool, close_pool, init_db
from services.qdrant_service import init_qdrant
from api import papers_router, chat_router, search_router, arena_router
from core.config import settings

app = FastAPI(title="Research.io API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (images + pdfs served from static/)
static_dir = Path(settings.IMAGES_DIR).parent
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(papers_router)
app.include_router(chat_router)
app.include_router(search_router)
app.include_router(arena_router)


@app.on_event("startup")
async def startup():
    await init_pool()
    await init_db()
    await init_qdrant()
    Path(settings.IMAGES_DIR).mkdir(parents=True, exist_ok=True)
    (Path(settings.IMAGES_DIR).parent / "pdfs").mkdir(parents=True, exist_ok=True)


@app.on_event("shutdown")
async def shutdown():
    await close_pool()


@app.get("/")
async def health():
    return {"status": "ok", "version": "2.0.0"}