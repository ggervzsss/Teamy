from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import ApiModel
from app.modules.auth.schemas import UserResponse


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)


class ProjectJoinRequest(BaseModel):
    teamy_code: str = Field(min_length=6, max_length=32)


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    icon_url: str | None = Field(default=None, max_length=500)
    color_theme: str | None = Field(default=None, max_length=50)


class ProjectArchiveRequest(BaseModel):
    confirm_archive: Literal[True]


class ProjectDeleteRequest(BaseModel):
    confirm_name: str = Field(min_length=1, max_length=160)


class ProjectResponse(ApiModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    icon_url: str | None = None
    color_theme: str | None = None
    teamy_code: str
    role: str
    member_count: int
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(ApiModel):
    projects: list[ProjectResponse]


class ProjectMemberResponse(ApiModel):
    id: UUID
    user: UserResponse
    role: str
    nickname: str | None = None
    joined_at: datetime


class ProjectMemberRoleUpdateRequest(BaseModel):
    role: Literal["co_leader", "member"]


class ProjectMemberListResponse(ApiModel):
    members: list[ProjectMemberResponse]


class ProjectMemberNicknameUpdateRequest(BaseModel):
    nickname: str | None = Field(default=None, max_length=40)
