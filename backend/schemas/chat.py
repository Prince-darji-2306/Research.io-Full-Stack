"""
Pydantic schemas for chat-related endpoints.
"""
from pydantic import BaseModel


class ChatReq(BaseModel):
    session_id: str
    content: str
    paper_id: str | None = None


class ChatTitleReq(BaseModel):
    title: str