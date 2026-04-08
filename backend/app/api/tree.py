from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.tree_service import build_tree

router = APIRouter(tags=["tree"])


@router.get("/tree")
def get_tree(db: Annotated[Session, Depends(get_db)]):
    return build_tree(db)
