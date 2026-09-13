# Teamy

Teamy is a collaborative project workspace that brings task management, team communication, shared resources, planning, and activity visibility together in one place. It solves the problem of teams having to coordinate across disconnected tools by providing a shared, role-aware source of truth for day-to-day project work.

## What the project is for

Teamy is designed for teams that need a clear way to organize responsibilities, communicate changes, and keep project information easy to find. A team can create a workspace, invite or admit members, divide work into tasks, share documentation, publish announcements, and follow progress from a common project hub.

The project combines structured workflows with lightweight collaboration features. Members can see what needs attention, understand who is responsible for each item, participate in review flows, and receive notifications about important activity.

## Main capabilities

- **Project workspaces:** Create or join workspaces using a Teamy code, assign member roles, customize the project appearance, and archive or remove projects when they are no longer active.
- **Task organization:** Manage work through task boards, table views, personal task lists, timelines, due dates, start dates, assignees, reviewers, checklists, images, and task-specific notes.
- **Review workflows:** Move tasks through statuses such as backlog, in progress, review, and completed, with support for reviewer decisions and remarks.
- **Announcements:** Publish updates for the team, pin important notices, add deadlines, mark announcements as read, and keep a record of announcements that should remain visible.
- **Notifications:** Surface project events and reminders through in-app notifications, unread counts, realtime updates, and optional email delivery.
- **Shared resources:** Create rich-text Teamy Docs, link resources to tasks, and keep project knowledge in a shared location.
- **Planning and visibility:** Use dashboard summaries, activity feeds, deadline views, timeline/Gantt-style planning, and team presence to understand project health and current activity.
- **Realtime collaboration:** Receive live updates for task activity, announcements, notifications, and team presence while working in a project.
- **Project portability:** Export project information to a backup and import it into another workspace when needed.

## Project structure

Teamy is organized as two independent applications:

- `frontend-teamy/` — The browser application where users manage projects, tasks, announcements, resources, notifications, and team settings.
- `backend-teamy/` — The API responsible for authentication, authorization, project data, task workflows, notifications, file resources, uploads, and realtime connections.
- `docker-compose.yml` — Local development orchestration for the application services and supporting infrastructure.

## Technology stack

### Frontend

- React 19 and TypeScript
- Vite
- React Router
- Tailwind CSS
- TanStack Query for server-state management
- Axios for API communication
- Zustand for client-side state
- Motion and Lucide React for interface interactions and icons
- Zod for selected runtime response validation
- React Hot Toast for user feedback

### Backend

- Python 3.12+
- FastAPI and Uvicorn
- Pydantic Settings
- SQLAlchemy 2 with asynchronous database access
- Alembic for database migrations
- PyJWT-based session and short-lived realtime tickets
- HTTPX for external service communication
- Ruff, mypy, and Pyright for code quality and static analysis

### Data and services

- MySQL 8.4 for persistent project data
- Redis 7 for optional caching
- Docker and Docker Compose for local service orchestration
- Cloudinary for uploaded media
- Google OAuth for sign-in
- Brevo for optional transactional email delivery

## Running the project locally

The simplest local setup uses Docker Compose. Copy `.env.example` to `.env`, review the values, and start the services with:

```bash
docker compose up --build
```

The frontend is normally available at `http://localhost:5173`, while the API is available at `http://localhost:8000`. Google OAuth, Cloudinary, Brevo, and Redis are optional depending on which parts of the application you want to exercise. The backend README contains more detailed setup notes for the API, and the frontend can also be run independently with its npm scripts.

## Project status

The backend includes automated tests covering the primary API flows. The frontend currently focuses on the production application experience and does not contain a dedicated browser/unit test suite in the repository.
