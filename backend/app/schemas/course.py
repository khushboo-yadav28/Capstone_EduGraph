from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# --- Category Schemas ---
class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=100, example="Computer Science")
    description: Optional[str] = Field(None, example="Courses related to programming, system design, and algorithms.")

class CategoryResponse(CategoryCreate):
    id: UUID

    class Config:
        from_attributes = True


# --- Course Schemas ---
class CourseCreate(BaseModel):
    title: str = Field(..., max_length=255, example="Intro to System Design")
    description: Optional[str] = Field(None, example="Learn graph-based learning paths.")
    category_id: UUID

class CourseResponse(CourseCreate):
    id: UUID
    instructor_id: UUID
    status: str
    nodes_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Public Detailed Course Schema ---
class InstructorSummary(BaseModel):
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True

class CourseDetailResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    status: str
    category: CategoryResponse
    instructor: InstructorSummary
    enrolled_students_count: int = 0
    total_nodes_count: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Course Document Schemas ---
class CourseDocumentResponse(BaseModel):
    id: UUID
    course_id: UUID
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: str = "application/pdf"
    uploaded_at: datetime
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


class CourseDocumentListResponse(BaseModel):
    course_id: UUID
    total_count: int
    documents: List[CourseDocumentResponse]


# --- RAG Context Schemas ---
class RAGContextReference(BaseModel):
    type: str = "PDF"
    document_name: Optional[str] = None
    page: Optional[int] = None

class RAGContextResponse(BaseModel):
    node_id: str
    node_title: Optional[str] = None
    summary: str
    references: List[RAGContextReference] = []
