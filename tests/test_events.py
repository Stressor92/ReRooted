from __future__ import annotations

from uuid import uuid4


def test_event_crud_populates_date_sort_and_place_name(test_client) -> None:
    suffix = uuid4().hex[:8]

    person_response = test_client.post(
        "/persons",
        json={"first_name": f"Event{suffix}", "last_name": f"Person{suffix}"},
    )
    assert person_response.status_code == 201
    person_id = person_response.json()["id"]

    place_response = test_client.post(
        "/places",
        json={"name": f"Town {suffix}", "full_name": f"Town {suffix}, Country"},
    )
    assert place_response.status_code == 201
    place_id = place_response.json()["id"]

    cases = [
        ("15.04.1923", "1923-04-15"),
        ("ca. 1920", "1920-01-01"),
        ("vor 1900", "1899-12-31"),
        ("1920-1925", "1920-01-01"),
    ]

    created_ids: list[str] = []
    for date_text, expected_sort in cases:
        response = test_client.post(
            f"/persons/{person_id}/events",
            json={
                "event_type": "birth",
                "date_text": date_text,
                "place_id": place_id,
                "description": f"Event {date_text}",
            },
        )
        assert response.status_code == 201
        payload = response.json()
        created_ids.append(payload["id"])
        assert payload["date_text"] == date_text
        assert payload["date_sort"] == expected_sort
        assert payload["place_id"] == place_id
        assert payload["place_name"] == f"Town {suffix}"

    list_response = test_client.get(f"/persons/{person_id}/events")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert [event["date_sort"] for event in listed[:4]] == [
        "1899-12-31",
        "1920-01-01",
        "1920-01-01",
        "1923-04-15",
    ]

    update_response = test_client.put(
        f"/events/{created_ids[0]}",
        json={"date_text": "nach 1925", "description": "Updated event"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["date_sort"] == "1926-01-01"
    assert updated["description"] == "Updated event"

    delete_response = test_client.delete(f"/events/{created_ids[-1]}")
    assert delete_response.status_code == 204


def test_event_api_accepts_new_german_list_event_types(test_client) -> None:
    suffix = uuid4().hex[:8]

    person_response = test_client.post(
        "/persons",
        json={"first_name": f"Event{suffix}", "last_name": f"Catalog{suffix}"},
    )
    assert person_response.status_code == 201
    person_id = person_response.json()["id"]

    for event_type in ["engagement", "academic_degree", "retirement", "move", "displacement", "imprisonment", "adoption"]:
        response = test_client.post(
            f"/persons/{person_id}/events",
            json={
                "event_type": event_type,
                "date_text": "1950",
                "description": f"{event_type} event",
            },
        )
        assert response.status_code == 201
        assert response.json()["event_type"] == event_type
