"""extension_settings table

Revision ID: 0003_cdr
Revises: 0002_cdr
Create Date: 2026-06-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_cdr"
down_revision: Union[str, Sequence[str], None] = "0002_cdr"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "extension_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("instance_id", sa.Integer(), nullable=False),
        sa.Column("extension", sa.String(length=40), nullable=False),
        sa.Column(
            "auto_routing_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "forwarding_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "instance_id",
            "extension",
            name="uq_extension_settings",
        ),
    )
    op.create_index(
        "ix_extension_settings_instance_id",
        "extension_settings",
        ["instance_id"],
    )
    op.create_index(
        "ix_extension_settings_extension",
        "extension_settings",
        ["extension"],
    )


def downgrade() -> None:
    op.drop_index("ix_extension_settings_extension", table_name="extension_settings")
    op.drop_index("ix_extension_settings_instance_id", table_name="extension_settings")
    op.drop_table("extension_settings")
