import asyncio
import os
import sys

is_on_host = os.path.exists("backend-teamy")

if is_on_host:
    backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend-teamy")
    sys.path.append(backend_path)

    if os.path.exists(".env"):
        with open(".env") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    key = k.strip()
                    val = v.strip().strip('"').strip("'")
                    if key not in os.environ:
                        os.environ[key] = val

    db_url = os.environ.get("DATABASE_URL")
    if db_url and "@db:3306" in db_url:
        mysql_port = os.environ.get("MYSQL_PORT", "3307")
        db_url = db_url.replace("@db:3306", f"@localhost:{mysql_port}")
        os.environ["DATABASE_URL"] = db_url
else:
    backend_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(backend_path)

from sqlalchemy import text

from app.core.database import engine


async def delete_all():
    print("Connecting to the database to delete all contents...")

    tables = [
        "announcement_reads",
        "announcements",
        "notifications",
        "task_assignees",
        "task_file_links",
        "task_images",
        "tasks",
        "file_resources",
        "project_members",
        "projects",
        "users",
    ]

    async with engine.begin() as conn:
        await conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        for table in tables:
            await conn.execute(text(f"TRUNCATE TABLE `{table}`;"))
        await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

    print("Successfully deleted all database contents.")


if __name__ == "__main__":
    asyncio.run(delete_all())
