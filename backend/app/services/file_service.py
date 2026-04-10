from __future__ import annotations

import importlib
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import File as StoredFile
from app.models import PersonImage, Source


def _not_found(file_id: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"error": "not_found", "detail": f"File {file_id} not found"},
    )


def _invalid_file(detail: str, status_code: int) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": "invalid_file", "detail": detail},
    )


def _upload_root() -> Path:
    root = Path(settings.upload_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _resolve_path(path_value: str) -> Path:
    path = Path(path_value)
    candidate = path.resolve() if path.is_absolute() else (Path.cwd() / path).resolve()
    candidate.relative_to(_upload_root())
    return candidate


def _safe_filename(filename: str | None, default_name: str) -> str:
    safe_name = Path(filename or default_name).name
    return safe_name if safe_name not in {"", ".", ".."} else default_name


def _thumb_path_for(path: Path) -> Path:
    return path.with_name(f"{path.stem}_thumb.jpg")


def _write_thumbnail(file_bytes: bytes, target: Path) -> None:
    try:
        image_module = importlib.import_module("PIL.Image")
        image_open = image_module.open

        with image_open(BytesIO(file_bytes)) as image:
            if image.mode not in {"RGB", "L"}:
                image = image.convert("RGB")
            elif image.mode == "L":
                image = image.convert("RGB")
            image.thumbnail((200, 200))
            image.save(target, format="JPEG")
    except Exception:
        target.write_bytes(file_bytes)


async def upload(db: Session, file: UploadFile) -> StoredFile:
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or content_type == "application/pdf"):
        raise _invalid_file(
            "Only image or PDF uploads are allowed",
            status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    file_bytes = await file.read(max_size_bytes + 1)
    if len(file_bytes) > max_size_bytes:
        raise _invalid_file(
            f"Image exceeds {settings.max_upload_size_mb} MB limit",
            status.HTTP_413_CONTENT_TOO_LARGE,
        )

    safe_name = _safe_filename(file.filename, "upload.jpg")
    suffix = Path(safe_name).suffix or ".jpg"
    stored_name = f"{uuid4().hex}{suffix.lower()}"
    relative_path = (settings.upload_dir / stored_name).as_posix()
    absolute_path = _resolve_path(relative_path)
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(file_bytes)

    thumb_path = _thumb_path_for(absolute_path)
    if content_type.startswith("image/"):
        _write_thumbnail(file_bytes, thumb_path)

    stored_file = StoredFile(
        filename=safe_name,
        content_type=file.content_type,
        path=relative_path,
    )
    try:
        db.add(stored_file)
        db.commit()
        db.refresh(stored_file)
    except Exception:
        db.rollback()
        absolute_path.unlink(missing_ok=True)
        thumb_path.unlink(missing_ok=True)
        raise
    return stored_file


def get_file_record(db: Session, file_id: str) -> StoredFile:
    file_record = db.get(StoredFile, file_id)
    if file_record is None:
        raise _not_found(file_id)
    return file_record


def get_file_path(db: Session, file_id: str) -> Path:
    file_record = get_file_record(db, file_id)
    try:
        file_path = _resolve_path(str(file_record.path))
    except ValueError as exc:
        raise _not_found(file_id) from exc

    if not file_path.exists():
        raise _not_found(file_id)
    return file_path


def get_thumb_path(db: Session, file_id: str) -> Path:
    thumb_path = _thumb_path_for(get_file_path(db, file_id))
    if not thumb_path.exists():
        raise _not_found(file_id)
    return thumb_path


def delete_file(db: Session, file_id: str) -> None:
    file_record = get_file_record(db, file_id)
    file_path: Path | None = None
    try:
        file_path = _resolve_path(str(file_record.path))
    except ValueError:
        file_path = None

    db.query(PersonImage).filter(PersonImage.file_id == file_id).delete(synchronize_session=False)
    db.query(Source).filter(Source.file_id == file_id).update(
        {Source.file_id: None},
        synchronize_session=False,
    )
    db.delete(file_record)
    db.commit()

    if file_path is not None:
        file_path.unlink(missing_ok=True)
        _thumb_path_for(file_path).unlink(missing_ok=True)
