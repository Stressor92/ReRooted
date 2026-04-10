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
    date_text = Column(String, nullable=True)
    place_text = Column(String, nullable=True)

    person = relationship("Person", back_populates="images")
    file = relationship("File")

    @property
    def url(self) -> str | None:
        return self.file.url if self.file is not None else None

    @property
    def thumb_url(self) -> str | None:
        return self.file.thumb_url if self.file is not None else None

    @property
    def filename(self) -> str | None:
        if self.file is None or self.file.filename is None:
            return None
        return str(self.file.filename)

    @property
    def content_type(self) -> str | None:
        if self.file is None or self.file.content_type is None:
            return None
        return str(self.file.content_type)
