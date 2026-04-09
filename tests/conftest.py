from __future__ import annotations

import sys
from collections.abc import Generator
from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402, F401 - imported after sys.path setup for tests
from app.core.database import Base, get_db  # noqa: E402 - imported after sys.path setup for tests
from app.main import app  # noqa: E402 - imported after sys.path setup for tests


@dataclass(frozen=True)
class TestDatabase:
    engine: Engine
    session_factory: sessionmaker[Session]


@pytest.fixture(scope="session")
def test_db() -> Generator[TestDatabase, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    try:
        yield TestDatabase(engine=engine, session_factory=session_factory)
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def db_session(test_db: TestDatabase) -> Generator[Session, None, None]:
    Base.metadata.drop_all(bind=test_db.engine)
    Base.metadata.create_all(bind=test_db.engine)

    session = test_db.session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="session")
def test_client(test_db: TestDatabase) -> Generator[TestClient, None, None]:
    session = test_db.session_factory()

    def override_get_db() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        session.rollback()
        session.close()
