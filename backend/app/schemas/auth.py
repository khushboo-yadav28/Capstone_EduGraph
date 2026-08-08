from typing import Optional
from pydantic import BaseModel
from app.models.user import UserRole


# Token response returned upon successful login
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Decoded payload extracted from a verified JWT token
class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[UserRole] = None