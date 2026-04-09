"""Initial schema for ReRooted.

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-08 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


event_type_enum = sa.Enum(
    "birth",
    "death",
    "baptism",
    "marriage",
    "divorce",
    "emigration",
    "immigration",
    "occupation",
    "residence",
    "other",
    name="eventtype",
)

rel_type_enum = sa.Enum(
    "partner",
    "ex",
    "adoption",
    "foster",
    "unknown",
    name="reltype",
)

confidence_enum = sa.Enum("low", "medium", "high", name="confidence")


def upgrade() -> None:
    op.create_table(
        "places",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("gramps_id", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_places_gramps_id"), "places", ["gramps_id"], unique=False)

    op.create_table(
        "files",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("path", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sources",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("author", sa.String(), nullable=True),
        sa.Column("date", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("file_id", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["file_id"], ["files.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "persons",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("is_living", sa.Boolean(), nullable=True),
        sa.Column("birth_place_id", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("gramps_id", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["birth_place_id"], ["places.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_persons_gramps_id"), "persons", ["gramps_id"], unique=False)

    op.create_table(
        "person_images",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("person_id", sa.String(), nullable=False),
        sa.Column("file_id", sa.String(), nullable=False),
        sa.Column("is_profile", sa.Boolean(), nullable=False),
        sa.Column("caption", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["file_id"], ["files.id"]),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_person_images_person_id"), "person_images", ["person_id"], unique=False
    )

    op.create_table(
        "events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("person_id", sa.String(), nullable=False),
        sa.Column("event_type", event_type_enum, nullable=False),
        sa.Column("date_text", sa.String(), nullable=True),
        sa.Column("date_sort", sa.Date(), nullable=True),
        sa.Column("place_id", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("is_private", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"]),
        sa.ForeignKeyConstraint(["place_id"], ["places.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_events_person_id"), "events", ["person_id"], unique=False)

    op.create_table(
        "citations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("person_id", sa.String(), nullable=True),
        sa.Column("event_id", sa.String(), nullable=True),
        sa.Column("page", sa.String(), nullable=True),
        sa.Column("confidence", confidence_enum, nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["person_id"], ["persons.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_citations_event_id"), "citations", ["event_id"], unique=False)
    op.create_index(op.f("ix_citations_person_id"), "citations", ["person_id"], unique=False)
    op.create_index(op.f("ix_citations_source_id"), "citations", ["source_id"], unique=False)

    op.create_table(
        "relationships",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("person1_id", sa.String(), nullable=False),
        sa.Column("person2_id", sa.String(), nullable=True),
        sa.Column("rel_type", rel_type_enum, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(["person1_id"], ["persons.id"]),
        sa.ForeignKeyConstraint(["person2_id"], ["persons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_relationships_person1_id"), "relationships", ["person1_id"], unique=False
    )
    op.create_index(
        op.f("ix_relationships_person2_id"), "relationships", ["person2_id"], unique=False
    )

    op.create_table(
        "relationship_children",
        sa.Column("relationship_id", sa.String(), nullable=False),
        sa.Column("child_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["child_id"], ["persons.id"]),
        sa.ForeignKeyConstraint(["relationship_id"], ["relationships.id"]),
        sa.PrimaryKeyConstraint("relationship_id", "child_id"),
    )


def downgrade() -> None:
    op.drop_table("relationship_children")
    op.drop_index(op.f("ix_relationships_person2_id"), table_name="relationships")
    op.drop_index(op.f("ix_relationships_person1_id"), table_name="relationships")
    op.drop_table("relationships")
    op.drop_index(op.f("ix_citations_source_id"), table_name="citations")
    op.drop_index(op.f("ix_citations_person_id"), table_name="citations")
    op.drop_index(op.f("ix_citations_event_id"), table_name="citations")
    op.drop_table("citations")
    op.drop_index(op.f("ix_events_person_id"), table_name="events")
    op.drop_table("events")
    op.drop_index(op.f("ix_person_images_person_id"), table_name="person_images")
    op.drop_table("person_images")
    op.drop_index(op.f("ix_persons_gramps_id"), table_name="persons")
    op.drop_table("persons")
    op.drop_table("sources")
    op.drop_table("files")
    op.drop_index(op.f("ix_places_gramps_id"), table_name="places")
    op.drop_table("places")

    confidence_enum.drop(op.get_bind(), checkfirst=False)
    rel_type_enum.drop(op.get_bind(), checkfirst=False)
    event_type_enum.drop(op.get_bind(), checkfirst=False)
