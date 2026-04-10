from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.event import EventOut
from app.schemas.place import PlaceOut


class PersonCreate(BaseModel):
    first_name: str
    last_name: str
    is_living: bool | None = None
    birth_place_id: str | None = None
    description: str | None = None
    current_address: str | None = None
    phone_number: str | None = None
    gramps_id: str | None = None


class PersonUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    is_living: bool | None = None
    birth_place_id: str | None = None
    description: str | None = None
    current_address: str | None = None
    phone_number: str | None = None
    gramps_id: str | None = None
    profile_image_id: str | None = None


class PersonImageUpdate(BaseModel):
    caption: str | None = None
    date_text: str | None = None
    place_text: str | None = None
    is_profile: bool | None = None


class PersonImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_id: str
    is_profile: bool = False
    caption: str | None = None
    date_text: str | None = None
    place_text: str | None = None
    filename: str | None = None
    content_type: str | None = None
    url: str | None = None
    thumb_url: str | None = None


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str
    is_living: bool | None = None
    birth_place_id: str | None = None
    description: str | None = None
    current_address: str | None = None
    phone_number: str | None = None
    gramps_id: str | None = None
    profile_image_url: str | None = None


class PersonDetail(PersonOut):
    events: list[EventOut] = Field(default_factory=list)
    birth_place: PlaceOut | None = None
    images: list[PersonImageOut] = Field(default_factory=list)
