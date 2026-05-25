"""
Pydantic schemas for arena-related endpoints.
"""
from pydantic import BaseModel
from typing import Optional


class SelectArenaFromURL(BaseModel):
    title: str
    pdf_url: str


class DebateRequest(BaseModel):
    paper_a_id: str
    paper_b_id: str
    perspective: Optional[str] = None
    restart_count: int = 0


class ArenaUploadReq(BaseModel):
    pass


class ArenaDebateReq(BaseModel):
    pass


class ArenaJudgeReq(BaseModel):
    pass