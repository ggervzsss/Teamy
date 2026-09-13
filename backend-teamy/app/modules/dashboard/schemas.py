from datetime import date, datetime
from typing import Literal
from uuid import UUID

from app.core.schemas import ApiModel
from app.modules.announcements.schemas import AnnouncementResponse
from app.modules.tasks.schemas import TaskResponse


class DashboardDeadlineItemResponse(ApiModel):
    id: str
    source_id: UUID
    kind: Literal["announcement", "task"]
    title: str
    due_date: date | None = None


class DashboardActivityItemResponse(ApiModel):
    id: str
    kind: Literal["announcement", "task", "file"]
    title: str
    description: str
    actor: str
    timestamp: datetime
    target_path: str


class DashboardSummaryResponse(ApiModel):
    recent_announcements: list[AnnouncementResponse]
    pending_tasks: list[TaskResponse]
    tasks_for_review: list[TaskResponse]
    deadline_items: list[DashboardDeadlineItemResponse]
    activity_items: list[DashboardActivityItemResponse]
    active_task_count: int
    my_pending_task_count: int
    tasks_for_review_count: int
