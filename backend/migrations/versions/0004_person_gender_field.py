"""Add gender field to persons.

Revision ID: 0004_person_gender_field
Revises: 0003_person_contact_fields, 0002_add_sibling_relationship_type
Create Date: 2026-04-11 00:10:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0004_person_gender_field"
down_revision = ("0003_person_contact_fields", "0002_add_sibling_relationship_type")
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("persons") as batch_op:
        batch_op.add_column(sa.Column("gender", sa.String(length=16), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("persons") as batch_op:
        batch_op.drop_column("gender")
