from __future__ import annotations

import csv
import io
from datetime import date
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models import Event, EventType, Person, Place, Relationship, RelationshipChild, RelType


FIELDNAMES = [
    "person_id",
    "vorname",
    "nachname",
    "geburtsdatum",
    "geburtsort",
    "sterbedatum",
    "sterbeort",
    "lebt_status",
    "beschreibung",
    "elter1_id",
    "elter1_name",
    "elter1_beziehungstyp",
    "elter2_id",
    "elter2_name",
    "elter2_beziehungstyp",
    "partner1_id",
    "partner1_name",
    "partner1_beziehungstyp",
    "partner1_von",
    "partner1_bis",
    "partner2_id",
    "partner2_name",
    "partner2_beziehungstyp",
    "partner2_von",
    "partner2_bis",
    "partner3_id",
    "partner3_name",
    "partner3_beziehungstyp",
    "partner3_von",
    "partner3_bis",
    "kind1_id",
    "kind1_name",
    "kind1_beziehungstyp",
    "kind2_id",
    "kind2_name",
    "kind2_beziehungstyp",
    "kind3_id",
    "kind3_name",
    "kind3_beziehungstyp",
    "kind4_id",
    "kind4_name",
    "kind4_beziehungstyp",
    "kind5_id",
    "kind5_name",
    "kind5_beziehungstyp",
]


@pytest.fixture()
def csv_client(db_session: Session):
    def override_get_db():
        yield db_session

    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous_override


def _decode_csv(content: bytes) -> str:
    return content.decode("utf-8-sig")


def _parse_csv_rows(content: bytes) -> list[dict[str, str]]:
    text = _decode_csv(content)
    return list(csv.DictReader(io.StringIO(text), delimiter=";"))


def _seed_family(db_session: Session, suffix: str) -> tuple[Person, Person, Person]:
    birth_place = Place(name=f"München {suffix}")
    death_place = Place(name=f"Berlin {suffix}")
    db_session.add_all([birth_place, death_place])
    db_session.flush()

    anna = Person(
        first_name="Anna",
        last_name=f"Müller-{suffix}",
        is_living=False,
        description="Lehrerin\nund Schriftstellerin",
    )
    peter = Person(first_name="Peter", last_name=f"Müller-{suffix}", is_living=True)
    thomas = Person(first_name="Thomas", last_name=f"Müller-{suffix}", is_living=True)
    db_session.add_all([anna, peter, thomas])
    db_session.flush()

    db_session.add_all(
        [
            Event(
                person_id=anna.id,
                event_type=EventType.BIRTH,
                date_text="15.04.1948",
                place_id=birth_place.id,
            ),
            Event(
                person_id=anna.id,
                event_type=EventType.DEATH,
                date_text="03.12.2019",
                place_id=death_place.id,
            ),
        ]
    )

    relationship = Relationship(
        person1_id=anna.id,
        person2_id=peter.id,
        rel_type=RelType.PARTNER,
        start_date=date(1970, 1, 1),
    )
    db_session.add(relationship)
    db_session.flush()
    db_session.add(RelationshipChild(relationship_id=relationship.id, child_id=thomas.id))
    db_session.commit()

    return anna, peter, thomas


def test_csv_export_returns_valid_csv(csv_client, db_session: Session) -> None:
    _seed_family(db_session, uuid4().hex[:8])

    response = csv_client.get("/export/csv")

    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.content.startswith(b"\xef\xbb\xbf")


def test_csv_has_correct_columns(csv_client) -> None:
    response = csv_client.get("/export/csv")

    text = _decode_csv(response.content)
    header = next(csv.reader(io.StringIO(text), delimiter=";"))

    assert header == FIELDNAMES


def test_csv_encodes_umlauts_correctly(csv_client, db_session: Session) -> None:
    suffix = uuid4().hex[:8]
    person = Person(first_name="Jörg", last_name=f"Größe-{suffix}", is_living=None)
    db_session.add(person)
    db_session.commit()

    response = csv_client.get("/export/csv")
    decoded = _decode_csv(response.content)

    assert "Jörg" in decoded
    assert f"Größe-{suffix}" in decoded


def test_csv_relationship_columns_filled(csv_client, db_session: Session) -> None:
    anna, peter, thomas = _seed_family(db_session, uuid4().hex[:8])

    response = csv_client.get("/export/csv")
    rows = _parse_csv_rows(response.content)
    rows_by_id = {row["person_id"]: row for row in rows}

    anna_row = rows_by_id[anna.id]
    peter_row = rows_by_id[peter.id]
    thomas_row = rows_by_id[thomas.id]

    assert anna_row["partner1_id"] == peter.id
    assert anna_row["partner1_name"] == f"Peter {peter.last_name}"
    assert anna_row["partner1_beziehungstyp"] == "Ehe/Partnerschaft"
    assert anna_row["partner1_von"] == "1970-01-01"
    assert anna_row["kind1_id"] == thomas.id
    assert anna_row["kind1_name"] == f"Thomas {thomas.last_name}"
    assert anna_row["kind1_beziehungstyp"] == "Biologisch"

    assert peter_row["partner1_id"] == anna.id
    assert peter_row["kind1_id"] == thomas.id

    assert thomas_row["elter1_id"] == anna.id
    assert thomas_row["elter1_name"] == f"Anna {anna.last_name}"
    assert thomas_row["elter1_beziehungstyp"] == "Biologisch"
    assert thomas_row["elter2_id"] == peter.id
    assert thomas_row["elter2_name"] == f"Peter {peter.last_name}"
    assert thomas_row["elter2_beziehungstyp"] == "Biologisch"


def test_csv_person_with_many_partners_gets_extra_rows(csv_client, db_session: Session) -> None:
    suffix = uuid4().hex[:8]
    root = Person(first_name="Alex", last_name=f"Overflow-{suffix}", is_living=True)
    partners = [Person(first_name=f"Partner{index}", last_name=f"Overflow-{suffix}") for index in range(4)]
    db_session.add(root)
    db_session.add_all(partners)
    db_session.flush()

    for partner in partners:
        db_session.add(
            Relationship(
                person1_id=root.id,
                person2_id=partner.id,
                rel_type=RelType.PARTNER,
            )
        )

    db_session.commit()

    response = csv_client.get("/export/csv")
    rows = [row for row in _parse_csv_rows(response.content) if row["person_id"] == root.id]

    assert len(rows) == 2
    assert rows[0]["vorname"] == "Alex"
    assert rows[0]["partner3_id"] != ""
    assert rows[1]["person_id"] == root.id
    assert rows[1]["vorname"] == ""
    assert rows[1]["nachname"] == ""
    assert rows[1]["partner1_id"] != ""


def test_csv_empty_stammbaum_returns_only_header(csv_client) -> None:
    response = csv_client.get("/export/csv")

    lines = [line for line in _decode_csv(response.content).splitlines() if line.strip()]

    assert response.status_code == 200
    assert len(lines) == 1
