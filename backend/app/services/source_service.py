from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Citation, Event, Person, Source
from app.schemas.source import CitationCreate, CitationUpdate, SourceCreate


def _not_found(entity: str, item_id: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{entity} {item_id} not found")


def get_source(db: Session, source_id: str) -> Source:
    source = db.get(Source, source_id)
    if source is None:
        raise _not_found("Source", source_id)
    return source


def create_source(db: Session, data: SourceCreate) -> Source:
    source = Source(**data.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def list_sources(db: Session, search: str | None) -> list[Source]:
    stmt = select(Source).order_by(Source.title.asc())
    if search:
        pattern = f"%{search.strip()}%"
        if pattern != "%%":
            stmt = stmt.where(or_(Source.title.ilike(pattern), Source.author.ilike(pattern)))
    return list(db.scalars(stmt).all())


def delete_source(db: Session, source_id: str) -> None:
    source = get_source(db, source_id)
    db.delete(source)
    db.commit()


def add_citation(
    db: Session,
    source_id: str,
    event_id: str | None,
    person_id: str | None,
    data: CitationCreate,
) -> Citation:
    get_source(db, source_id)

    if event_id is None and person_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="A citation must reference an event or person",
        )

    if event_id is not None and db.get(Event, event_id) is None:
        raise _not_found("Event", event_id)

    if person_id is not None and db.get(Person, person_id) is None:
        raise _not_found("Person", person_id)

    citation = Citation(
        source_id=source_id,
        event_id=event_id,
        person_id=person_id,
        page=data.page,
        confidence=data.confidence,
    )
    db.add(citation)
    db.commit()
    db.refresh(citation)
    return get_citation(db, str(citation.id))


def get_citation(db: Session, citation_id: str) -> Citation:
    stmt = select(Citation).options(joinedload(Citation.source)).where(Citation.id == citation_id)
    citation = db.scalars(stmt).first()
    if citation is None:
        raise _not_found("Citation", citation_id)
    return citation


def get_citations_for_event(db: Session, event_id: str) -> list[Citation]:
    if db.get(Event, event_id) is None:
        raise _not_found("Event", event_id)

    stmt = (
        select(Citation)
        .options(joinedload(Citation.source))
        .where(Citation.event_id == event_id)
        .order_by(Citation.id.asc())
    )
    return list(db.scalars(stmt).all())


def get_citations_for_person(db: Session, person_id: str) -> list[Citation]:
    if db.get(Person, person_id) is None:
        raise _not_found("Person", person_id)

    stmt = (
        select(Citation)
        .options(joinedload(Citation.source))
        .where(Citation.person_id == person_id)
        .order_by(Citation.id.asc())
    )
    return list(db.scalars(stmt).all())


def update_citation(db: Session, citation_id: str, data: CitationUpdate) -> Citation:
    citation = get_citation(db, citation_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(citation, key, value)
    db.commit()
    db.refresh(citation)
    return get_citation(db, citation_id)


def delete_citation(db: Session, citation_id: str) -> None:
    citation = get_citation(db, citation_id)
    db.delete(citation)
    db.commit()
