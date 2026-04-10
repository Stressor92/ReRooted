from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.file import FileOut
from app.services import file_service

router = APIRouter(tags=["files"])


@router.post("/upload", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
):
    return await file_service.upload(db, file)


@router.get("/{file_id}/thumb")
def get_file_thumbnail(file_id: str, db: Annotated[Session, Depends(get_db)]):
    file_record = file_service.get_file_record(db, file_id)
    thumb_path = file_service.get_thumb_path(db, file_id)
    filename = None
    if file_record.filename is not None:
        filename = f"{str(file_record.filename).rsplit('.', 1)[0]}_thumb.jpg"

    return FileResponse(path=thumb_path, media_type="image/jpeg", filename=filename)


@router.get("/{file_id}")
def get_file(file_id: str, db: Annotated[Session, Depends(get_db)]):
    file_record = file_service.get_file_record(db, file_id)
    file_path = file_service.get_file_path(db, file_id)

    media_type = str(file_record.content_type) if file_record.content_type else None
    filename = str(file_record.filename) if file_record.filename else None
    return FileResponse(path=file_path, media_type=media_type, filename=filename)


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(file_id: str, db: Annotated[Session, Depends(get_db)]):
    file_service.delete_file(db, file_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
