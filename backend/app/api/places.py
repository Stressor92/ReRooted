from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.place import Place
from app.schemas.place import PlaceCreate, PlaceOut

router = APIRouter(tags=["places"])


@router.get("/places", response_model=list[PlaceOut])
def search_places(
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str | None, Query(default=None, min_length=1)] = None,
):
    query = db.query(Place)
    if q:
        pattern = f"%{q}%"
        query = query.filter(or_(Place.name.ilike(pattern), Place.full_name.ilike(pattern)))
    return query.order_by(Place.name.asc()).limit(20).all()


@router.post("/places", response_model=PlaceOut, status_code=status.HTTP_201_CREATED)
def create_place(payload: PlaceCreate, db: Annotated[Session, Depends(get_db)]):
    place = Place(**payload.model_dump())
    db.add(place)
    db.commit()
    db.refresh(place)
    return place
