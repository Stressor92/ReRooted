"""Add current address and phone number to persons.

Revision ID: 0003_person_contact_fields
Revises: 0002_person_image_metadata
Create Date: 2026-04-10 00:00:01
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0003_person_contact_fields"
down_revision = "0002_person_image_metadata"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("persons", sa.Column("current_address", sa.String(), nullable=True))
    op.add_column("persons", sa.Column("phone_number", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("persons", "phone_number")
    op.drop_column("persons", "current_address")
