from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.place import PlaceCreate, PlaceOut
from app.services import place_service

router = APIRouter(tags=["places"])


@router.get("/places", response_model=list[PlaceOut])
def search_places(
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str | None, Query(min_length=1)] = None,
):
    return place_service.search(db, q)


@router.post("/places", response_model=PlaceOut, status_code=status.HTTP_201_CREATED)
def create_place(payload: PlaceCreate, db: Annotated[Session, Depends(get_db)]):
    return place_service.create(db, payload)
