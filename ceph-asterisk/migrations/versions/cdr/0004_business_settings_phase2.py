"""business settings phase 2: DND, recording, incoming routes, feature codes

Revision ID: 0004_cdr
Revises: 0003_cdr
Create Date: 2026-06-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_cdr"
down_revision: Union[str, Sequence[str], None] = "0003_cdr"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "extension_settings",
        sa.Column(
            "dnd_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "extension_settings",
        sa.Column(
            "call_recording_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "extension_settings",
        sa.Column("moh_class", sa.String(length=40), nullable=True),
    )

    op.create_table(
        "incoming_routes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("instance_id", sa.Integer(), nullable=False),
        sa.Column("did", sa.String(length=40), nullable=False),
        sa.Column(
            "context",
            sa.String(length=40),
            nullable=False,
            server_default="from-external",
        ),
        sa.Column("destination_type", sa.String(length=20), nullable=False),
        sa.Column("destination_value", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=120), nullable=True),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "instance_id",
            "context",
            "did",
            name="uq_incoming_route_did",
        ),
    )
    op.create_index(
        "ix_incoming_routes_instance_id",
        "incoming_routes",
        ["instance_id"],
    )

    op.create_table(
        "feature_codes_settings",
        sa.Column("instance_id", sa.Integer(), nullable=False),
        sa.Column("vm_access", sa.String(length=20), nullable=False, server_default="*97"),
        sa.Column("vm_check", sa.String(length=20), nullable=False, server_default="*98"),
        sa.Column(
            "cf_activate",
            sa.String(length=20),
            nullable=False,
            server_default="*72",
        ),
        sa.Column(
            "cf_deactivate",
            sa.String(length=20),
            nullable=False,
            server_default="*73",
        ),
        sa.Column(
            "dnd_activate",
            sa.String(length=20),
            nullable=False,
            server_default="*78",
        ),
        sa.Column(
            "dnd_deactivate",
            sa.String(length=20),
            nullable=False,
            server_default="*79",
        ),
        sa.Column(
            "vm_access_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "vm_check_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "cf_codes_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "dnd_codes_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.PrimaryKeyConstraint("instance_id"),
    )


def downgrade() -> None:
    op.drop_table("feature_codes_settings")
    op.drop_index("ix_incoming_routes_instance_id", table_name="incoming_routes")
    op.drop_table("incoming_routes")
    op.drop_column("extension_settings", "moh_class")
    op.drop_column("extension_settings", "call_recording_enabled")
    op.drop_column("extension_settings", "dnd_enabled")
