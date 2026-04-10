from __future__ import annotations

from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models import Event, File, Person, PersonImage, Place
from app.schemas.person import PersonCreate, PersonImageUpdate, PersonUpdate


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


def _ensure_file_exists(db: Session, file_id: str) -> File:
    file_record = db.get(File, file_id)
    if file_record is None:
        raise _not_found("File", file_id)
    return file_record


def _get_person_image_or_404(person: Person, image_id: str) -> PersonImage:
    image = next((item for item in person.images if str(item.id) == image_id), None)
    if image is None:
        raise _not_found("PersonImage", image_id)
    return image


def _attach_file_to_person(
    db: Session,
    person: Person,
    file_id: str,
    *,
    is_profile: bool | None = None,
) -> None:
    _ensure_file_exists(db, file_id)
    person_image = next((image for image in person.images if str(image.file_id) == file_id), None)

    if person_image is None:
        person_image = PersonImage(file_id=file_id, is_profile=False)
        person.images.append(person_image)

    should_set_profile = is_profile is True or (
        is_profile is None and not any(image.is_profile is True for image in person.images)
    )
    if should_set_profile:
        for image in person.images:
            image.is_profile = str(image.file_id) == file_id


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

    profile_image_id = update_data.pop("profile_image_id", None)

    for key, value in update_data.items():
        setattr(person, key, value)

    if profile_image_id is not None:
        _attach_file_to_person(db, person, profile_image_id, is_profile=True)

    db.commit()
    db.refresh(person)
    return get_by_id(db, person_id)


def delete(db: Session, person_id: str) -> None:
    person = get_by_id(db, person_id)
    db.delete(person)
    db.commit()


def add_image(
    db: Session,
    person_id: str,
    upload: UploadFile | None = None,
    *,
    file_id: str | None = None,
    is_profile: bool | None = None,
) -> Person:
    person = get_by_id(db, person_id)

    if file_id is not None:
        _attach_file_to_person(db, person, file_id, is_profile=is_profile)
        db.commit()
        db.refresh(person)
        return get_by_id(db, person_id)

    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"error": "invalid_file", "detail": "Provide an image upload or existing file_id"},
        )

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

    try:
        _attach_file_to_person(db, person, str(file_record.id), is_profile=is_profile)
        db.commit()
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise

    return get_by_id(db, person_id)


def update_image(db: Session, person_id: str, image_id: str, data: PersonImageUpdate) -> Person:
    person = get_by_id(db, person_id)
    image = _get_person_image_or_404(person, image_id)
    payload = data.model_dump(exclude_unset=True)

    is_profile = payload.pop("is_profile", None)
    for key, value in payload.items():
        setattr(image, key, value)

    if is_profile is not None:
        if is_profile:
            for existing in person.images:
                existing.is_profile = str(existing.id) == image_id
        else:
            image.is_profile = False

    db.commit()
    db.refresh(person)
    return get_by_id(db, person_id)


# Backwards-compatible aliases used by the existing tests.
list_persons = get_all
get_person = get_by_id
create_person = create
update_person = update
delete_person = delete
