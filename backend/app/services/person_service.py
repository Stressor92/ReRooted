from __future__ import annotations

from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models import Event, File, Person, PersonImage, Place
from app.schemas.person import PersonCreate, PersonUpdate


def _not_found(entity: str, item_id: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{entity} {item_id} not found")


def _event_sort_key(event: Event) -> tuple[bool, date, str]:
    raw_date = event.date_sort
    sort_date = raw_date if isinstance(raw_date, date) else date.max
    event_id = str(event.id) if event.id is not None else ""
    return (raw_date is None, sort_date, event_id)


def _ensure_place_exists(db: Session, place_id: str) -> None:
    if db.get(Place, place_id) is None:
        raise _not_found("Place", place_id)


def get_all(db: Session, search: str | None = None) -> list[Person]:
    stmt = select(Person)
    if search:
        pattern = f"%{search.strip()}%"
        if pattern != "%%":
            stmt = stmt.where(
                or_(
                    Person.first_name.ilike(pattern),
                    Person.last_name.ilike(pattern),
                )
            )

    stmt = stmt.order_by(Person.last_name.asc(), Person.first_name.asc())
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, person_id: str) -> Person:
    stmt = (
        select(Person)
        .options(
            joinedload(Person.birth_place),
            joinedload(Person.events).joinedload(Event.place),
            joinedload(Person.images).joinedload(PersonImage.file),
        )
        .where(Person.id == person_id)
    )
    person = db.execute(stmt).unique().scalar_one_or_none()
    if person is None:
        raise _not_found("Person", person_id)

    person.events.sort(key=_event_sort_key)
    return person


def create(db: Session, data: PersonCreate) -> Person:
    if data.birth_place_id is not None:
        _ensure_place_exists(db, data.birth_place_id)

    person = Person(**data.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return get_by_id(db, str(person.id))


def update(db: Session, person_id: str, data: PersonUpdate) -> Person:
    person = get_by_id(db, person_id)
    update_data = data.model_dump(exclude_unset=True)

    birth_place_id = update_data.get("birth_place_id")
    if birth_place_id is not None:
        _ensure_place_exists(db, birth_place_id)

    for key, value in update_data.items():
        setattr(person, key, value)

    db.commit()
    db.refresh(person)
    return get_by_id(db, person_id)


def delete(db: Session, person_id: str) -> None:
    person = get_by_id(db, person_id)
    db.delete(person)
    db.commit()


def add_image(db: Session, person_id: str, upload: UploadFile) -> Person:
    person = get_by_id(db, person_id)

    if upload.content_type is None or not upload.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={"error": "invalid_file", "detail": "Only image uploads are allowed"},
        )

    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = upload.file.read(max_size_bytes + 1)
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail={
                "error": "invalid_file",
                "detail": f"Image exceeds {settings.max_upload_size_mb} MB limit",
            },
        )

    safe_name = Path(upload.filename or "upload").name or "upload"
    suffix = Path(safe_name).suffix
    stored_name = f"{uuid4().hex}{suffix}"
    relative_path = (settings.upload_dir / stored_name).as_posix()
    destination = Path(relative_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)

    file_record = File(
        filename=safe_name,
        content_type=upload.content_type,
        path=relative_path,
    )
    db.add(file_record)
    db.flush()

    has_profile_image = any(image.is_profile is True for image in person.images)
    person_image = PersonImage(
        person_id=str(person.id),
        file_id=str(file_record.id),
        is_profile=not has_profile_image,
    )
    try:
        db.add(person_image)
        db.commit()
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise

    return get_by_id(db, person_id)


# Backwards-compatible aliases used by the existing tests.
list_persons = get_all
get_person = get_by_id
create_person = create
update_person = update
delete_person = delete
