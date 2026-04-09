from __future__ import annotations

import uuid

from sqlalchemy import Column, String

from app.core.database import Base


class File(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    path = Column(String, nullable=False)

    @property
    def url(self) -> str:
        return f"/files/{self.id}"

    @property
    def thumb_url(self) -> str:
        return f"/files/{self.id}/thumb"

    def __repr__(self) -> str:
        return f"<File {self.filename!r}>"
