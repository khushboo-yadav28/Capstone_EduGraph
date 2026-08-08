from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class NodeProgressStatus(str, Enum):
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    COMPLETED = "COMPLETED"


class GraphNodeResponse(BaseModel):
    id: UUID
    node_key: str
    title: str
    summary: str
    page_references: Optional[str] = None
    youtube_url: Optional[str] = None
    youtube_timestamp_seconds: Optional[int] = None
    position_x: float
    position_y: float
    status: NodeProgressStatus
    best_score_percentage: Optional[float] = None  # Best score student achieved on quizzes for this node

    model_config = ConfigDict(from_attributes=True)


class GraphEdgeResponse(BaseModel):
    source_node_key: str
    target_node_key: str

    model_config = ConfigDict(from_attributes=True)


class CourseGraphResponse(BaseModel):
    course_id: UUID
    course_title: str
    course_description: Optional[str] = None
    nodes: List[GraphNodeResponse]
    edges: List[GraphEdgeResponse]

    model_config = ConfigDict(from_attributes=True)