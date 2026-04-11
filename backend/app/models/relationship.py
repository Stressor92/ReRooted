from __future__ import annotations

import enum
import uuid

from sqlalchemy import Column, Date, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import relationship as orm_relationship

from app.core.database import Base


class RelType(str, enum.Enum):
    PARTNER = "partner"
    EX = "ex"
    SIBLING = "sibling"
    ADOPTION = "adoption"
    FOSTER = "foster"
    UNKNOWN = "unknown"


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person1_id = Column(String, ForeignKey("persons.id"), nullable=False, index=True)
    person2_id = Column(String, ForeignKey("persons.id"), nullable=True, index=True)
    rel_type: Mapped[RelType] = mapped_column(
        Enum(RelType), default=RelType.PARTNER, nullable=False
    )
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    person1 = orm_relationship("Person", foreign_keys=[person1_id])
    person2 = orm_relationship("Person", foreign_keys=[person2_id])
    children = orm_relationship(
        "RelationshipChild",
        back_populates="relationship",
        cascade="all, delete-orphan",
    )

    @property
    def child_ids(self) -> list[str]:
        return [str(child.child_id) for child in self.children]

    def __repr__(self) -> str:
        return f"<Relationship {self.rel_type} {self.person1_id} × {self.person2_id}>"


class RelationshipChild(Base):
    __tablename__ = "relationship_children"

    relationship_id = Column(String, ForeignKey("relationships.id"), primary_key=True)
    child_id = Column(String, ForeignKey("persons.id"), primary_key=True)

    relationship = orm_relationship("Relationship", back_populates="children")
    child = orm_relationship("Person")
