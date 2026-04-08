from datetime import date

from app.models.event import Event, EventType
from app.models.person import Person
from app.models.relationship import Relationship, RelationshipChild, RelType
from app.services.tree_service import build_tree


def test_build_tree_returns_nodes_and_expected_edges(db_session) -> None:
    parent = Person(first_name="Marta", last_name="Root", is_living=False)
    partner = Person(first_name="Jonas", last_name="Root", is_living=True)
    child = Person(first_name="Lina", last_name="Root", is_living=True)

    db_session.add_all([parent, partner, child])
    db_session.flush()

    db_session.add_all(
        [
            Event(
                person_id=parent.id,
                event_type=EventType.BIRTH,
                date_text="1901",
                date_sort=date(1901, 1, 1),
            ),
            Event(
                person_id=parent.id,
                event_type=EventType.DEATH,
                date_text="1980",
                date_sort=date(1980, 1, 1),
            ),
        ]
    )

    relationship = Relationship(
        person1_id=parent.id, person2_id=partner.id, rel_type=RelType.ADOPTION
    )
    db_session.add(relationship)
    db_session.flush()
    db_session.add(RelationshipChild(relationship_id=relationship.id, child_id=child.id))
    db_session.commit()

    tree = build_tree(db_session)

    assert len(tree["nodes"]) == 3
    assert len(tree["edges"]) == 2

    parent_node = next(node for node in tree["nodes"] if node["id"] == parent.id)
    assert parent_node["data"]["birth_year"] == "1901"
    assert parent_node["data"]["death_year"] == "1980"

    partner_edge = next(edge for edge in tree["edges"] if edge["type"] == "partner")
    assert partner_edge["data"]["rel_type"] == RelType.ADOPTION

    child_edge = next(edge for edge in tree["edges"] if edge["type"] == "child")
    assert child_edge["data"]["dashed"] is True
    assert child_edge["target"] == child.id
