import logging
from datetime import UTC, date, datetime, timedelta
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

import app.core.database as db_module
from app.core.cache import cache_get, cache_set, invalidate_user
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_notification_socket_ticket, decode_notification_socket_ticket, decode_session_token
from app.modules.announcements.models import Announcement
from app.modules.auth.models import User
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import (
    NotificationListResponse,
    NotificationResponse,
    NotificationSocketTicketResponse,
)
from app.modules.notifications.services import (
    EmailRecipient,
    format_date,
    send_announcement_reminder_email,
    send_task_due_reminder_email,
)
from app.modules.projects.models import Project, ProjectMember
from app.modules.tasks.models import Task, TaskAssignee

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[UUID, set[WebSocket]] = {}

    async def connect(self, user_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: UUID, websocket: WebSocket) -> None:
        self.active_connections.get(user_id, set()).discard(websocket)
        if user_id in self.active_connections and not self.active_connections[user_id]:
            del self.active_connections[user_id]

    async def broadcast(self, user_id: UUID, payload: dict) -> None:
        encoded_payload = jsonable_encoder(payload)
        dead_connections: list[WebSocket] = []
        for websocket in self.active_connections.get(user_id, set()).copy():
            try:
                await websocket.send_json(encoded_payload)
            except RuntimeError:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(user_id, websocket)


manager = NotificationConnectionManager()


class ReminderRunResponse(BaseModel):
    target_dates: list[date]
    task_reminders_queued: int
    announcement_reminders_queued: int


def serialize_notification(notification: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        project_id=notification.project_id,
        kind=notification.kind,
        title=notification.title,
        body=notification.body,
        target_path=notification.target_path,
        is_email_backed=notification.is_email_backed,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


async def create_user_notifications(
    db: AsyncSession,
    user_ids: set[UUID],
    *,
    project_id: UUID | None,
    kind: str,
    title: str,
    body: str | None,
    target_path: str | None,
    is_email_backed: bool = False,
    background_tasks: BackgroundTasks | None = None,
) -> None:
    created_notifications: list[Notification] = []
    created_at = datetime.now(UTC)
    for user_id in user_ids:
        notification = Notification(
            user_id=user_id,
            project_id=project_id,
            kind=kind,
            title=title[:240],
            body=body,
            target_path=target_path,
            is_email_backed=is_email_backed,
            created_at=created_at,
        )
        db.add(notification)
        created_notifications.append(notification)
    if not created_notifications:
        return
    await db.flush()
    for notification in created_notifications:
        payload = {"event": "notification.created", "notification": serialize_notification(notification)}
        if background_tasks is not None:
            background_tasks.add_task(manager.broadcast, notification.user_id, payload)
        else:
            await manager.broadcast(notification.user_id, payload)


@router.get("/ws-ticket", response_model=NotificationSocketTicketResponse)
async def create_notification_socket_ticket_endpoint(
    user: Annotated[User, Depends(get_current_user)],
    settings: Settings = Depends(get_settings),
) -> NotificationSocketTicketResponse:
    return NotificationSocketTicketResponse(ticket=create_notification_socket_ticket(user.id, settings))


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user: Annotated[User, Depends(get_current_user)],
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    bounded_limit = min(max(limit, 1), 100)
    cache_key = f"user:{user.id}:notifications:l={bounded_limit}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return NotificationListResponse(**cached)

    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(bounded_limit)
    )
    unread_result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
    )
    response = NotificationListResponse(
        notifications=[serialize_notification(notification) for notification in result.scalars().all()],
        unread_count=unread_result.scalar_one(),
    )
    await cache_set(cache_key, jsonable_encoder(response))
    return response


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        await db.commit()
        await invalidate_user(user.id)
        await db.refresh(notification)
        await manager.broadcast(
            user.id, {"event": "notification.read", "notification": serialize_notification(notification)}
        )
    return serialize_notification(notification)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC))
    )
    await db.commit()
    await invalidate_user(user.id)
    await manager.broadcast(user.id, {"event": "notification.read_all"})


@router.websocket("/ws")
async def notification_updates(websocket: WebSocket) -> None:
    settings = get_settings()
    ticket = websocket.query_params.get("ticket")

    if ticket:
        try:
            user_id = decode_notification_socket_ticket(ticket, settings)
        except HTTPException:
            await websocket.accept()
            await websocket.close(code=1008)
            return
    else:
        session_cookie = websocket.cookies.get(settings.session_cookie_name)
        if not session_cookie:
            await websocket.accept()
            await websocket.close(code=1008)
            return
        try:
            user_id = decode_session_token(session_cookie, settings)
        except HTTPException:
            await websocket.accept()
            await websocket.close(code=1008)
            return

    async with db_module.SessionLocal() as db:
        if await db.get(User, user_id) is None:
            await websocket.accept()
            await websocket.close(code=1008)
            return

    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


def get_reminder_dates(settings: Settings) -> list[date]:
    try:
        timezone = ZoneInfo(settings.notification_reminder_timezone)
    except ZoneInfoNotFoundError:
        logger.warning(
            "Invalid notification reminder timezone %s; falling back to UTC", settings.notification_reminder_timezone
        )
        timezone = ZoneInfo("UTC")
    today = datetime.now(timezone).date()
    return [today, today + timedelta(days=1)]


@router.post("/reminders/due", response_model=ReminderRunResponse)
async def queue_due_reminders(
    background_tasks: BackgroundTasks,
    x_teamy_reminder_secret: Annotated[str | None, Header(alias="X-Teamy-Reminder-Secret")] = None,
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ReminderRunResponse:
    if not settings.notification_reminder_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Notification reminder secret is not configured"
        )
    if x_teamy_reminder_secret != settings.notification_reminder_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid notification reminder secret")

    target_dates = get_reminder_dates(settings)
    task_result = await db.execute(
        select(Task, Project, User)
        .join(Project, Project.id == Task.project_id)
        .join(TaskAssignee, TaskAssignee.task_id == Task.id)
        .join(User, User.id == TaskAssignee.user_id)
        .where(Task.due_date.in_(target_dates), Task.status != "done", Project.archived_at.is_(None))
        .order_by(Task.due_date.asc(), Project.name.asc(), Task.title.asc(), User.email.asc())
    )
    task_count = 0
    for task, project, user in task_result.all():
        if task.due_date is None:
            continue
        task_count += 1
        await create_user_notifications(
            db,
            {user.id},
            project_id=project.id,
            kind="task.due_reminder",
            title=f"Task due reminder: {task.title}",
            body=f"{task.title} in {project.name} is due on {format_date(task.due_date)}.",
            target_path=f"/projects/{project.id}/task-board",
            is_email_backed=True,
        )
        background_tasks.add_task(
            send_task_due_reminder_email,
            settings,
            EmailRecipient(email=user.email, full_name=user.full_name),
            project.id,
            project.name,
            task.title,
            task.due_date,
        )

    announcement_result = await db.execute(
        select(Announcement, Project, User)
        .join(Project, Project.id == Announcement.project_id)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .join(User, User.id == ProjectMember.user_id)
        .where(Announcement.deadline_date.in_(target_dates), Project.archived_at.is_(None))
        .order_by(Announcement.deadline_date.asc(), Project.name.asc(), Announcement.title.asc(), User.email.asc())
    )
    announcement_count = 0
    for announcement, project, user in announcement_result.all():
        if announcement.deadline_date is None:
            continue
        announcement_count += 1
        await create_user_notifications(
            db,
            {user.id},
            project_id=project.id,
            kind="announcement.reminder",
            title=f"Announcement reminder: {announcement.title}",
            body=f"{announcement.title} in {project.name} is scheduled for {format_date(announcement.deadline_date)}.",
            target_path=f"/projects/{project.id}/announcements",
            is_email_backed=True,
        )
        background_tasks.add_task(
            send_announcement_reminder_email,
            settings,
            EmailRecipient(email=user.email, full_name=user.full_name),
            project.id,
            project.name,
            announcement.title,
            announcement.deadline_date,
        )

    await db.commit()
    return ReminderRunResponse(
        target_dates=target_dates,
        task_reminders_queued=task_count,
        announcement_reminders_queued=announcement_count,
    )
