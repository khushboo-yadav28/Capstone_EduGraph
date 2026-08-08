from pydantic import BaseModel, Field
from uuid import UUID


class EdgeBase(BaseModel):
    source_node_key: str = Field(..., example="node_1", max_length=50)
    target_node_key: str = Field(..., example="node_2", max_length=50)


class EdgeCreate(EdgeBase):
    course_id: UUID


class EdgeResponse(EdgeBase):
    id: int
    course_id: UUID

    class Config:
        from_attributes = True