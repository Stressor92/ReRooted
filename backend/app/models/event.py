import enum
import uuid

from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventType(str, enum.Enum):
    BIRTH = "birth"
    DEATH = "death"
    BAPTISM = "baptism"
    MARRIAGE = "marriage"
    DIVORCE = "divorce"
    EMIGRATION = "emigration"
    IMMIGRATION = "immigration"
    OCCUPATION = "occupation"
    RESIDENCE = "residence"
    OTHER = "other"


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id = Column(String, ForeignKey("persons.id"), nullable=False, index=True)
    event_type: Mapped[EventType] = mapped_column(Enum(EventType), nullable=False)
    date_text = Column(String, nullable=True)
    date_sort = Column(Date, nullable=True)
    place_id = Column(String, ForeignKey("places.id"), nullable=True)
    description = Column(String, nullable=True)
    is_private = Column(Boolean, default=False, nullable=False)

    person = relationship("Person", back_populates="events")
    place = relationship("Place")
    citations = relationship("Citation", back_populates="event", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Event {self.event_type} person={self.person_id}>"
