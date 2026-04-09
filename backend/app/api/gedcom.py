from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import gedcom_service

router = APIRouter(tags=["gedcom"])

MAX_GEDCOM_BYTES = 50 * 1024 * 1024
ALLOWED_GEDCOM_EXTENSIONS = {".ged", ".gedcom"}


def _invalid_gedcom(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"error": "invalid_gedcom", "detail": detail},
    )


def _validate_upload(filename: str | None, file_bytes: bytes) -> None:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in ALLOWED_GEDCOM_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "error": "invalid_file",
                "detail": "GEDCOM uploads must end with .ged or .gedcom",
            },
        )

    if len(file_bytes) > MAX_GEDCOM_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail={"error": "invalid_file", "detail": "GEDCOM upload exceeds 50 MB limit"},
        )


@router.post("/import/gedcom/preview")
async def preview_gedcom(file: Annotated[UploadFile, File(...)]):
    file_bytes = await file.read()
    _validate_upload(file.filename, file_bytes)
    try:
        return gedcom_service.preview_gedcom(file_bytes)
    except ValueError as exc:
        return _invalid_gedcom(str(exc))


@router.post("/import/gedcom")
async def import_gedcom(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
):
    file_bytes = await file.read()
    _validate_upload(file.filename, file_bytes)
    try:
        return gedcom_service.import_gedcom(file_bytes, db)
    except ValueError as exc:
        db.rollback()
        return _invalid_gedcom(str(exc))


@router.get("/export/gedcom")
def export_gedcom(db: Annotated[Session, Depends(get_db)]):
    payload = gedcom_service.export_gedcom(db)

    with NamedTemporaryFile("w", encoding="utf-8", suffix=".ged", delete=False) as handle:
        handle.write(payload)
        temp_path = handle.name

    return FileResponse(
        path=temp_path,
        media_type="text/plain; charset=utf-8",
        filename="rerooted_export.ged",
    )
