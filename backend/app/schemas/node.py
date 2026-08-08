from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from uuid import UUID


class NodeBase(BaseModel):
    node_key: str = Field(..., example="node_1", max_length=50)
    title: str = Field(..., example="Variables and Data Types", max_length=255)
    summary: str = Field(..., example="Understanding primitive and composite data types in Python.")
    page_references: Optional[str] = Field(None, example="Pages 12-15")
    youtube_url: Optional[str] = Field(None, example="https://www.youtube.com/watch?v=kqtD5dpn9C8")
    youtube_timestamp_seconds: Optional[int] = Field(None, example=220, ge=0)
    position_x: float = Field(default=0.0, example=150.0)
    position_y: float = Field(default=0.0, example=300.0)


class NodeCreate(NodeBase):
    course_id: UUID


class NodeUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    page_references: Optional[str] = None
    youtube_url: Optional[str] = None
    youtube_timestamp_seconds: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None


class NodeResponse(NodeBase):
    id: UUID
    course_id: UUID

    class Config:
        from_attributes = True