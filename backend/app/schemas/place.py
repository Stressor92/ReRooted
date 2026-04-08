from typing import Optional

from pydantic import BaseModel


class PlaceCreate(BaseModel):
    name: str
    full_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gramps_id: Optional[str] = None


class PlaceOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    full_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    gramps_id: Optional[str]
