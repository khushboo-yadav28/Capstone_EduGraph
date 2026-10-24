from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.course import EnrollmentStatus

class CourseMiniResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

# --- Badge Schemas ---
class BadgeResponse(BaseModel):
    id: UUID
    enrollment_id: int
    course_id: Optional[UUID] = None
    course_title: Optional[str] = None
    badge_title: str = Field(..., example="Master of Python Fundamentals")
    badge_image_url: Optional[str] = Field(None, example="https://cdn.edugraph.com/badges/python-101.png")
    certificate_url: Optional[str] = None
    issued_at: datetime

    class Config:
        from_attributes = True


# --- Enrollment Schemas ---
class EnrollmentCreate(BaseModel):
    course_id: UUID


class EnrollmentStatusUpdate(BaseModel):
    status: EnrollmentStatus


class UserCourseEnrollmentResponse(BaseModel):
    id: int
    student_id: UUID
    course_id: UUID
    status: EnrollmentStatus
    progress_percentage: float = Field(..., example=45.0, ge=0.0, le=100.0)
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    badge: Optional[BadgeResponse] = None
    course: Optional[CourseMiniResponse] = None

    class Config:
        from_attributes = True
