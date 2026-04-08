import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class PersonImage(Base):
    __tablename__ = "person_images"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_id = Column(String, ForeignKey("persons.id"), nullable=False, index=True)
    file_id = Column(String, ForeignKey("files.id"), nullable=False)
    is_profile = Column(Boolean, default=False, nullable=False)
    caption = Column(String, nullable=True)

    person = relationship("Person", back_populates="images")
    file = relationship("File")
