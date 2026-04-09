from __future__ import annotations

from app.models.person import Person
from app.services import gedcom_service

VALID_GEDCOM = b"""0 HEAD
1 SOUR TEST
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Ada /Ancestor/
1 SEX F
1 BIRT
2 DATE 15 APR 1923
2 PLAC Berlin, Germany
1 DEAT
2 DATE 1987
0 @I2@ INDI
1 NAME Living /Person/
1 SEX M
1 BIRT
2 DATE ABT 1920
2 PLAC Hamburg, Germany
0 @F1@ FAM
1 WIFE @I1@
1 HUSB @I2@
1 MARR
2 DATE 1948
2 PLAC Berlin, Germany
0 TRLR
"""

LATIN1_GEDCOM = """0 HEAD
1 SOUR TEST
1 GEDC
2 VERS 5.5.1
1 CHAR ANSI
0 @I1@ INDI
1 NAME Jörg /Müller/
1 BIRT
2 DATE 1901
2 PLAC Zürich, Schweiz
0 TRLR
""".encode("latin-1")


def test_gedcom_preview_counts_without_db_changes(test_client) -> None:
    before_count = len(test_client.get("/persons").json())

    response = test_client.post(
        "/import/gedcom/preview",
        files={"file": ("family.ged", VALID_GEDCOM, "text/plain")},
    )

    assert response.status_code == 200
    assert response.json() == {"persons": 2, "families": 1, "places": 2, "events": 4}

    after_count = len(test_client.get("/persons").json())
    assert after_count == before_count


def test_gedcom_import_is_idempotent_for_reimports(test_client, db_session) -> None:
    first_response = test_client.post(
        "/import/gedcom",
        files={"file": ("family.ged", VALID_GEDCOM, "text/plain")},
    )
    assert first_response.status_code == 200
    assert first_response.json() == {
        "imported_persons": 2,
        "imported_families": 1,
        "status": "ok",
    }

    second_response = test_client.post(
        "/import/gedcom",
        files={"file": ("family.ged", VALID_GEDCOM, "text/plain")},
    )
    assert second_response.status_code == 200

    db_session.expire_all()
    imported_people = (
        db_session.query(Person)
        .filter(Person.gramps_id.in_(["@I1@", "@I2@"]))
        .order_by(Person.gramps_id.asc())
        .all()
    )
    assert len(imported_people) == 2
    assert [person.gramps_id for person in imported_people] == ["@I1@", "@I2@"]


def test_gedcom_export_anonymises_living_people(test_client, db_session) -> None:
    db_session.add_all(
        [
            Person(first_name="Ada", last_name="Ancestor", is_living=False),
            Person(first_name="Luca", last_name="Living", is_living=True),
        ]
    )
    db_session.commit()

    response = test_client.get("/export/gedcom")

    assert response.status_code == 200
    assert "Living /Person/" in response.text
    assert "Ada /Ancestor/" in response.text


def test_invalid_gedcom_returns_422(test_client) -> None:
    response = test_client.post(
        "/import/gedcom/preview",
        files={"file": ("broken.ged", b"not a gedcom file", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "invalid_gedcom"


def test_gedcom_preview_accepts_latin1_encoded_input(test_client) -> None:
    response = test_client.post(
        "/import/gedcom/preview",
        files={"file": ("latin1.ged", LATIN1_GEDCOM, "text/plain")},
    )

    assert response.status_code == 200
    assert response.json() == {"persons": 1, "families": 0, "places": 1, "events": 1}


def test_gedcom_export_empty_database_returns_valid_skeleton(db_session) -> None:
    payload = gedcom_service.export_gedcom(db_session)

    assert payload.startswith("0 HEAD")
    assert payload.rstrip().endswith("0 TRLR")
    assert " INDI" not in payload
    assert " FAM" not in payload
