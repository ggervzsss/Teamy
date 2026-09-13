from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.schemas import ApiModel


class UserProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)


class UserResponse(ApiModel):
    id: UUID
    email: EmailStr
    full_name: str
    username: str | None = None
    avatar_url: str | None = None
    google_avatar_url: str | None = None
    last_online_at: datetime | None = None


class AuthResponse(ApiModel):
    user: UserResponse
