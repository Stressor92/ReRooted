from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.person import Person
from app.models.relationship import Relationship, RelationshipChild
from app.schemas.relationship import RelationshipCreate, RelationshipOut

router = APIRouter(tags=["relationships"])


@router.get("/relationships", response_model=list[RelationshipOut])
def list_relationships(db: Annotated[Session, Depends(get_db)]):
    return db.query(Relationship).all()


@router.post("/relationships", response_model=RelationshipOut, status_code=status.HTTP_201_CREATED)
def create_relationship(payload: RelationshipCreate, db: Annotated[Session, Depends(get_db)]):
    if not db.get(Person, payload.person1_id):
        raise HTTPException(status_code=404, detail="Primary person not found")
    if payload.person2_id and not db.get(Person, payload.person2_id):
        raise HTTPException(status_code=404, detail="Related person not found")

    relationship = Relationship(
        person1_id=payload.person1_id,
        person2_id=payload.person2_id,
        rel_type=payload.rel_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(relationship)
    db.flush()

    for child_id in payload.child_ids:
        db.add(RelationshipChild(relationship_id=relationship.id, child_id=child_id))

    db.commit()
    db.refresh(relationship)
    return relationship


@router.post(
    "/relationships/{relationship_id}/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT
)
def add_child_to_relationship(
    relationship_id: str,
    child_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    relationship = db.get(Relationship, relationship_id)
    child = db.get(Person, child_id)
    if not relationship or not child:
        raise HTTPException(status_code=404, detail="Relationship or child not found")

    existing = db.get(RelationshipChild, {"relationship_id": relationship_id, "child_id": child_id})
    if not existing:
        db.add(RelationshipChild(relationship_id=relationship_id, child_id=child_id))
        db.commit()
    return None


@router.delete(
    "/relationships/{relationship_id}/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_child_from_relationship(
    relationship_id: str,
    child_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    link = db.get(RelationshipChild, {"relationship_id": relationship_id, "child_id": child_id})
    if not link:
        raise HTTPException(status_code=404, detail="Child assignment not found")

    db.delete(link)
    db.commit()
    return None
