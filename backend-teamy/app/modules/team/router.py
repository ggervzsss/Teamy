from collections import defaultdict
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import app.core.database as db_module
from app.core.cache import invalidate_project
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_team_socket_ticket, decode_session_token, decode_team_socket_ticket
from app.core.time_utils import ensure_utc
from app.core.user_responses import serialize_project_user
from app.modules.auth.models import User
from app.modules.projects.dependencies import get_project_membership, require_project_active
from app.modules.projects.models import Project, ProjectMember
from app.modules.team.schemas import (
    ProjectMemberNicknameUpdateRequest,
    ProjectMemberPresenceResponse,
    ProjectMemberResponse,
    ProjectMemberRoleUpdateRequest,
    ProjectPresenceResponse,
    TeamSocketTicketResponse,
)


class TeamConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[UUID, set[WebSocket]] = defaultdict(set)
        self.connection_users: dict[int, tuple[UUID, UUID]] = {}
        self.project_user_connection_counts: dict[UUID, dict[UUID, int]] = defaultdict(lambda: defaultdict(int))

    async def connect(self, project_id: UUID, user_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[project_id].add(websocket)
        self.connection_users[id(websocket)] = (project_id, user_id)
        self.project_user_connection_counts[project_id][user_id] += 1

    def disconnect(self, websocket: WebSocket) -> tuple[UUID, UUID, bool] | None:
        connection = self.connection_users.pop(id(websocket), None)
        if connection is None:
            return None

        project_id, user_id = connection
        self.active_connections[project_id].discard(websocket)
        if not self.active_connections[project_id]:
            del self.active_connections[project_id]

        user_counts = self.project_user_connection_counts[project_id]
        user_counts[user_id] -= 1
        became_offline = user_counts[user_id] <= 0
        if became_offline:
            del user_counts[user_id]
        if not user_counts:
            del self.project_user_connection_counts[project_id]
        return project_id, user_id, became_offline

    def is_user_online(self, project_id: UUID, user_id: UUID) -> bool:
        return self.project_user_connection_counts.get(project_id, {}).get(user_id, 0) > 0

    async def broadcast_member_joined(self, project_id: UUID, member: ProjectMemberResponse) -> None:
        payload = jsonable_encoder({"event": "team.member_joined", "member": member})
        await self.broadcast(project_id, payload)

    async def broadcast_presence(self, project_id: UUID, members: list[ProjectMemberPresenceResponse]) -> None:
        payload = jsonable_encoder({"event": "team.presence", "members": members})
        await self.broadcast(project_id, payload)

    async def send_presence(self, websocket: WebSocket, members: list[ProjectMemberPresenceResponse]) -> None:
        await websocket.send_json(jsonable_encoder({"event": "team.presence", "members": members}))

    async def broadcast(self, project_id: UUID, payload: dict) -> None:
        encoded_payload = jsonable_encoder(payload)
        dead_connections: list[WebSocket] = []
        for websocket in self.active_connections.get(project_id, set()).copy():
            try:
                await websocket.send_json(encoded_payload)
            except RuntimeError:
                dead_connections.append(websocket)

        for websocket in dead_connections:
            self.disconnect(websocket)


manager = TeamConnectionManager()


async def serialize_project_member(db: AsyncSession, member: ProjectMember) -> ProjectMemberResponse:
    user = await db.get(User, member.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Project member user could not be loaded"
        )

    return ProjectMemberResponse(
        id=member.id,
        user=serialize_project_user(user, member),
        role=member.role,
        nickname=member.nickname,
        joined_at=member.joined_at,
    )


async def serialize_project_presence_members(db: AsyncSession, project_id: UUID) -> list[ProjectMemberPresenceResponse]:
    result = await db.execute(
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.role.asc(), User.full_name.asc(), User.email.asc())
    )
    return [
        ProjectMemberPresenceResponse(
            id=member.id,
            user=serialize_project_user(user, member),
            role=member.role,
            nickname=member.nickname,
            joined_at=member.joined_at,
            is_online=manager.is_user_online(project_id, user.id),
            last_online_at=ensure_utc(user.last_online_at),
        )
        for member, user in result.all()
    ]


async def touch_user_last_online(db: AsyncSession, user_id: UUID) -> None:
    user = await db.get(User, user_id)
    if user is not None:
        user.last_online_at = datetime.now(UTC)
        await db.commit()


async def broadcast_presence(db: AsyncSession, project_id: UUID) -> None:
    await manager.broadcast_presence(project_id, await serialize_project_presence_members(db, project_id))


async def broadcast_member_joined(db: AsyncSession, project_id: UUID, member: ProjectMember) -> None:
    await manager.broadcast_member_joined(project_id, await serialize_project_member(db, member))


router = APIRouter(prefix="/projects/{project_id}/members", tags=["team"])


@router.get("/ws-ticket", response_model=TeamSocketTicketResponse)
async def create_team_socket_ticket_endpoint(
    user: Annotated[User, Depends(get_current_user)],
    membership: Annotated[tuple[Project, ProjectMember], Depends(get_project_membership)],
    settings=Depends(get_settings),
) -> TeamSocketTicketResponse:
    project, _ = membership
    return TeamSocketTicketResponse(ticket=create_team_socket_ticket(user.id, project.id, settings))


@router.get("/presence", response_model=ProjectPresenceResponse)
async def list_project_presence(
    membership: Annotated[tuple[Project, ProjectMember], Depends(get_project_membership)],
    db=Depends(get_db),
) -> ProjectPresenceResponse:
    project, _ = membership
    return ProjectPresenceResponse(members=await serialize_project_presence_members(db, project.id))


@router.patch("/{member_id}/nickname", response_model=ProjectMemberResponse)
async def update_project_member_nickname(
    member_id: UUID,
    payload: ProjectMemberNicknameUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    membership: Annotated[tuple[Project, ProjectMember], Depends(get_project_membership)],
    db=Depends(get_db),
) -> ProjectMemberResponse:
    project, current_member = membership
    require_project_active(project)
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project.id, ProjectMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project member not found")
    if current_member.role not in ("leader", "co_leader") and member.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only project leaders or the member can change this nickname"
        )

    nickname = payload.nickname.strip() if payload.nickname is not None else ""
    if nickname and (nickname != payload.nickname or nickname[0].isspace() or nickname[-1].isspace()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nickname cannot start or end with spaces"
        )
    member.nickname = nickname or None
    await db.commit()
    await invalidate_project(project.id)
    await db.refresh(member)

    response = await serialize_project_member(db, member)
    await manager.broadcast(project.id, {"event": "team.member_updated", "member": response})
    await broadcast_presence(db, project.id)
    return response


@router.patch("/{member_id}/role", response_model=ProjectMemberResponse)
async def update_project_member_role(
    member_id: UUID,
    payload: ProjectMemberRoleUpdateRequest,
    membership: Annotated[tuple[Project, ProjectMember], Depends(get_project_membership)],
    db=Depends(get_db),
) -> ProjectMemberResponse:
    project, current_member = membership
    require_project_active(project)
    if current_member.role not in ("leader", "co_leader"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only project leaders or co-leaders can change member roles"
        )

    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project.id, ProjectMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project member not found")
    if member.role == "leader":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change the primary Workspace Leader role"
        )

    member.role = payload.role
    await db.commit()
    await invalidate_project(project.id)
    await db.refresh(member)

    response = await serialize_project_member(db, member)
    await manager.broadcast(project.id, {"event": "team.member_updated", "member": response})
    await broadcast_presence(db, project.id)
    return response


@router.websocket("/ws")
async def team_updates(websocket: WebSocket, project_id: UUID) -> None:
    settings = get_settings()
    ticket = websocket.query_params.get("ticket")

    if ticket:
        try:
            user_id, ticket_project_id = decode_team_socket_ticket(ticket, settings)
        except HTTPException:
            await websocket.accept()
            await websocket.close(code=1008)
            return
        if ticket_project_id != project_id:
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
        result = await db.execute(
            select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        )
        if result.scalar_one_or_none() is None:
            await websocket.accept()
            await websocket.close(code=1008)
            return

    await manager.connect(project_id, user_id, websocket)
    async with db_module.SessionLocal() as db:
        await broadcast_presence(db, project_id)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        disconnected = manager.disconnect(websocket)
        if disconnected is not None:
            disconnected_project_id, disconnected_user_id, became_offline = disconnected
            async with db_module.SessionLocal() as db:
                if became_offline:
                    await touch_user_last_online(db, disconnected_user_id)
                await broadcast_presence(db, disconnected_project_id)
