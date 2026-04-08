from datetime import date

from app.models.event import Event, EventType
from app.models.person import Person
from app.services.gedcom_service import export_gedcom


def test_export_gedcom_anonymises_living_people_and_exports_events(db_session) -> None:
    living = Person(first_name="Living", last_name="Person", is_living=True)
    deceased = Person(first_name="Ada", last_name="Ancestor", is_living=False)
    db_session.add_all([living, deceased])
    db_session.flush()

    db_session.add(
        Event(
            person_id=deceased.id,
            event_type=EventType.BIRTH,
            date_text="15.04.1923",
            date_sort=date(1923, 4, 15),
        )
    )
    db_session.commit()

    exported = export_gedcom(db_session)

    assert "0 HEAD" in exported
    assert "1 NAME Living /Person/" in exported
    assert f"1 NAME {deceased.first_name} /{deceased.last_name}/" in exported
    assert "2 DATE 15.04.1923" in exported
    assert exported.strip().endswith("0 TRLR")
