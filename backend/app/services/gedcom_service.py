"""GEDCOM Import / Export Service."""

from __future__ import annotations

from sqlalchemy.orm import Session


def preview_gedcom(file_bytes: bytes) -> dict:
    parsed = _parse_bytes(file_bytes)
    return {
        "persons": len(parsed.get("persons", [])),
        "families": len(parsed.get("families", [])),
        "places": len(parsed.get("places", [])),
        "events": len(parsed.get("events", [])),
    }


def import_gedcom(file_bytes: bytes, db: Session) -> dict:
    parsed = _parse_bytes(file_bytes)

    places_map = _create_places(parsed.get("places", []), db)
    persons_map = _create_persons(parsed.get("persons", []), places_map, db)
    _create_events(parsed.get("events", []), persons_map, places_map, db)
    _create_relationships(parsed.get("families", []), persons_map, db)

    db.commit()
    return {"imported_persons": len(persons_map), "status": "ok"}


def _parse_bytes(file_bytes: bytes) -> dict:
    raise NotImplementedError("GEDCOM parser not yet implemented — see US-020")


def _create_places(places: list, db: Session) -> dict[str, str]:
    return {}


def _create_persons(persons: list, places_map: dict, db: Session) -> dict[str, str]:
    return {}


def _create_events(events: list, persons_map: dict, places_map: dict, db: Session) -> None:
    return None


def _create_relationships(families: list, persons_map: dict, db: Session) -> None:
    return None


def export_gedcom(db: Session) -> str:
    from app.models import Event, EventType, Person

    lines: list[str] = [
        "0 HEAD",
        "1 SOUR ReRooted",
        "2 VERS 0.1.0",
        "1 GEDC",
        "2 VERS 5.5.1",
        "1 CHAR UTF-8",
    ]

    persons = db.query(Person).all()
    birth_map = {
        event.person_id: event
        for event in db.query(Event).filter(Event.event_type == EventType.BIRTH)
    }
    death_map = {
        event.person_id: event
        for event in db.query(Event).filter(Event.event_type == EventType.DEATH)
    }

    for person in persons:
        lines.append(f"0 @{person.id}@ INDI")
        if person.is_living:
            lines.append("1 NAME Living /Person/")
            continue

        lines.append(f"1 NAME {person.first_name} /{person.last_name}/")

        if birth := birth_map.get(person.id):
            lines.append("1 BIRT")
            if birth.date_text:
                lines.append(f"2 DATE {birth.date_text}")
            if birth.place:
                lines.append(f"2 PLAC {birth.place.name}")

        if death := death_map.get(person.id):
            lines.append("1 DEAT")
            if death.date_text:
                lines.append(f"2 DATE {death.date_text}")

    lines.append("0 TRLR")
    return "\n".join(lines)
