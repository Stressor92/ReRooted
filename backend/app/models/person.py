import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Person(Base):
    __tablename__ = "persons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    is_living = Column(Boolean, nullable=True)
    birth_place_id = Column(String, ForeignKey("places.id"), nullable=True)
    description = Column(String, nullable=True)
    gramps_id = Column(String, nullable=True, index=True)

    birth_place = relationship("Place", foreign_keys=[birth_place_id])
    events = relationship("Event", back_populates="person", cascade="all, delete-orphan")
    images = relationship("PersonImage", back_populates="person", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Person {self.first_name} {self.last_name}>"
