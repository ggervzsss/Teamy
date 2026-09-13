from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.domain_types import FileResourceKind, TaskStatus
from app.core.schemas import ApiModel
from app.modules.auth.schemas import UserResponse


class LinkedTaskResponse(ApiModel):
    id: UUID
    title: str
    status: TaskStatus


class FileResourceSummaryResponse(ApiModel):
    id: UUID
    project_id: UUID
    title: str
    kind: FileResourceKind
    url: str | None = None
    created_by: UserResponse
    linked_tasks: list[LinkedTaskResponse] = []
    created_at: datetime
    updated_at: datetime


class FileResourceResponse(FileResourceSummaryResponse):
    content_html: str | None = None


class FileResourceListResponse(ApiModel):
    files: list[FileResourceSummaryResponse]


class FileResourceCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    kind: FileResourceKind
    url: str | None = Field(default=None, max_length=2048)
    content_html: str | None = Field(default=None, max_length=500000)


class FileResourceUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    url: str | None = Field(default=None, max_length=2048)
    content_html: str | None = Field(default=None, max_length=500000)
