from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, field_validator

from app.models import EventType


class EventCreate(BaseModel):
    event_type: EventType
    date_text: str | None = None
    place_id: str | None = None
    description: str | None = None
    is_private: bool = False

    @field_validator("date_text")
    @classmethod
    def strip_date(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class EventUpdate(BaseModel):
    event_type: EventType | None = None
    date_text: str | None = None
    place_id: str | None = None
    description: str | None = None
    is_private: bool | None = None

    @field_validator("date_text")
    @classmethod
    def strip_date(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    person_id: str
    event_type: EventType
    date_text: str | None = None
    date_sort: date | None = None
    place_id: str | None = None
    place_name: str | None = None
    description: str | None = None
    is_private: bool
