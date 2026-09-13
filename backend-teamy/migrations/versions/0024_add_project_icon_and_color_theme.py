"""add project icon and color theme fields

Revision ID: 0024_add_project_icon_color_theme
Revises: 0023_add_project_slug
Create Date: 2026-08-08 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0024_add_project_branding"
down_revision: str | None = "0023_add_project_slug"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("projects")]
    if "icon_url" not in columns:
        op.add_column("projects", sa.Column("icon_url", sa.String(length=500), nullable=True))
    if "icon_public_id" not in columns:
        op.add_column("projects", sa.Column("icon_public_id", sa.String(length=255), nullable=True))
    if "color_theme" not in columns:
        op.add_column("projects", sa.Column("color_theme", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "color_theme")
    op.drop_column("projects", "icon_public_id")
    op.drop_column("projects", "icon_url")
