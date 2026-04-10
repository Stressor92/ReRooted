from __future__ import annotations

from uuid import uuid4


def test_person_crud_roundtrip_and_search(test_client) -> None:
    suffix = uuid4().hex[:8]

    place_response = test_client.post(
        "/places",
        json={"name": f"Birthplace {suffix}", "full_name": f"Birthplace {suffix}, Testland"},
    )
    assert place_response.status_code == 201
    place_id = place_response.json()["id"]

    create_response = test_client.post(
        "/persons",
        json={
            "first_name": f"Anna{suffix}",
            "last_name": f"Zimmer{suffix}",
            "birth_place_id": place_id,
            "description": "Created by API test",
            "is_living": True,
            "gramps_id": f"G-{suffix}",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()

    assert created["first_name"] == f"Anna{suffix}"
    assert created["last_name"] == f"Zimmer{suffix}"
    assert created["birth_place_id"] == place_id
    assert created["profile_image_url"] is None

    person_id = created["id"]

    search_response = test_client.get(f"/persons?search=zimmer{suffix.lower()}")
    assert search_response.status_code == 200
    assert any(person["id"] == person_id for person in search_response.json())

    detail_response = test_client.get(f"/persons/{person_id}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["id"] == person_id
    assert detail["events"] == []
    assert detail["birth_place"]["id"] == place_id

    update_response = test_client.put(
        f"/persons/{person_id}",
        json={"last_name": f"Schmidt{suffix}", "description": "Updated description"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["last_name"] == f"Schmidt{suffix}"
    assert updated["description"] == "Updated description"

    delete_response = test_client.delete(f"/persons/{person_id}")
    assert delete_response.status_code == 204

    missing_response = test_client.get(f"/persons/{person_id}")
    assert missing_response.status_code == 404
    assert missing_response.json() == {
        "error": "not_found",
        "detail": f"Person {person_id} not found",
    }


def test_place_autocomplete_limits_results_to_ten(test_client) -> None:
    prefix = f"AutoPlace-{uuid4().hex[:8]}"

    for index in range(12):
        response = test_client.post(
            "/places",
            json={"name": f"{prefix}-{index:02d}", "full_name": f"{prefix}-{index:02d}, Region"},
        )
        assert response.status_code == 201

    autocomplete_response = test_client.get(f"/places?q={prefix}")
    assert autocomplete_response.status_code == 200

    results = autocomplete_response.json()
    assert len(results) == 10
    assert all(prefix in place["name"] for place in results)


def test_person_update_rejects_unknown_birth_place(test_client) -> None:
    suffix = uuid4().hex[:8]

    create_response = test_client.post(
        "/persons",
        json={"first_name": f"Mila{suffix}", "last_name": f"Proof{suffix}"},
    )
    assert create_response.status_code == 201
    person_id = create_response.json()["id"]

    missing_place_id = str(uuid4())
    update_response = test_client.put(
        f"/persons/{person_id}",
        json={"birth_place_id": missing_place_id},
    )

    assert update_response.status_code == 404
    assert update_response.json() == {
        "error": "not_found",
        "detail": f"Place {missing_place_id} not found",
    }


def test_person_image_metadata_roundtrip(test_client) -> None:
    suffix = uuid4().hex[:8]
    person_response = test_client.post(
        "/persons",
        json={"first_name": f"Photo{suffix}", "last_name": f"Person{suffix}"},
    )
    assert person_response.status_code == 201
    person_id = person_response.json()["id"]

    upload_response = test_client.post(
        "/files/upload",
        files={"file": ("family.png", b"fake-image-bytes", "image/png")},
    )
    assert upload_response.status_code == 201
    file_id = upload_response.json()["id"]

    attach_response = test_client.post(
        f"/persons/{person_id}/images",
        data={"file_id": file_id, "is_profile": "true"},
    )
    assert attach_response.status_code == 201

    detail_before = test_client.get(f"/persons/{person_id}")
    assert detail_before.status_code == 200
    image_id = detail_before.json()["images"][0]["id"]

    patch_response = test_client.patch(
        f"/persons/{person_id}/images/{image_id}",
        json={
            "caption": "Sommerfest",
            "date_text": "1948",
            "place_text": "Berlin",
        },
    )

    assert patch_response.status_code == 200
    detail = patch_response.json()
    assert detail["images"][0]["caption"] == "Sommerfest"
    assert detail["images"][0]["date_text"] == "1948"
    assert detail["images"][0]["place_text"] == "Berlin"
