from app.core.time_utils import ensure_utc
from app.modules.auth.models import User
from app.modules.auth.schemas import UserResponse
from app.modules.projects.models import ProjectMember


def serialize_account_user(user: User) -> UserResponse:
    return UserResponse.model_validate(user).model_copy(
        update={"username": None, "last_online_at": ensure_utc(user.last_online_at)}
    )


def serialize_project_user(user: User, member: ProjectMember | None) -> UserResponse:
    nickname = member.nickname if member is not None else None
    return UserResponse.model_validate(user).model_copy(
        update={"username": nickname, "last_online_at": ensure_utc(user.last_online_at)}
    )
