from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.person import PersonCreate, PersonOut, PersonUpdate
from app.services import person_service

router = APIRouter(tags=["persons"])


@router.get("/persons", response_model=list[PersonOut])
def list_persons(db: Annotated[Session, Depends(get_db)]):
    return person_service.list_persons(db)


@router.post("/persons", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonCreate, db: Annotated[Session, Depends(get_db)]):
    return person_service.create_person(db, payload)


@router.get("/persons/{person_id}", response_model=PersonOut)
def get_person(person_id: str, db: Annotated[Session, Depends(get_db)]):
    return person_service.get_person(db, person_id)


@router.put("/persons/{person_id}", response_model=PersonOut)
def update_person(
    person_id: str,
    payload: PersonUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    return person_service.update_person(db, person_id, payload)


@router.delete("/persons/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: str, db: Annotated[Session, Depends(get_db)]):
    person_service.delete_person(db, person_id)
    return None
