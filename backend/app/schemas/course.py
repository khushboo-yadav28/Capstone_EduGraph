from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

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

    class Config:
        from_attributes = True

# --- NEW Public Detailed Course Schema ---
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

    class Config:
        from_attributes = True
        