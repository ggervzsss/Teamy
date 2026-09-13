from fastapi import APIRouter

from app.modules.announcements.router import router as announcements_router
from app.modules.auth.router import router as auth_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.filehub.router import router as filehub_router
from app.modules.notifications.router import router as notifications_router
from app.modules.projects.router import router as projects_router
from app.modules.tasks.router import router as tasks_router
from app.modules.team.router import router as team_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(dashboard_router)
api_router.include_router(filehub_router)
api_router.include_router(tasks_router)
api_router.include_router(announcements_router)
api_router.include_router(notifications_router)
api_router.include_router(team_router)
