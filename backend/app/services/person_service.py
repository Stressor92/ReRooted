from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate


def list_persons(db: Session) -> list[Person]:
    return db.query(Person).order_by(Person.last_name.asc(), Person.first_name.asc()).all()


def get_person(db: Session, person_id: str) -> Person:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


def create_person(db: Session, payload: PersonCreate) -> Person:
    person = Person(**payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def update_person(db: Session, person_id: str, payload: PersonUpdate) -> Person:
    person = get_person(db, person_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, key, value)
    db.commit()
    db.refresh(person)
    return person


def delete_person(db: Session, person_id: str) -> None:
    person = get_person(db, person_id)
    db.delete(person)
    db.commit()
