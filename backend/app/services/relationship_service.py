from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Person, Relationship, RelationshipChild
from app.schemas.relationship import RelationshipCreate, RelationshipUpdate


def _not_found(entity: str, item_id: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} {item_id} not found"
    )


def _get_relationship_or_404(db: Session, relationship_id: str) -> Relationship:
    stmt = (
        select(Relationship)
        .options(joinedload(Relationship.children))
        .where(Relationship.id == relationship_id)
    )
    relationship = db.execute(stmt).unique().scalar_one_or_none()
    if relationship is None:
        raise _not_found("Relationship", relationship_id)
    return relationship


def _validate_people(db: Session, person1_id: str, person2_id: str | None) -> None:
    if person2_id is not None and person1_id == person2_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="person1_id and person2_id must be different",
        )

    if db.get(Person, person1_id) is None:
        raise _not_found("Person", person1_id)

    if person2_id is not None and db.get(Person, person2_id) is None:
        raise _not_found("Person", person2_id)


def _validate_child_assignment(db: Session, relationship: Relationship, child_id: str) -> None:
    if db.get(Person, child_id) is None:
        raise _not_found("Person", child_id)

    parent_ids = {str(relationship.person1_id)}
    if relationship.person2_id is not None:
        parent_ids.add(str(relationship.person2_id))

    if child_id in parent_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Child cannot also be a parent in the same relationship",
        )

    existing = db.get(
        RelationshipChild,
        {"relationship_id": str(relationship.id), "child_id": child_id},
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Child {child_id} is already linked to relationship {relationship.id}",
        )


def list_all(db: Session) -> list[Relationship]:
    stmt = (
        select(Relationship)
        .options(joinedload(Relationship.children))
        .order_by(Relationship.id.asc())
    )
    return list(db.execute(stmt).unique().scalars().all())


def create(db: Session, data: RelationshipCreate) -> Relationship:
    _validate_people(db, data.person1_id, data.person2_id)

    relationship = Relationship(
        person1_id=data.person1_id,
        person2_id=data.person2_id,
        rel_type=data.rel_type,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(relationship)
    db.flush()

    seen_child_ids: set[str] = set()
    for child_id in data.child_ids:
        if child_id in seen_child_ids:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Child {child_id} is already linked to relationship {relationship.id}",
            )
        seen_child_ids.add(child_id)
        _validate_child_assignment(db, relationship, child_id)
        db.add(RelationshipChild(relationship_id=str(relationship.id), child_id=child_id))

    db.commit()
    return _get_relationship_or_404(db, str(relationship.id))


def update(db: Session, relationship_id: str, data: RelationshipUpdate) -> Relationship:
    relationship = _get_relationship_or_404(db, relationship_id)
    update_data = data.model_dump(exclude_unset=True)

    person1_id = update_data.get("person1_id", str(relationship.person1_id))
    person2_id = update_data.get("person2_id", relationship.person2_id)
    _validate_people(db, person1_id, person2_id)

    parent_ids = {person1_id}
    if person2_id is not None:
        parent_ids.add(person2_id)
    for child_link in relationship.children:
        if str(child_link.child_id) in parent_ids:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Existing child cannot also be a parent in the same relationship",
            )

    for key, value in update_data.items():
        setattr(relationship, key, value)

    db.commit()
    return _get_relationship_or_404(db, relationship_id)


def delete(db: Session, relationship_id: str) -> None:
    relationship = _get_relationship_or_404(db, relationship_id)
    db.delete(relationship)
    db.commit()


def add_child(db: Session, relationship_id: str, child_id: str) -> None:
    relationship = _get_relationship_or_404(db, relationship_id)
    _validate_child_assignment(db, relationship, child_id)
    db.add(RelationshipChild(relationship_id=relationship_id, child_id=child_id))
    db.commit()


def remove_child(db: Session, relationship_id: str, child_id: str) -> None:
    _get_relationship_or_404(db, relationship_id)
    link = db.get(RelationshipChild, {"relationship_id": relationship_id, "child_id": child_id})
    if link is None:
        raise _not_found("RelationshipChild", f"{relationship_id}/{child_id}")

    db.delete(link)
    db.commit()


def get_for_person(db: Session, person_id: str) -> list[Relationship]:
    if db.get(Person, person_id) is None:
        raise _not_found("Person", person_id)

    stmt = (
        select(Relationship)
        .options(joinedload(Relationship.children))
        .where(
            or_(
                Relationship.person1_id == person_id,
                Relationship.person2_id == person_id,
                Relationship.children.any(RelationshipChild.child_id == person_id),
            )
        )
        .order_by(Relationship.id.asc())
    )
    return list(db.execute(stmt).unique().scalars().all())
