import json
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.domain_types import AssigneeStatus, PersonalTaskKind, TaskStatus
from app.core.schemas import ApiModel
from app.modules.auth.schemas import UserResponse
from app.modules.filehub.schemas import FileResourceSummaryResponse


def validate_ticket_checklist_limit(v: str | None) -> str | None:
    if not v:
        return v
    try:
        parsed = json.loads(v)
        if isinstance(parsed, list) and len(parsed) > 20:
            raise ValueError("A ticket cannot have more than 20 checklist items.")
    except (json.JSONDecodeError, TypeError):
        pass
    return v


class TaskImageResponse(ApiModel):
    id: UUID
    task_id: UUID
    uploaded_by: UserResponse
    url: str
    ticket_item_id: str | None = None
    created_at: datetime


class TaskAssigneeResponse(ApiModel):
    id: UUID
    user: UserResponse
    status: AssigneeStatus
    completed_at: datetime | None = None


class TaskLinkedFileCreateRequest(BaseModel):
    mode: Literal["doc", "link"]
    title: str | None = Field(default=None, max_length=240)
    url: str | None = Field(default=None, max_length=2048)


class TaskExistingFileLinkRequest(BaseModel):
    file_id: UUID


class TaskResponse(ApiModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None = None
    start_date: date
    due_date: date | None = None
    status: TaskStatus
    is_record_only: bool
    is_private: bool
    personal_kind: PersonalTaskKind
    created_by: UserResponse
    reviewed_by: UserResponse | None = None
    reviewed_at: datetime | None = None
    review_remarks: str | None = None
    assignees: list[TaskAssigneeResponse]
    linked_files: list[FileResourceSummaryResponse] = []
    images: list[TaskImageResponse] = []
    created_at: datetime
    updated_at: datetime


class TaskListResponse(ApiModel):
    tasks: list[TaskResponse]


class TaskSocketTicketResponse(ApiModel):
    ticket: str


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    assignee_ids: list[UUID] = Field(min_length=1)
    start_date: date | None = None
    due_date: date | None = None
    initial_status: Literal["todo", "in_progress", "done"] = "todo"
    linked_file: TaskLinkedFileCreateRequest | None = None
    is_record_only: bool = False
    is_private: bool = False
    personal_kind: PersonalTaskKind = "task"

    @field_validator("description")
    @classmethod
    def validate_description_checklist_items(cls, v: str | None) -> str | None:
        return validate_ticket_checklist_limit(v)


class TaskUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    assignee_ids: list[UUID] | None = None
    start_date: date | None = None
    due_date: date | None = None

    @field_validator("description")
    @classmethod
    def validate_description_checklist_items(cls, v: str | None) -> str | None:
        return validate_ticket_checklist_limit(v)


class TaskAssigneeUpdateRequest(BaseModel):
    status: Literal["todo", "in_progress", "ready_for_review", "done"]


class TaskReviewRequest(BaseModel):
    action: Literal["approve", "request_changes"]
    remarks: str | None = Field(default=None, max_length=4000)
