from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_validator


class PlaceCreate(BaseModel):
    name: str
    full_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    gramps_id: str | None = None

    @field_validator("name", "full_name")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class PlaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    full_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
