from __future__ import annotations

from datetime import date
from uuid import uuid4

from app.models.event import Event, EventType
from app.models.person import Person
from app.models.relationship import Relationship, RelationshipChild, RelType
from app.services.tree_service import build_tree
from sqlalchemy import event as sqlalchemy_event


def test_tree_empty_returns_no_nodes_or_edges(db_session) -> None:
    assert build_tree(db_session) == {"nodes": [], "edges": []}


def test_build_tree_handles_family_patchwork_and_adoption(db_session) -> None:
    parent_a = Person(first_name="Alex", last_name="Root", description="A" * 150)
    parent_b = Person(first_name="Blair", last_name="Root")
    parent_c = Person(first_name="Casey", last_name="Root")
    child_one = Person(first_name="Drew", last_name="Root")
    child_two = Person(first_name="Evan", last_name="Root")
    adopted_child = Person(first_name="Finn", last_name="Root")
    db_session.add_all([parent_a, parent_b, parent_c, child_one, child_two, adopted_child])
    db_session.flush()

    db_session.add_all(
        [
            Event(
                person_id=parent_a.id,
                event_type=EventType.BIRTH,
                date_text="15.04.1923",
                date_sort=date(1923, 4, 15),
            ),
            Event(
                person_id=parent_a.id,
                event_type=EventType.DEATH,
                date_text="1987",
                date_sort=date(1987, 1, 1),
            ),
        ]
    )

    rel_one = Relationship(
        person1_id=parent_a.id,
        person2_id=parent_b.id,
        rel_type=RelType.PARTNER,
        start_date=date(1950, 6, 1),
    )
    rel_two = Relationship(
        person1_id=parent_a.id,
        person2_id=parent_c.id,
        rel_type=RelType.EX,
    )
    rel_three = Relationship(
        person1_id=parent_b.id,
        person2_id=parent_c.id,
        rel_type=RelType.ADOPTION,
    )
    db_session.add_all([rel_one, rel_two, rel_three])
    db_session.flush()

    db_session.add_all(
        [
            RelationshipChild(relationship_id=rel_one.id, child_id=child_one.id),
            RelationshipChild(relationship_id=rel_two.id, child_id=child_two.id),
            RelationshipChild(relationship_id=rel_three.id, child_id=adopted_child.id),
        ]
    )
    db_session.commit()

    tree = build_tree(db_session)

    assert len(tree["nodes"]) == 6

    alex_node = next(node for node in tree["nodes"] if node["id"] == parent_a.id)
    assert alex_node["data"]["birth_year"] == "1923"
    assert alex_node["data"]["death_year"] == "1987"
    assert alex_node["data"]["profile_image_url"] is None
    assert len(alex_node["data"]["description_excerpt"]) == 120
    assert alex_node["data"]["description_excerpt"].endswith("...")

    partner_edge = next(edge for edge in tree["edges"] if edge["id"] == f"partner-{rel_one.id}")
    assert partner_edge["data"]["rel_type"] == "partner"
    assert partner_edge["data"]["start_date"] == "1950-06-01"

    child_one_edges = [
        edge for edge in tree["edges"] if edge["type"] == "child" and edge["target"] == child_one.id
    ]
    assert {edge["source"] for edge in child_one_edges} == {parent_a.id, parent_b.id}

    child_two_edges = [
        edge for edge in tree["edges"] if edge["type"] == "child" and edge["target"] == child_two.id
    ]
    assert {edge["source"] for edge in child_two_edges} == {parent_a.id, parent_c.id}
    assert parent_b.id not in {edge["source"] for edge in child_two_edges}

    adopted_edges = [
        edge
        for edge in tree["edges"]
        if edge["type"] == "child" and edge["target"] == adopted_child.id
    ]
    assert len(adopted_edges) == 2
    assert all(edge["data"]["dashed"] is True for edge in adopted_edges)
    assert all(edge["data"]["rel_type"] == "adoption" for edge in adopted_edges)


def test_relationship_endpoints_support_crud_and_child_management(test_client) -> None:
    suffix = uuid4().hex[:8]

    person_ids: list[str] = []
    for name in ("Alex", "Blair", "Drew"):
        response = test_client.post(
            "/persons",
            json={"first_name": f"{name}{suffix}", "last_name": f"Root{suffix}"},
        )
        assert response.status_code == 201
        person_ids.append(response.json()["id"])

    create_response = test_client.post(
        "/relationships",
        json={
            "person1_id": person_ids[0],
            "person2_id": person_ids[1],
            "rel_type": "partner",
            "child_ids": [person_ids[2]],
        },
    )
    assert create_response.status_code == 201
    relationship = create_response.json()
    relationship_id = relationship["id"]
    assert relationship["child_ids"] == [person_ids[2]]

    list_response = test_client.get("/relationships")
    assert list_response.status_code == 200
    assert any(item["id"] == relationship_id for item in list_response.json())

    duplicate_child_response = test_client.post(
        f"/relationships/{relationship_id}/children/{person_ids[2]}"
    )
    assert duplicate_child_response.status_code == 409

    update_response = test_client.put(
        f"/relationships/{relationship_id}",
        json={"rel_type": "ex", "end_date": "2000-01-01"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["rel_type"] == "ex"
    assert updated["end_date"] == "2000-01-01"

    remove_child_response = test_client.delete(
        f"/relationships/{relationship_id}/children/{person_ids[2]}"
    )
    assert remove_child_response.status_code == 204

    delete_response = test_client.delete(f"/relationships/{relationship_id}")
    assert delete_response.status_code == 204


def test_build_tree_executes_without_n_plus_one_queries(db_session) -> None:
    people = [Person(first_name=f"Person{index}", last_name="Load") for index in range(50)]
    db_session.add_all(people)
    db_session.flush()

    for index in range(0, 48, 2):
        relationship = Relationship(
            person1_id=people[index].id,
            person2_id=people[index + 1].id,
            rel_type=RelType.PARTNER,
        )
        db_session.add(relationship)
        db_session.flush()
        db_session.add(RelationshipChild(relationship_id=relationship.id, child_id=people[-1].id))

    db_session.commit()

    engine = db_session.get_bind()
    query_count = 0

    def before_cursor_execute(*_args, **_kwargs) -> None:
        nonlocal query_count
        query_count += 1

    sqlalchemy_event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        tree = build_tree(db_session)
    finally:
        sqlalchemy_event.remove(engine, "before_cursor_execute", before_cursor_execute)

    assert len(tree["nodes"]) == 50
    assert query_count <= 5
