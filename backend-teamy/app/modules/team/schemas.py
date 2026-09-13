from datetime import datetime

from app.core.schemas import ApiModel
from app.modules.projects.schemas import (
    ProjectMemberNicknameUpdateRequest,
    ProjectMemberResponse,
    ProjectMemberRoleUpdateRequest,
)


class ProjectMemberPresenceResponse(ProjectMemberResponse):
    is_online: bool
    last_online_at: datetime | None = None


class ProjectPresenceResponse(ApiModel):
    members: list[ProjectMemberPresenceResponse]


class TeamSocketTicketResponse(ApiModel):
    ticket: str


__all__ = [
    "ProjectMemberNicknameUpdateRequest",
    "ProjectMemberPresenceResponse",
    "ProjectMemberRoleUpdateRequest",
    "ProjectPresenceResponse",
    "TeamSocketTicketResponse",
]
