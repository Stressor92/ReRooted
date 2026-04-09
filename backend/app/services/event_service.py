from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Event, Person, Place
from app.schemas.event import EventCreate, EventUpdate
from app.utils.date_parser import parse_flex_date


def _not_found(entity: str, item_id: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{entity} {item_id} not found")


def _ensure_person_exists(db: Session, person_id: str) -> None:
    if db.get(Person, person_id) is None:
        raise _not_found("Person", person_id)


def _ensure_place_exists(db: Session, place_id: str) -> None:
    if db.get(Place, place_id) is None:
        raise _not_found("Place", place_id)


def _get_event_or_404(db: Session, event_id: str) -> Event:
    stmt = select(Event).options(joinedload(Event.place)).where(Event.id == event_id)
    event = db.scalars(stmt).first()
    if event is None:
        raise _not_found("Event", event_id)
    return event


def create_event(db: Session, person_id: str, data: EventCreate) -> Event:
    _ensure_person_exists(db, person_id)
    if data.place_id is not None:
        _ensure_place_exists(db, data.place_id)

    parsed = parse_flex_date(data.date_text)
    event = Event(
        person_id=person_id,
        event_type=data.event_type,
        date_text=data.date_text,
        date_sort=parsed["sort"],
        place_id=data.place_id,
        description=data.description,
        is_private=data.is_private,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _get_event_or_404(db, str(event.id))


def update_event(db: Session, event_id: str, data: EventUpdate) -> Event:
    event = _get_event_or_404(db, event_id)
    update_data = data.model_dump(exclude_unset=True)

    if "place_id" in update_data and update_data["place_id"] is not None:
        _ensure_place_exists(db, update_data["place_id"])

    if "date_text" in update_data:
        update_data["date_sort"] = parse_flex_date(update_data["date_text"])["sort"]

    for key, value in update_data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return _get_event_or_404(db, event_id)


def delete_event(db: Session, event_id: str) -> None:
    event = _get_event_or_404(db, event_id)
    db.delete(event)
    db.commit()


def get_events_for_person(db: Session, person_id: str) -> list[Event]:
    _ensure_person_exists(db, person_id)
    stmt = (
        select(Event)
        .options(joinedload(Event.place))
        .where(Event.person_id == person_id)
        .order_by(Event.date_sort.asc().nullslast(), Event.id.asc())
    )
    return list(db.scalars(stmt).all())
