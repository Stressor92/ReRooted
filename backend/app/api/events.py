from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.event import Event
from app.models.person import Person
from app.schemas.event import EventCreate, EventOut, EventUpdate
from app.utils.date_parser import parse_flex_date

router = APIRouter(tags=["events"])


@router.get("/persons/{person_id}/events", response_model=list[EventOut])
def list_person_events(person_id: str, db: Annotated[Session, Depends(get_db)]):
    return (
        db.query(Event)
        .filter(Event.person_id == person_id)
        .order_by(Event.date_sort.asc().nullslast())
        .all()
    )


@router.post(
    "/persons/{person_id}/events", response_model=EventOut, status_code=status.HTTP_201_CREATED
)
def create_event(
    person_id: str,
    payload: EventCreate,
    db: Annotated[Session, Depends(get_db)],
):
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    parsed = parse_flex_date(payload.date_text)
    event = Event(
        person_id=person_id,
        event_type=payload.event_type,
        date_text=payload.date_text,
        date_sort=parsed.get("sort"),
        place_id=payload.place_id,
        description=payload.description,
        is_private=payload.is_private,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    payload: EventUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "date_text" in update_data:
        update_data["date_sort"] = parse_flex_date(update_data["date_text"]).get("sort")

    for key, value in update_data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, db: Annotated[Session, Depends(get_db)]):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return None
