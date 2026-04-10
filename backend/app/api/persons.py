from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.person import PersonCreate, PersonDetail, PersonImageUpdate, PersonOut, PersonUpdate
from app.services import person_service

router = APIRouter(tags=["persons"])


@router.get("/persons", response_model=list[PersonOut])
def list_persons(
    db: Annotated[Session, Depends(get_db)],
    search: Annotated[str | None, Query()] = None,
):
    return person_service.get_all(db, search)


@router.post("/persons", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonCreate, db: Annotated[Session, Depends(get_db)]):
    return person_service.create(db, payload)


@router.get("/persons/{person_id}", response_model=PersonDetail)
def get_person(person_id: str, db: Annotated[Session, Depends(get_db)]):
    return person_service.get_by_id(db, person_id)


@router.put("/persons/{person_id}", response_model=PersonOut)
def update_person(
    person_id: str,
    payload: PersonUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    return person_service.update(db, person_id, payload)


@router.delete("/persons/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: str, db: Annotated[Session, Depends(get_db)]):
    person_service.delete(db, person_id)
    return None


@router.post(
    "/persons/{person_id}/images",
    response_model=PersonOut,
    status_code=status.HTTP_201_CREATED,
)
def upload_person_image(
    person_id: str,
    db: Annotated[Session, Depends(get_db)],
    image: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    is_profile: Annotated[bool | None, Form()] = None,
):
    return person_service.add_image(db, person_id, image, file_id=file_id, is_profile=is_profile)


@router.patch("/persons/{person_id}/images/{image_id}", response_model=PersonDetail)
def update_person_image(
    person_id: str,
    image_id: str,
    payload: PersonImageUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    return person_service.update_image(db, person_id, image_id, payload)
