"""
Pydantic schemas for search-related endpoints.
"""
from pydantic import BaseModel


class SearchReq(BaseModel):
    query: str