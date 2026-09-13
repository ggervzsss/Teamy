"""create task images

Revision ID: 0022_create_task_images
Revises: 0021_add_performance_indexes
Create Date: 2026-06-11 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0022_create_task_images"
down_revision: str | None = "0021_add_perf_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task_images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("cloudinary_public_id", sa.String(length=255), nullable=True),
        sa.Column("ticket_item_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_images_task_id"), "task_images", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_images_uploaded_by_user_id"), "task_images", ["uploaded_by_user_id"], unique=False)
    op.create_index(op.f("ix_task_images_ticket_item_id"), "task_images", ["ticket_item_id"], unique=False)
    op.create_index(op.f("ix_task_images_created_at"), "task_images", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_task_images_created_at"), table_name="task_images")
    op.drop_index(op.f("ix_task_images_ticket_item_id"), table_name="task_images")
    op.drop_index(op.f("ix_task_images_uploaded_by_user_id"), table_name="task_images")
    op.drop_index(op.f("ix_task_images_task_id"), table_name="task_images")
    op.drop_table("task_images")
