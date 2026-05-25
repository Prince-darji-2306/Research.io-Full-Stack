"""
Pydantic schemas for paper-related endpoints.
"""
from pydantic import BaseModel


class CreateSessionReq(BaseModel):
    paper_id: str | None = None


class SelectPaperReq(BaseModel):
    session_id: str
    title: str
    pdf_url: str