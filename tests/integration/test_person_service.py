from app.schemas.person import PersonCreate, PersonUpdate
from app.services.person_service import (
    create_person,
    delete_person,
    get_person,
    list_persons,
    update_person,
)
from fastapi import HTTPException


def test_person_service_crud_flow(db_session) -> None:
    created = create_person(
        db_session,
        PersonCreate(first_name="Anna", last_name="Zimmer", description="Test person"),
    )

    person_id = str(created.id)

    assert person_id
    assert created.first_name == "Anna"

    listed = list_persons(db_session)
    assert [person.last_name for person in listed] == ["Zimmer"]

    updated = update_person(
        db_session,
        person_id,
        PersonUpdate(last_name="Schmidt", is_living=True),
    )
    assert updated.last_name == "Schmidt"
    assert updated.is_living is True

    fetched = get_person(db_session, person_id)
    assert str(fetched.id) == person_id

    delete_person(db_session, person_id)

    try:
        get_person(db_session, person_id)
    except HTTPException as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("Expected get_person to raise HTTPException after deletion")
