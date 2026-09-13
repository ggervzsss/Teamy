import logging
from collections.abc import Collection, Sequence
from dataclasses import dataclass
from datetime import date
from uuid import UUID

import httpx
from sqlalchemy import select

import app.core.database as db_module
from app.core.config import Settings
from app.modules.auth.models import User
from app.modules.projects.models import ProjectMember

logger = logging.getLogger(__name__)


def format_date(value: date | None) -> str:
    if value is None:
        return ""
    return value.strftime("%b %d, %Y")


@dataclass
class EmailRecipient:
    email: str
    name: str | None = None
    full_name: str | None = None

    def __post_init__(self) -> None:
        if self.name is None and self.full_name is not None:
            self.name = self.full_name


async def send_email(
    settings: Settings,
    recipient: EmailRecipient | Sequence[EmailRecipient],
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> None:
    sender_email = getattr(settings, "sender_email", None) or getattr(settings, "brevo_from_email", None)
    if not settings.brevo_api_key or not sender_email:
        logger.info("Email delivery skipped (BREVO_API_KEY or SENDER_EMAIL/BREVO_FROM_EMAIL is not set)")
        return

    if "<" in sender_email and ">" in sender_email:
        sender_email = sender_email.split("<")[1].split(">")[0].strip()

    recipients_list = [recipient] if isinstance(recipient, EmailRecipient) else list(recipient)
    to_payload = [{"email": r.email, "name": r.name or r.full_name or r.email} for r in recipients_list]

    sender_name = getattr(settings, "sender_name", None) or "Teamy"
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": to_payload,
        "subject": subject,
        "htmlContent": html_body,
    }
    if text_body:
        payload["textContent"] = text_body
    headers = {
        "api-key": settings.brevo_api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
            status_code = getattr(response, "status_code", 200)
            if isinstance(status_code, int) and status_code >= 400:
                logger.error(
                    "Failed to send email via Brevo. Status: %s Body: %s", status_code, getattr(response, "text", "")
                )
            else:
                logger.info("Email successfully sent via Brevo")
    except Exception:
        logger.exception("Error while sending email via Brevo")


async def send_announcement_email_to_project_members(
    settings: Settings,
    project_id: UUID,
    project_name: str,
    announcement_title: str,
    announcement_body: str,
    deadline_date: date | None,
) -> None:
    async with db_module.SessionLocal() as db:
        members_result = await db.execute(
            select(User)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .where(ProjectMember.project_id == project_id)
        )
        recipients = list(members_result.scalars().all())

    deadline_str = f"<p><strong>Deadline:</strong> {deadline_date.isoformat()}</p>" if deadline_date else ""
    html_body = f"""
    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Announcement in {project_name}</h2>
        <h3 style="margin-bottom: 8px;">{announcement_title}</h3>
        {deadline_str}
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
            {announcement_body}
        </div>
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from Teamy.</p>
    </div>
    """

    for user in recipients:
        await send_email(
            settings,
            EmailRecipient(email=user.email, name=user.full_name),
            subject=f"[{project_name}] Announcement: {announcement_title}",
            html_body=html_body,
        )


async def send_task_assignment_email_to_users(
    settings: Settings,
    user_ids: Collection[UUID],
    project_id: UUID,
    project_name: str,
    task_title: str,
    due_date: date | None,
) -> None:
    if not user_ids:
        return

    async with db_module.SessionLocal() as db:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        recipients = list(users_result.scalars().all())

    due_str = f"<p><strong>Due Date:</strong> {due_date.isoformat()}</p>" if due_date else ""
    html_body = f"""
    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Task Assigned in {project_name}</h2>
        <p>You have been assigned to the following task:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">{task_title}</h3>
            {due_str}
        </div>
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from Teamy.</p>
    </div>
    """

    for user in recipients:
        await send_email(
            settings,
            EmailRecipient(email=user.email, name=user.full_name),
            subject=f"[{project_name}] Task Assigned: {task_title}",
            html_body=html_body,
        )


async def send_task_changes_requested_email_to_users(
    settings: Settings,
    user_ids: Collection[UUID],
    project_id: UUID,
    project_name: str,
    task_title: str,
    remarks: str | None,
) -> None:
    if not user_ids:
        return

    async with db_module.SessionLocal() as db:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        recipients = list(users_result.scalars().all())

    remarks_html = (
        f"<div style='background: #fff1f2; padding: 12px; border-radius: 6px; border-left: 4px solid #e11d48; margin-top: 12px;'><strong>Remarks:</strong> {remarks}</div>"
        if remarks
        else ""
    )
    html_body = f"""
    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e11d48;">Changes Requested in {project_name}</h2>
        <p>Revisions were requested on task <strong>{task_title}</strong>.</p>
        {remarks_html}
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This is an automated notification from Teamy.</p>
    </div>
    """

    for user in recipients:
        await send_email(
            settings,
            EmailRecipient(email=user.email, name=user.full_name),
            subject=f"[{project_name}] Changes Requested: {task_title}",
            html_body=html_body,
        )


async def send_task_ready_for_review_email_to_project_leaders(
    settings: Settings,
    project_id: UUID,
    project_name: str,
    task_title: str,
) -> None:
    async with db_module.SessionLocal() as db:
        leaders_result = await db.execute(
            select(User)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .where(ProjectMember.project_id == project_id, ProjectMember.role.in_(("leader", "co_leader")))
        )
        recipients = list(leaders_result.scalars().all())

    html_body = f"""
    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #059669;">Task Ready for Review in {project_name}</h2>
        <p>The task <strong>{task_title}</strong> has been submitted for review by the assigned team members.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This is an automated notification from Teamy.</p>
    </div>
    """

    for user in recipients:
        await send_email(
            settings,
            EmailRecipient(email=user.email, name=user.full_name),
            subject=f"[{project_name}] Task Submitted for Review: {task_title}",
            html_body=html_body,
        )


async def send_task_due_reminder_email(
    settings: Settings,
    recipient: EmailRecipient,
    project_id: UUID,
    project_name: str,
    task_title: str,
    due_date: date | None,
) -> None:
    due_str = f"<p><strong>Due Date:</strong> {due_date.isoformat()}</p>" if due_date else ""
    html_body = f"""
    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Task Due Reminder: {project_name}</h2>
        <p>This is a reminder for your upcoming task:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">{task_title}</h3>
            {due_str}
        </div>
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from Teamy.</p>
    </div>
    """
    await send_email(
        settings,
        recipient,
        subject=f"[{project_name}] Task Due Reminder: {task_title}",
        html_body=html_body,
    )


async def send_announcement_reminder_email(
    settings: Settings,
    recipient: EmailRecipient,
    project_id: UUID,
    project_name: str,
    announcement_title: str,
    deadline_date: date | None,
) -> None:
    deadline_str = f"<p><strong>Deadline:</strong> {deadline_date.isoformat()}</p>" if deadline_date else ""
    html_body = f"""
    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Announcement Reminder: {project_name}</h2>
        <p>This is a reminder for an announcement in {project_name}:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">{announcement_title}</h3>
            {deadline_str}
        </div>
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from Teamy.</p>
    </div>
    """
    await send_email(
        settings,
        recipient,
        subject=f"[{project_name}] Announcement Reminder: {announcement_title}",
        html_body=html_body,
    )
