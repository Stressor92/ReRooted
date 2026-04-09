from __future__ import annotations

import re
from datetime import date
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models import Event, EventType, Person, Relationship, RelType


def build_tree(db: Session) -> dict[str, list[dict[str, Any]]]:
    persons = db.query(Person).options(joinedload(Person.images)).all()
    events = db.query(Event).filter(Event.event_type.in_([EventType.BIRTH, EventType.DEATH])).all()
    relationships = db.query(Relationship).options(joinedload(Relationship.children)).all()

    if not persons:
        return {"nodes": [], "edges": []}

    birth_map = _event_map(events, EventType.BIRTH)
    death_map = _event_map(events, EventType.DEATH)

    nodes = [_person_node(person, birth_map, death_map) for person in persons]
    edges = _relationship_edges(relationships)
    edges.extend(_child_edges(relationships))

    return {"nodes": nodes, "edges": edges}


def _person_node(
    person: Person,
    birth_map: dict[str, Event],
    death_map: dict[str, Event],
) -> dict[str, Any]:
    person_id = str(person.id)
    description = str(person.description).strip() if person.description is not None else ""
    description_excerpt = None
    if description:
        description_excerpt = description[:120].rstrip()
        if len(description) > 120:
            description_excerpt = f"{description[:117].rstrip()}..."

    return {
        "id": person_id,
        "type": "person",
        "position": {"x": 0, "y": 0},
        "data": {
            "first_name": str(person.first_name),
            "last_name": str(person.last_name),
            "is_living": person.is_living,
            "birth_year": _year_label(birth_map.get(person_id)),
            "death_year": _year_label(death_map.get(person_id)),
            "profile_image_url": person.profile_image_url,
            "description_excerpt": description_excerpt,
        },
    }


def _relationship_edges(relationships: list[Relationship]) -> list[dict[str, Any]]:
    edges: list[dict[str, Any]] = []
    for rel in relationships:
        if rel.person2_id is None:
            continue

        start_date = rel.start_date if isinstance(rel.start_date, date) else None
        end_date = rel.end_date if isinstance(rel.end_date, date) else None

        edges.append(
            {
                "id": f"partner-{rel.id}",
                "source": str(rel.person1_id),
                "target": str(rel.person2_id),
                "type": "partner",
                "data": {
                    "rel_type": rel.rel_type.value,
                    "start_date": start_date.isoformat() if start_date is not None else None,
                    "end_date": end_date.isoformat() if end_date is not None else None,
                },
            }
        )
    return edges


def _child_edges(relationships: list[Relationship]) -> list[dict[str, Any]]:
    edges: list[dict[str, Any]] = []
    dashed_types = {RelType.ADOPTION, RelType.FOSTER}

    for rel in relationships:
        parent_ids = [str(rel.person1_id)]
        if rel.person2_id is not None:
            parent_ids.append(str(rel.person2_id))

        for child_link in rel.children:
            child_id = str(child_link.child_id)
            for parent_id in parent_ids:
                edges.append(
                    {
                        "id": f"child-{rel.id}-{parent_id}-{child_id}",
                        "source": parent_id,
                        "target": child_id,
                        "type": "child",
                        "data": {
                            "rel_type": rel.rel_type.value,
                            "dashed": rel.rel_type in dashed_types,
                        },
                    }
                )
    return edges


def _event_map(events: list[Event], event_type: EventType) -> dict[str, Event]:
    result: dict[str, Event] = {}
    for event in events:
        if event.event_type != event_type:
            continue

        person_id = str(event.person_id)
        existing = result.get(person_id)
        if existing is None or _sortable_event_date(event) < _sortable_event_date(existing):
            result[person_id] = event
    return result


def _sortable_event_date(event: Event) -> date:
    if isinstance(event.date_sort, date):
        return event.date_sort
    return date.max


def _year_label(event: Event | None) -> str | None:
    if event is None:
        return None

    if isinstance(event.date_sort, date):
        return str(event.date_sort.year)

    if event.date_text is None:
        return None

    match = re.search(r"(\d{4})", str(event.date_text))
    return match.group(1) if match else None
