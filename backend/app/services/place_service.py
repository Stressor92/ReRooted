from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Place
from app.schemas.place import PlaceCreate


def search(db: Session, q: str | None = None) -> list[Place]:
    stmt = select(Place)
    if q:
        normalized = q.strip()
        if normalized:
            pattern = f"%{normalized}%"
            stmt = stmt.where(
                or_(
                    Place.name.ilike(pattern),
                    Place.full_name.ilike(pattern),
                )
            )

    stmt = stmt.order_by(Place.name.asc()).limit(10)
    return list(db.scalars(stmt).all())


def get_or_create(db: Session, name: str) -> Place:
    normalized = name.strip()
    stmt = select(Place).where(func.lower(Place.name) == normalized.lower())
    existing = db.scalars(stmt).first()
    if existing is not None:
        return existing

    place = Place(name=normalized, full_name=normalized)
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


def create(db: Session, data: PlaceCreate) -> Place:
    payload = data.model_dump()
    if payload.get("full_name") is None and payload.get("name") is not None:
        payload["full_name"] = payload["name"]

    place = Place(**payload)
    db.add(place)
    db.commit()
    db.refresh(place)
    return place
