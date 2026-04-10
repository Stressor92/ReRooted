"""Add person image metadata fields.

Revision ID: 0002_person_image_metadata
Revises: 0001_initial
Create Date: 2026-04-10 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_person_image_metadata"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("person_images", sa.Column("date_text", sa.String(), nullable=True))
    op.add_column("person_images", sa.Column("place_text", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("person_images", "place_text")
    op.drop_column("person_images", "date_text")
