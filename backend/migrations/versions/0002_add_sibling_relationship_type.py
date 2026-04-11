"""Add sibling relationship type.

Revision ID: 0002_add_sibling_relationship_type
Revises: 0001_initial
Create Date: 2026-04-11 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_add_sibling_relationship_type"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

old_rel_type_enum = sa.Enum(
    "partner",
    "ex",
    "adoption",
    "foster",
    "unknown",
    name="reltype",
)

new_rel_type_enum = sa.Enum(
    "partner",
    "ex",
    "sibling",
    "adoption",
    "foster",
    "unknown",
    name="reltype",
)


def upgrade() -> None:
    with op.batch_alter_table("relationships", recreate="always") as batch_op:
        batch_op.alter_column(
            "rel_type",
            existing_type=old_rel_type_enum,
            type_=new_rel_type_enum,
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("relationships", recreate="always") as batch_op:
        batch_op.alter_column(
            "rel_type",
            existing_type=new_rel_type_enum,
            type_=old_rel_type_enum,
            existing_nullable=False,
        )
