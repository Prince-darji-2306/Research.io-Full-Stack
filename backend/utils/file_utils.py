"""
File system utilities shared across routers.
"""
from pathlib import Path
from core.config import settings


def pdf_path(paper_id: str) -> Path:
    """Return the local filesystem path for a paper's PDF."""
    return Path(settings.IMAGES_DIR).parent / "pdfs" / f"{paper_id}.pdf"


def save_pdf(paper_id: str, pdf_bytes: bytes):
    """Save PDF bytes to the local filesystem."""
    p = pdf_path(paper_id)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(pdf_bytes)