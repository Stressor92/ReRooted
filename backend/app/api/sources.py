from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.source import CitationCreate, CitationOut, CitationUpdate, SourceCreate, SourceOut
from app.services import source_service

router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=list[SourceOut])
def list_sources(
    db: Annotated[Session, Depends(get_db)],
    search: Annotated[str | None, Query()] = None,
):
    return source_service.list_sources(db, search)


@router.post("/sources", response_model=SourceOut, status_code=status.HTTP_201_CREATED)
def create_source(payload: SourceCreate, db: Annotated[Session, Depends(get_db)]):
    return source_service.create_source(db, payload)


@router.get("/sources/{source_id}", response_model=SourceOut)
def get_source(source_id: str, db: Annotated[Session, Depends(get_db)]):
    return source_service.get_source(db, source_id)


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(source_id: str, db: Annotated[Session, Depends(get_db)]):
    source_service.delete_source(db, source_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/events/{event_id}/citations",
    response_model=CitationOut,
    status_code=status.HTTP_201_CREATED,
)
def add_event_citation(
    event_id: str,
    payload: CitationCreate,
    db: Annotated[Session, Depends(get_db)],
):
    return source_service.add_citation(db, payload.source_id, event_id, payload.person_id, payload)


@router.post(
    "/persons/{person_id}/citations",
    response_model=CitationOut,
    status_code=status.HTTP_201_CREATED,
)
def add_person_citation(
    person_id: str,
    payload: CitationCreate,
    db: Annotated[Session, Depends(get_db)],
):
    return source_service.add_citation(db, payload.source_id, None, person_id, payload)


@router.get("/events/{event_id}/citations", response_model=list[CitationOut])
def list_event_citations(event_id: str, db: Annotated[Session, Depends(get_db)]):
    return source_service.get_citations_for_event(db, event_id)


@router.get("/persons/{person_id}/citations", response_model=list[CitationOut])
def list_person_citations(person_id: str, db: Annotated[Session, Depends(get_db)]):
    return source_service.get_citations_for_person(db, person_id)


@router.patch("/citations/{citation_id}", response_model=CitationOut)
def update_citation(
    citation_id: str,
    payload: CitationUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    return source_service.update_citation(db, citation_id, payload)


@router.delete("/citations/{citation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_citation(citation_id: str, db: Annotated[Session, Depends(get_db)]):
    source_service.delete_citation(db, citation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
