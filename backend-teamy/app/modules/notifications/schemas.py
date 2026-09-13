from datetime import datetime
from uuid import UUID

from app.core.schemas import ApiModel


class NotificationResponse(ApiModel):
    id: UUID
    project_id: UUID | None = None
    kind: str
    title: str
    body: str | None = None
    target_path: str | None = None
    is_email_backed: bool
    read_at: datetime | None = None
    created_at: datetime


class NotificationListResponse(ApiModel):
    notifications: list[NotificationResponse]
    unread_count: int


class NotificationSocketTicketResponse(ApiModel):
    ticket: str
