from __future__ import annotations


def test_source_crud_and_event_citations(test_client) -> None:
    person_response = test_client.post(
        "/persons",
        json={"first_name": "Source", "last_name": "Owner"},
    )
    assert person_response.status_code == 201
    person_id = person_response.json()["id"]

    event_response = test_client.post(
        f"/persons/{person_id}/events",
        json={"event_type": "birth", "date_text": "1900"},
    )
    assert event_response.status_code == 201
    event_id = event_response.json()["id"]

    source_response = test_client.post(
        "/sources",
        json={
            "title": "Civil Registry",
            "author": "Town Archive",
            "date": "1900",
            "url": "https://example.test/source",
        },
    )
    assert source_response.status_code == 201
    source_id = source_response.json()["id"]

    citation_response = test_client.post(
        f"/events/{event_id}/citations",
        json={"source_id": source_id, "page": "42", "confidence": "high"},
    )
    assert citation_response.status_code == 201
    citation = citation_response.json()
    assert citation["source_title"] == "Civil Registry"
    assert citation["event_id"] == event_id
    assert citation["page"] == "42"

    list_response = test_client.get(f"/events/{event_id}/citations")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["source_id"] == source_id

    delete_citation = test_client.delete(f"/citations/{citation['id']}")
    assert delete_citation.status_code == 204

    delete_source = test_client.delete(f"/sources/{source_id}")
    assert delete_source.status_code == 204


def test_person_citation_can_exist_without_event(test_client) -> None:
    person_response = test_client.post(
        "/persons",
        json={"first_name": "Person", "last_name": "Citation"},
    )
    assert person_response.status_code == 201
    person_id = person_response.json()["id"]

    source_response = test_client.post(
        "/sources",
        json={"title": "Family Letter", "author": "Private Archive"},
    )
    assert source_response.status_code == 201
    source_id = source_response.json()["id"]

    citation_response = test_client.post(
        f"/persons/{person_id}/citations",
        json={"source_id": source_id, "page": "Folder B", "confidence": "low"},
    )
    assert citation_response.status_code == 201
    citation = citation_response.json()
    assert citation["source_title"] == "Family Letter"
    assert citation["person_id"] == person_id
    assert citation["event_id"] is None

    list_response = test_client.get(f"/persons/{person_id}/citations")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert len(listed) == 1
    assert listed[0]["id"] == citation["id"]


def test_deleting_source_cascades_event_citations(test_client) -> None:
    person_response = test_client.post(
        "/persons",
        json={"first_name": "Cascade", "last_name": "Owner"},
    )
    assert person_response.status_code == 201
    person_id = person_response.json()["id"]

    event_response = test_client.post(
        f"/persons/{person_id}/events",
        json={"event_type": "birth", "date_text": "1910"},
    )
    assert event_response.status_code == 201
    event_id = event_response.json()["id"]

    source_response = test_client.post(
        "/sources",
        json={"title": "Parish Book", "author": "Archive"},
    )
    assert source_response.status_code == 201
    source_id = source_response.json()["id"]

    citation_response = test_client.post(
        f"/events/{event_id}/citations",
        json={"source_id": source_id, "page": "17", "confidence": "medium"},
    )
    assert citation_response.status_code == 201

    delete_source = test_client.delete(f"/sources/{source_id}")
    assert delete_source.status_code == 204

    list_response = test_client.get(f"/events/{event_id}/citations")
    assert list_response.status_code == 200
    assert list_response.json() == []
