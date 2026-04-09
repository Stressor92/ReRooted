from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from app.models import Confidence


class SourceCreate(BaseModel):
    title: str
    author: str | None = None
    date: str | None = None
    url: str | None = None
    file_id: str | None = None


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    author: str | None = None
    date: str | None = None
    url: str | None = None
    file_id: str | None = None


class CitationCreate(BaseModel):
    source_id: str
    person_id: str | None = None
    page: str | None = None
    confidence: Confidence = Confidence.MEDIUM


class CitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_id: str
    source_title: str | None = None
    event_id: str | None = None
    person_id: str | None = None
    page: str | None = None
    confidence: Confidence
