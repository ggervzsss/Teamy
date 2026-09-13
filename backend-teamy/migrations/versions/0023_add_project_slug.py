"""add project slug

Revision ID: 0023_add_project_slug
Revises: 0022_create_task_images
Create Date: 2026-08-06 00:00:00.000000
"""

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0023_add_project_slug"
down_revision: str | None = "0022_create_task_images"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def generate_slug(name: str, teamy_code: str) -> str:
    slug_part = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    if not slug_part:
        slug_part = "project"
    code_suffix = re.sub(r"[^a-zA-Z0-9]", "", teamy_code.replace("TMY", "", 1)).lower()
    return f"{slug_part}-{code_suffix}"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("projects")]
    if "slug" not in columns:
        op.add_column("projects", sa.Column("slug", sa.String(length=200), nullable=True))
    result = bind.execute(sa.text("SELECT id, name, teamy_code FROM projects"))
    for project_id, name, teamy_code in result.fetchall():
        slug = generate_slug(str(name or ""), str(teamy_code or ""))
        bind.execute(
            sa.text("UPDATE projects SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": project_id},
        )

    op.alter_column("projects", "slug", existing_type=sa.String(length=200), nullable=False)
    op.create_index(op.f("ix_projects_slug"), "projects", ["slug"], unique=True)
    op.create_unique_constraint("uq_projects_slug", "projects", ["slug"])


def downgrade() -> None:
    op.drop_constraint("uq_projects_slug", "projects", type_="unique")
    op.drop_index(op.f("ix_projects_slug"), table_name="projects")
    op.drop_column("projects", "slug")
