import enum
import uuid

from sqlalchemy import Column, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Confidence(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    author = Column(String, nullable=True)
    date = Column(String, nullable=True)
    url = Column(String, nullable=True)
    file_id = Column(String, ForeignKey("files.id"), nullable=True)

    file = relationship("File")
    citations = relationship("Citation", back_populates="source", cascade="all, delete-orphan")


class Citation(Base):
    __tablename__ = "citations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String, ForeignKey("sources.id"), nullable=False, index=True)
    person_id = Column(String, ForeignKey("persons.id"), nullable=True, index=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=True, index=True)
    page = Column(String, nullable=True)
    confidence: Mapped[Confidence] = mapped_column(
        Enum(Confidence), default=Confidence.MEDIUM, nullable=False
    )

    source = relationship("Source", back_populates="citations")
    person = relationship("Person")
    event = relationship("Event", back_populates="citations")
