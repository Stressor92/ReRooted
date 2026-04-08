import uuid

from sqlalchemy import Column, Float, String

from app.core.database import Base


class Place(Base):
    __tablename__ = "places"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    gramps_id = Column(String, nullable=True, index=True)

    def __repr__(self) -> str:
        return f"<Place {self.name!r}>"
