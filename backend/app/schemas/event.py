from datetime import date
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.event import EventType


class EventCreate(BaseModel):
    event_type: EventType
    date_text: Optional[str] = None
    place_id: Optional[str] = None
    description: Optional[str] = None
    is_private: bool = False

    @field_validator("date_text")
    @classmethod
    def strip_date(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value else value


class EventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    date_text: Optional[str] = None
    place_id: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None


class EventOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    person_id: str
    event_type: EventType
    date_text: Optional[str]
    date_sort: Optional[date]
    place_id: Optional[str]
    description: Optional[str]
    is_private: bool
