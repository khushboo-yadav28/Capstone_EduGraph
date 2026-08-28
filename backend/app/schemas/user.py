from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


# Shared attributes across user models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)

class UserRole(str, Enum):
    STUDENT = "STUDENT"
    INSTRUCTOR = "INSTRUCTOR"
    
# Schema for User Registration / Signup
# class UserCreate(UserBase):
#     password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
#     role: Optional[UserRole] = UserRole.STUDENT  # Defaults to STUDENT if omitted

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole

# Schema for Login request (JSON payload option)
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Schema for returning User data in responses (excludes password)
class UserResponse(UserBase):
    id: UUID
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True