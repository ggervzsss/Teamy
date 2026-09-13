from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.schemas import ApiModel
from app.modules.auth.schemas import UserResponse


class AnnouncementCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=4000)
    is_pinned: bool = False
    deadline_date: date | None = None
    is_record_only: bool = False


class AnnouncementUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, min_length=1, max_length=4000)
    is_pinned: bool | None = None
    deadline_date: date | None = None
    is_record_only: bool | None = None


class AnnouncementPinRequest(BaseModel):
    is_pinned: bool


class AnnouncementResponse(ApiModel):
    id: UUID
    project_id: UUID
    title: str
    body: str
    is_pinned: bool
    deadline_date: date | None = None
    deadline_done_at: datetime | None = None
    is_record_only: bool
    is_read: bool
    created_by: UserResponse
    created_at: datetime
    updated_at: datetime


class AnnouncementListResponse(ApiModel):
    announcements: list[AnnouncementResponse]


class AnnouncementSocketTicketResponse(ApiModel):
    ticket: str
