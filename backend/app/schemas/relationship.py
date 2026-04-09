from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models import RelType


class RelationshipCreate(BaseModel):
    person1_id: str
    person2_id: str | None = None
    rel_type: RelType = RelType.PARTNER
    start_date: date | None = None
    end_date: date | None = None
    child_ids: list[str] = Field(default_factory=list)


class RelationshipUpdate(BaseModel):
    person1_id: str | None = None
    person2_id: str | None = None
    rel_type: RelType | None = None
    start_date: date | None = None
    end_date: date | None = None


class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    person1_id: str
    person2_id: str | None = None
    rel_type: RelType
    start_date: date | None = None
    end_date: date | None = None
    child_ids: list[str] = Field(default_factory=list)
