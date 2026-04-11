from __future__ import annotations

import shutil
import sys
from collections.abc import Generator
from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402, F401 - imported after sys.path setup for tests
from app.core.config import settings  # noqa: E402 - imported after sys.path setup for tests
from app.core.database import Base, get_db  # noqa: E402 - imported after sys.path setup for tests
from app.main import app  # noqa: E402 - imported after sys.path setup for tests


@dataclass(frozen=True)
class TestDatabase:
    engine: Engine
    session_factory: sessionmaker[Session]
    db_path: Path


def _sqlite_file_path(database_url: str) -> Path:
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        raise ValueError(f"Expected a SQLite database URL, got {database_url!r}")

    raw_path = database_url.removeprefix(prefix)
    if raw_path.startswith("/") and len(raw_path) > 2 and raw_path[2] == ":":
        raw_path = raw_path[1:]
    return Path(raw_path).resolve()


def _reset_test_upload_dir() -> None:
    upload_root = settings.test_upload_dir.resolve()
    upload_root.mkdir(parents=True, exist_ok=True)

    for child in upload_root.iterdir():
        if child.name == ".gitkeep":
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink(missing_ok=True)


@pytest.fixture(scope="session")
def test_db() -> Generator[TestDatabase, None, None]:
    db_path = _sqlite_file_path(settings.test_database_url)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    for suffix in ("", "-wal", "-shm"):
        Path(f"{db_path}{suffix}").unlink(missing_ok=True)

    engine = create_engine(
        settings.test_database_url,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    try:
        yield TestDatabase(engine=engine, session_factory=session_factory, db_path=db_path)
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def db_session(test_db: TestDatabase) -> Generator[Session, None, None]:
    original_upload_dir = settings.upload_dir
    settings.upload_dir = settings.test_upload_dir.resolve()

    Base.metadata.drop_all(bind=test_db.engine)
    Base.metadata.create_all(bind=test_db.engine)
    _reset_test_upload_dir()

    session = test_db.session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        _reset_test_upload_dir()
        settings.upload_dir = original_upload_dir


@pytest.fixture()
def test_client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
