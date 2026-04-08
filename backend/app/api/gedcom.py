from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import gedcom_service

router = APIRouter(tags=["gedcom"])


@router.post("/import/gedcom/preview")
async def preview_gedcom(file: Annotated[UploadFile, File(...)]):
    try:
        return gedcom_service.preview_gedcom(await file.read())
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc


@router.post("/import/gedcom")
async def import_gedcom(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return gedcom_service.import_gedcom(await file.read(), db)
    except NotImplementedError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc


@router.get("/export/gedcom", response_class=PlainTextResponse)
def export_gedcom(db: Annotated[Session, Depends(get_db)]):
    return gedcom_service.export_gedcom(db)
