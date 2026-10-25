from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


# --- Student Profile Schemas ---
class StudentProfileBase(BaseModel):
    department: Optional[str] = Field(None, example="Computer Science & Engineering")
    program: Optional[str] = Field(None, example="M.Sc. IT")
    semester: Optional[str] = Field(None, example="Semester 9")
    batch: Optional[str] = Field(None, example="2024-2028")
    enrollment_number: Optional[str] = Field(None, example="STU-2026-001")
    academic_year: Optional[str] = Field(None, example="3rd Year")
    bio: Optional[str] = Field(None, example="Passionate about AI and knowledge graphs.")
    interests: Optional[str] = Field(None, example="Machine Learning, Graph Neural Networks, RAG")


class StudentProfileCreate(StudentProfileBase):
    pass


class StudentProfileUpdate(BaseModel):
    department: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[str] = None
    batch: Optional[str] = None
    enrollment_number: Optional[str] = None
    academic_year: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[str] = None


class StudentProfileResponse(StudentProfileBase):
    id: UUID
    user_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Instructor Profile Schemas ---
class InstructorProfileBase(BaseModel):
    department: Optional[str] = Field(None, example="Department of Artificial Intelligence")
    designation: Optional[str] = Field(None, example="Associate Professor")
    qualifications: Optional[str] = Field(None, example="Ph.D. in Computer Science")
    expertise: Optional[str] = Field(None, example="Knowledge Representation, Deep Learning, NLP")
    bio: Optional[str] = Field(None, example="Senior faculty researcher with 12+ years in AI systems.")
    office_hours: Optional[str] = Field(None, example="Mon/Wed 2:00 PM - 4:00 PM")


class InstructorProfileCreate(InstructorProfileBase):
    pass


class InstructorProfileUpdate(BaseModel):
    department: Optional[str] = None
    designation: Optional[str] = None
    qualifications: Optional[str] = None
    expertise: Optional[str] = None
    bio: Optional[str] = None
    office_hours: Optional[str] = None


class InstructorProfileResponse(InstructorProfileBase):
    id: UUID
    user_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- User Authentication & Base Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole

    # Role-Specific Profile Metadata at Signup
    # Student specific
    program: Optional[str] = None
    semester: Optional[str] = None
    department: Optional[str] = None
    batch: Optional[str] = None
    enrollment_number: Optional[str] = None
    academic_year: Optional[str] = None
    interests: Optional[str] = None

    # Instructor specific
    designation: Optional[str] = None
    qualifications: Optional[str] = None
    expertise: Optional[str] = None
    office_hours: Optional[str] = None

    # Shared
    bio: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    """Unified payload schema for updating user credentials and profile details."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    
    # Student specific
    program: Optional[str] = None
    semester: Optional[str] = None
    batch: Optional[str] = None
    enrollment_number: Optional[str] = None
    academic_year: Optional[str] = None
    interests: Optional[str] = None

    # Instructor specific
    designation: Optional[str] = None
    qualifications: Optional[str] = None
    expertise: Optional[str] = None
    office_hours: Optional[str] = None

    # Shared profile attributes
    department: Optional[str] = None
    bio: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    role: UserRole
    is_active: bool
    student_profile: Optional[StudentProfileResponse] = None
    instructor_profile: Optional[InstructorProfileResponse] = None

    class Config:
        from_attributes = True
