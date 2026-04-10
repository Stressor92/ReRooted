from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.csv_service import build_csv

router = APIRouter(tags=["export"])


@router.get("/csv")
def export_csv(db: Annotated[Session, Depends(get_db)]):
    content = build_csv(db)
    return Response(
        content=content.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="stammbaum_export.csv"',
            "Cache-Control": "no-cache",
        },
    )
