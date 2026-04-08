from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Event, EventType, Person, Relationship, RelType


def build_tree(db: Session) -> dict:
    persons = db.query(Person).all()
    events = db.query(Event).all()
    relationships = db.query(Relationship).all()

    birth_map = _event_map(events, EventType.BIRTH)
    death_map = _event_map(events, EventType.DEATH)

    nodes = [_person_node(person, birth_map, death_map) for person in persons]
    edges = _relationship_edges(relationships) + _child_edges(relationships)

    return {"nodes": nodes, "edges": edges}


def _person_node(person: Person, birth_map: dict, death_map: dict) -> dict:
    birth = birth_map.get(person.id)
    death = death_map.get(person.id)
    profile_image_id = (
        next((img.file_id for img in person.images if img.is_profile), None)
        if person.images
        else None
    )
    return {
        "id": person.id,
        "type": "person",
        "position": {"x": 0, "y": 0},
        "data": {
            "first_name": person.first_name,
            "last_name": person.last_name,
            "is_living": person.is_living,
            "birth_year": birth.date_text if birth else None,
            "death_year": death.date_text if death else None,
            "profile_image_id": profile_image_id,
            "description_excerpt": (person.description or "")[:120] or None,
        },
    }


def _relationship_edges(relationships: list[Relationship]) -> list[dict]:
    edges = []
    for rel in relationships:
        if rel.person2_id:
            edges.append(
                {
                    "id": f"partner-{rel.id}",
                    "source": rel.person1_id,
                    "target": rel.person2_id,
                    "type": "partner",
                    "data": {
                        "rel_type": rel.rel_type,
                        "start_date": rel.start_date.isoformat() if rel.start_date else None,
                        "end_date": rel.end_date.isoformat() if rel.end_date else None,
                    },
                }
            )
    return edges


def _child_edges(relationships: list[Relationship]) -> list[dict]:
    edges = []
    dashed_types = {RelType.ADOPTION, RelType.FOSTER}

    for rel in relationships:
        is_dashed = rel.rel_type in dashed_types
        for child_link in rel.children:
            edges.append(
                {
                    "id": f"child-{rel.id}-{child_link.child_id}",
                    "source": rel.person1_id,
                    "target": child_link.child_id,
                    "type": "child",
                    "data": {
                        "rel_type": rel.rel_type,
                        "dashed": is_dashed,
                    },
                }
            )
    return edges


def _event_map(events: list[Event], event_type: EventType) -> dict[str, Event]:
    result: dict[str, Event] = {}
    for event in events:
        person_id = str(event.person_id)
        if event.event_type == event_type and person_id not in result:
            result[person_id] = event
    return result
