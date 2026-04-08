from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.models.relationship import RelType


class RelationshipCreate(BaseModel):
    person1_id: str
    person2_id: Optional[str] = None
    rel_type: RelType = RelType.PARTNER
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    child_ids: list[str] = Field(default_factory=list)


class RelationshipOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    person1_id: str
    person2_id: Optional[str]
    rel_type: RelType
    start_date: Optional[date]
    end_date: Optional[date]
