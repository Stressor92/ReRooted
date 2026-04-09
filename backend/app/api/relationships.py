from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.relationship import RelationshipCreate, RelationshipOut, RelationshipUpdate
from app.services import relationship_service

router = APIRouter(tags=["relationships"])


@router.get("/relationships", response_model=list[RelationshipOut])
def list_relationships(
    db: Annotated[Session, Depends(get_db)],
    person_id: Annotated[str | None, Query()] = None,
):
    if person_id is None:
        return relationship_service.list_all(db)
    return relationship_service.get_for_person(db, person_id)


@router.post("/relationships", response_model=RelationshipOut, status_code=status.HTTP_201_CREATED)
def create_relationship(payload: RelationshipCreate, db: Annotated[Session, Depends(get_db)]):
    return relationship_service.create(db, payload)


@router.put("/relationships/{relationship_id}", response_model=RelationshipOut)
def update_relationship(
    relationship_id: str,
    payload: RelationshipUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    return relationship_service.update(db, relationship_id, payload)


@router.delete("/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(
    relationship_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    relationship_service.delete(db, relationship_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/relationships/{relationship_id}/children/{child_id}",
    status_code=status.HTTP_201_CREATED,
)
def add_child_to_relationship(
    relationship_id: str,
    child_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    relationship_service.add_child(db, relationship_id, child_id)
    return Response(status_code=status.HTTP_201_CREATED)


@router.delete(
    "/relationships/{relationship_id}/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_child_from_relationship(
    relationship_id: str,
    child_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    relationship_service.remove_child(db, relationship_id, child_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
