from __future__ import annotations

from uuid import uuid4


def _create_person(test_client, first_name: str, last_name: str) -> str:
    response = test_client.post(
        "/persons",
        json={"first_name": first_name, "last_name": last_name},
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_duplicate_child_assignment_returns_structured_conflict(test_client) -> None:
    suffix = uuid4().hex[:8]
    parent_one = _create_person(test_client, f"Alex{suffix}", f"Root{suffix}")
    parent_two = _create_person(test_client, f"Blair{suffix}", f"Root{suffix}")
    child = _create_person(test_client, f"Drew{suffix}", f"Root{suffix}")

    create_response = test_client.post(
        "/relationships",
        json={
            "person1_id": parent_one,
            "person2_id": parent_two,
            "rel_type": "partner",
            "child_ids": [child],
        },
    )
    assert create_response.status_code == 201
    relationship_id = create_response.json()["id"]

    duplicate_response = test_client.post(f"/relationships/{relationship_id}/children/{child}")

    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["error"] == "conflict"


def test_list_relationships_for_person_filters_patchwork_relations(test_client) -> None:
    suffix = uuid4().hex[:8]
    parent_a = _create_person(test_client, f"ParentA{suffix}", f"Root{suffix}")
    parent_b = _create_person(test_client, f"ParentB{suffix}", f"Root{suffix}")
    parent_c = _create_person(test_client, f"ParentC{suffix}", f"Root{suffix}")

    first = test_client.post(
        "/relationships",
        json={"person1_id": parent_a, "person2_id": parent_b, "rel_type": "partner"},
    )
    assert first.status_code == 201

    second = test_client.post(
        "/relationships",
        json={"person1_id": parent_a, "person2_id": parent_c, "rel_type": "ex"},
    )
    assert second.status_code == 201

    response = test_client.get(f"/relationships?person_id={parent_a}")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert all(isinstance(item["child_ids"], list) for item in payload)
    assert {item["rel_type"] for item in payload} == {"partner", "ex"}


def test_relationship_update_rejects_unknown_person_reference(test_client) -> None:
    suffix = uuid4().hex[:8]
    parent_one = _create_person(test_client, f"Robin{suffix}", f"Lane{suffix}")
    parent_two = _create_person(test_client, f"Taylor{suffix}", f"Lane{suffix}")

    create_response = test_client.post(
        "/relationships",
        json={"person1_id": parent_one, "person2_id": parent_two, "rel_type": "partner"},
    )
    assert create_response.status_code == 201
    relationship_id = create_response.json()["id"]

    missing_person_id = str(uuid4())
    update_response = test_client.put(
        f"/relationships/{relationship_id}",
        json={"person2_id": missing_person_id},
    )

    assert update_response.status_code == 404
    assert update_response.json() == {
        "error": "not_found",
        "detail": f"Person {missing_person_id} not found",
    }
