"""extension_forwarding table

Revision ID: 0002_cdr
Revises: 0001_cdr
Create Date: 2026-06-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_cdr"
down_revision: Union[str, Sequence[str], None] = "0001_cdr"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "extension_forwarding",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("instance_id", sa.Integer(), nullable=False),
        sa.Column("extension", sa.String(length=40), nullable=False),
        sa.Column("forward_type", sa.String(length=8), nullable=False),
        sa.Column("target_type", sa.String(length=16), nullable=False),
        sa.Column("target_value", sa.String(length=80), nullable=False),
        sa.Column("timeout_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "instance_id",
            "extension",
            "forward_type",
            name="uq_extension_forwarding_rule",
        ),
    )
    op.create_index(
        "ix_extension_forwarding_instance_id",
        "extension_forwarding",
        ["instance_id"],
    )
    op.create_index(
        "ix_extension_forwarding_extension",
        "extension_forwarding",
        ["extension"],
    )


def downgrade() -> None:
    op.drop_index("ix_extension_forwarding_extension", table_name="extension_forwarding")
    op.drop_index(
        "ix_extension_forwarding_instance_id", table_name="extension_forwarding"
    )
    op.drop_table("extension_forwarding")
