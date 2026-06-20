"""ast_config.var_val: 128 -> 512

Revision ID: 0005_cdr
Revises: 0004_cdr
Create Date: 2026-06-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_cdr"
down_revision: Union[str, Sequence[str], None] = "0004_cdr"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "ast_config",
        "var_val",
        existing_type=sa.String(length=128),
        type_=sa.String(length=512),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "ast_config",
        "var_val",
        existing_type=sa.String(length=512),
        type_=sa.String(length=128),
        existing_nullable=False,
    )
