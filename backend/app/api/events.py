from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.event import EventCreate, EventOut, EventUpdate
from app.services import event_service

router = APIRouter(tags=["events"])


@router.get("/persons/{person_id}/events", response_model=list[EventOut])
def list_person_events(person_id: str, db: Annotated[Session, Depends(get_db)]):
    return event_service.get_events_for_person(db, person_id)


@router.post(
    "/persons/{person_id}/events",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
)
def create_event(
    person_id: str,
    payload: EventCreate,
    db: Annotated[Session, Depends(get_db)],
):
    return event_service.create_event(db, person_id, payload)


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    payload: EventUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    return event_service.update_event(db, event_id, payload)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, db: Annotated[Session, Depends(get_db)]):
    event_service.delete_event(db, event_id)
    return None
