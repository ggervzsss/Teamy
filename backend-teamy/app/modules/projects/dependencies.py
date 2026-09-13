from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.projects.models import Project, ProjectMember


def require_project_leader(membership: ProjectMember) -> None:
    if membership.role not in ("leader", "co_leader"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only workspace leaders or co-leaders can perform this action"
        )


def require_project_active(project: Project) -> None:
    if project.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This workspace is archived and read-only")


async def get_project_membership(
    project_id: Annotated[UUID, Path()],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[Project, ProjectMember]:
    result = await db.execute(
        select(Project, ProjectMember)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .where(Project.id == project_id, ProjectMember.user_id == user.id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return row[0], row[1]
