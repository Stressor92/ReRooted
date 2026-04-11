"""GEDCOM Import / Export Service."""

from __future__ import annotations

import importlib
import re
from tempfile import NamedTemporaryFile
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Event, EventType, Person, Place, Relationship, RelationshipChild, RelType
from app.utils.date_parser import parse_flex_date

GEDCOM_EVENT_MAP = {
    "BIRT": EventType.BIRTH,
    "DEAT": EventType.DEATH,
    "ENGA": EventType.ENGAGEMENT,
    "MARR": EventType.MARRIAGE,
    "DIV": EventType.DIVORCE,
    "BAPM": EventType.BAPTISM,
    "GRAD": EventType.ACADEMIC_DEGREE,
    "RETI": EventType.RETIREMENT,
    "RESI": EventType.MOVE,
    "EMIG": EventType.EMIGRATION,
    "EVEN": EventType.OTHER,
    "ADOP": EventType.ADOPTION,
}

def preview_gedcom(file_bytes: bytes) -> dict[str, int]:
    parsed = _parse_bytes(file_bytes)
    return {
        "persons": len(parsed.get("persons", [])),
        "families": len(parsed.get("families", [])),
        "places": len(parsed.get("places", [])),
        "events": len(parsed.get("events", [])),
    }


def import_gedcom(file_bytes: bytes, db: Session) -> dict[str, int | str]:
    parsed = _parse_bytes(file_bytes)

    places_map = _create_places(parsed.get("places", []), db)
    persons_map = _create_persons(parsed.get("persons", []), places_map, db)
    _create_events(parsed.get("events", []), persons_map, places_map, db)
    _create_relationships(parsed.get("families", []), persons_map, db)

    db.commit()
    return {
        "imported_persons": len(persons_map),
        "imported_families": len(parsed.get("families", [])),
        "status": "ok",
    }


def _parse_bytes(file_bytes: bytes) -> dict[str, list[Any]]:
    if not file_bytes:
        raise ValueError("The uploaded GEDCOM file is empty")

    parsed = _parse_with_python_gedcom2(file_bytes)
    if parsed is not None:
        return parsed

    return _parse_gedcom_text(_decode_gedcom_bytes(file_bytes))


def _parse_with_python_gedcom2(file_bytes: bytes) -> dict[str, list[Any]] | None:
    try:
        parser_module = importlib.import_module("gedcom.parser")
        parser_class = parser_module.Parser
    except Exception:
        return None

    with NamedTemporaryFile("wb", suffix=".ged", delete=True) as handle:
        handle.write(file_bytes)
        handle.flush()

        parser = parser_class()
        parser.parse_file(handle.name)

    return _parse_gedcom_text(_decode_gedcom_bytes(file_bytes))


def _decode_gedcom_bytes(file_bytes: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("The uploaded GEDCOM file could not be decoded")


def _parse_gedcom_text(text: str) -> dict[str, list[Any]]:
    if "0 HEAD" not in text or (" INDI" not in text and " FAM" not in text):
        raise ValueError("The uploaded file is not valid GEDCOM data")

    persons: list[dict[str, Any]] = []
    families: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    places: set[str] = set()

    current_person: dict[str, Any] | None = None
    current_family: dict[str, Any] | None = None
    current_event: dict[str, Any] | None = None
    last_child: dict[str, Any] | None = None

    def flush_event() -> None:
        nonlocal current_event
        if current_event is None:
            return

        place_name = current_event.get("place")
        if isinstance(place_name, str) and place_name.strip():
            places.add(place_name.strip())

        if current_event.get("scope") == "family":
            family_ref = current_event.get("family")
            if family_ref is not None:
                family_ref["marriage_date"] = current_event.get("date_text")
                family_ref["marriage_place"] = current_event.get("place")

        events.append(current_event)
        current_event = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = re.match(r"^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$", line)
        if match is None:
            continue

        level = int(match.group(1))
        pointer = match.group(2)
        tag = match.group(3).upper()
        value = (match.group(4) or "").strip()

        if level == 0:
            flush_event()
            current_person = None
            current_family = None
            last_child = None

            if tag == "INDI":
                current_person = {
                    "pointer": pointer or "",
                    "first_name": "",
                    "last_name": "",
                    "sex": None,
                    "birth_place": None,
                }
                persons.append(current_person)
            elif tag == "FAM":
                current_family = {
                    "pointer": pointer or "",
                    "husb": None,
                    "wife": None,
                    "children": [],
                    "rel_type": RelType.PARTNER.value,
                    "marriage_date": None,
                    "marriage_place": None,
                }
                families.append(current_family)
            continue

        if current_person is not None:
            if level == 1:
                last_child = None
                if tag == "NAME":
                    name_match = re.match(r"(?P<first>[^/]*)\s*/(?P<last>[^/]*)/", value)
                    if name_match is not None:
                        current_person["first_name"] = name_match.group("first").strip()
                        current_person["last_name"] = name_match.group("last").strip()
                    else:
                        current_person["first_name"] = value.strip()
                elif tag == "SEX":
                    current_person["sex"] = value or None
                elif tag in GEDCOM_EVENT_MAP:
                    if tag == "DEAT":
                        current_person["has_death"] = True
                    flush_event()
                    current_event = {
                        "scope": "person",
                        "person_pointer": current_person["pointer"],
                        "tag": tag,
                        "date_text": None,
                        "place": None,
                    }
                else:
                    flush_event()
            elif level >= 2 and current_event is not None:
                if tag == "DATE":
                    current_event["date_text"] = value or None
                elif tag == "PLAC":
                    current_event["place"] = value or None
                    if current_event["tag"] == "BIRT" and current_person.get("birth_place") is None:
                        current_person["birth_place"] = value or None
            continue

        if current_family is not None:
            if level == 1:
                last_child = None
                if tag == "HUSB":
                    current_family["husb"] = value or None
                elif tag == "WIFE":
                    current_family["wife"] = value or None
                elif tag == "CHIL":
                    last_child = {"pointer": value or None, "rel_type": RelType.PARTNER.value}
                    current_family["children"].append(last_child)
                elif tag == "MARR":
                    flush_event()
                    current_event = {
                        "scope": "family",
                        "family": current_family,
                        "person_pointers": [
                            ref
                            for ref in (current_family.get("husb"), current_family.get("wife"))
                            if ref is not None
                        ],
                        "tag": "MARR",
                        "date_text": None,
                        "place": None,
                    }
                else:
                    flush_event()
            elif level >= 2:
                if current_event is not None:
                    if tag == "DATE":
                        current_event["date_text"] = value or None
                    elif tag == "PLAC":
                        current_event["place"] = value or None
                if last_child is not None and tag in {"PEDI", "_FREL", "RELA", "REL"}:
                    if "adopt" in value.lower():
                        last_child["rel_type"] = RelType.ADOPTION.value
                        current_family["rel_type"] = RelType.ADOPTION.value

    flush_event()

    if not persons and not families:
        raise ValueError("The uploaded file does not contain GEDCOM person or family records")

    return {
        "persons": persons,
        "families": families,
        "events": events,
        "places": sorted(places),
    }


def _create_places(places: list[Any], db: Session) -> dict[str, str]:
    cleaned_places = [str(place).strip() for place in places if str(place).strip()]
    if not cleaned_places:
        return {}

    existing_places = db.scalars(select(Place)).all()
    existing_by_name = {
        str(place.name).strip().lower(): place for place in existing_places if place.name
    }

    place_map: dict[str, str] = {}
    for original_name in cleaned_places:
        key = original_name.lower()
        place = existing_by_name.get(key)
        if place is None:
            place = Place(name=original_name, full_name=original_name)
            db.add(place)
            db.flush()
            existing_by_name[key] = place
        place_map[original_name] = str(place.id)

    return place_map


def _create_persons(persons: list[Any], places_map: dict[str, str], db: Session) -> dict[str, str]:
    person_rows = [row for row in persons if isinstance(row, dict) and row.get("pointer")]
    if not person_rows:
        return {}

    pointers = [str(row["pointer"]) for row in person_rows]
    existing_people = db.scalars(select(Person).where(Person.gramps_id.in_(pointers))).all()
    existing_by_gramps = {
        str(person.gramps_id): person for person in existing_people if person.gramps_id
    }

    persons_map: dict[str, str] = {}
    for row in person_rows:
        pointer = str(row["pointer"])
        birth_place_name = row.get("birth_place")
        birth_place_id = None
        if isinstance(birth_place_name, str):
            birth_place_id = places_map.get(birth_place_name)

        person = existing_by_gramps.get(pointer)
        if person is None:
            person = Person(
                first_name=str(row.get("first_name") or "Unknown"),
                last_name=str(row.get("last_name") or "Person"),
                is_living=False if _person_has_death(row) else None,
                birth_place_id=birth_place_id,
                gramps_id=pointer,
            )
            db.add(person)
            db.flush()
            existing_by_gramps[pointer] = person
        else:
            person_data = cast(Any, person)
            person_data.first_name = str(row.get("first_name") or person.first_name)
            person_data.last_name = str(row.get("last_name") or person.last_name)
            person_data.birth_place_id = birth_place_id
            if _person_has_death(row):
                person_data.is_living = False

        persons_map[pointer] = str(person.id)

    return persons_map


def _person_has_death(row: dict[str, Any]) -> bool:
    return bool(row.get("has_death"))


def _create_events(
    events: list[Any],
    persons_map: dict[str, str],
    places_map: dict[str, str],
    db: Session,
) -> None:
    for row in events:
        if not isinstance(row, dict):
            continue

        mapped_type = GEDCOM_EVENT_MAP.get(str(row.get("tag", "")).upper())
        if mapped_type is None:
            continue

        date_text = str(row.get("date_text")).strip() if row.get("date_text") else None
        place_value = str(row.get("place")).strip() if row.get("place") else None
        place_id = places_map.get(place_value) if place_value is not None else None
        parsed_date = parse_flex_date(date_text)
        date_sort = parsed_date.get("sort") if isinstance(parsed_date, dict) else None

        person_pointers = row.get("person_pointers")
        if isinstance(person_pointers, list):
            target_pointers = [str(pointer) for pointer in person_pointers if pointer]
        elif row.get("person_pointer"):
            target_pointers = [str(row["person_pointer"])]
        else:
            target_pointers = []

        for pointer in target_pointers:
            person_id = persons_map.get(pointer)
            if person_id is None:
                continue

            existing_event = db.scalars(
                select(Event).where(
                    Event.person_id == person_id,
                    Event.event_type == mapped_type,
                    Event.date_text == date_text,
                    Event.place_id == place_id,
                )
            ).first()
            if existing_event is not None:
                continue

            db.add(
                Event(
                    person_id=person_id,
                    event_type=mapped_type,
                    date_text=date_text,
                    date_sort=date_sort,
                    place_id=place_id,
                )
            )

    db.flush()


def _create_relationships(families: list[Any], persons_map: dict[str, str], db: Session) -> None:
    for row in families:
        if not isinstance(row, dict):
            continue

        person1_id = persons_map.get(str(row.get("husb") or ""))
        person2_id = persons_map.get(str(row.get("wife") or ""))
        if person1_id is None and person2_id is None:
            continue

        primary_id = person1_id or person2_id
        secondary_id = person2_id if primary_id == person1_id else None
        if primary_id is None:
            continue

        rel_type_value = str(row.get("rel_type") or RelType.PARTNER.value)
        rel_type = (
            RelType(rel_type_value)
            if rel_type_value in {item.value for item in RelType}
            else RelType.PARTNER
        )
        parsed_start = parse_flex_date(str(row.get("marriage_date") or ""))
        start_date = parsed_start.get("sort") if isinstance(parsed_start, dict) else None

        relationship = db.scalars(
            select(Relationship).where(
                Relationship.person1_id == primary_id,
                Relationship.person2_id == secondary_id,
            )
        ).first()
        if relationship is None:
            relationship = Relationship(
                person1_id=primary_id,
                person2_id=secondary_id,
                rel_type=rel_type,
                start_date=start_date,
            )
            db.add(relationship)
            db.flush()
        else:
            relationship.rel_type = rel_type
            if start_date is not None:
                relationship.start_date = start_date

        for child in row.get("children", []):
            if not isinstance(child, dict):
                continue
            child_pointer = child.get("pointer")
            if not child_pointer:
                continue

            child_id = persons_map.get(str(child_pointer))
            if child_id is None:
                continue

            existing_link = db.get(
                RelationshipChild,
                {"relationship_id": str(relationship.id), "child_id": child_id},
            )
            if existing_link is None:
                db.add(RelationshipChild(relationship_id=str(relationship.id), child_id=child_id))

    db.flush()


def export_gedcom(db: Session) -> str:
    lines: list[str] = [
        "0 HEAD",
        "1 SOUR ReRooted",
        "2 VERS 0.1.0",
        "1 GEDC",
        "2 VERS 5.5.1",
        "1 CHAR UTF-8",
    ]

    persons = db.query(Person).options(joinedload(Person.birth_place)).all()
    events = db.query(Event).options(joinedload(Event.place)).all()
    relationships = db.query(Relationship).options(joinedload(Relationship.children)).all()

    birth_map = _event_map(events, EventType.BIRTH)
    death_map = _event_map(events, EventType.DEATH)

    for person in persons:
        person_id = str(person.id)
        lines.append(f"0 @{person_id}@ INDI")

        if person.is_living is True:
            lines.append("1 NAME Living /Person/")
            continue

        if person.is_living is None:
            lines.append("1 RESN PRIVACY")

        lines.append(f"1 NAME {person.first_name} /{person.last_name}/")

        birth = birth_map.get(person_id)
        if birth is not None:
            lines.append("1 BIRT")
            if birth.date_text:
                lines.append(f"2 DATE {birth.date_text}")
            if birth.place is not None and birth.place.name is not None:
                lines.append(f"2 PLAC {birth.place.name}")

        death = death_map.get(person_id)
        if death is not None:
            lines.append("1 DEAT")
            if death.date_text:
                lines.append(f"2 DATE {death.date_text}")
            if death.place is not None and death.place.name is not None:
                lines.append(f"2 PLAC {death.place.name}")

    for index, relationship in enumerate(relationships, start=1):
        lines.append(f"0 @F{index}@ FAM")
        lines.append(f"1 HUSB @{relationship.person1_id}@")
        if relationship.person2_id is not None:
            lines.append(f"1 WIFE @{relationship.person2_id}@")
        for child in relationship.children:
            lines.append(f"1 CHIL @{child.child_id}@")
            if relationship.rel_type == RelType.ADOPTION:
                lines.append("2 PEDI adopted")
        if relationship.start_date is not None:
            lines.append("1 MARR")
            lines.append(f"2 DATE {relationship.start_date.isoformat()}")

    lines.append("0 TRLR")
    return "\n".join(lines)


def _event_map(events: list[Event], event_type: EventType) -> dict[str, Event]:
    result: dict[str, Event] = {}
    for event in events:
        if event.event_type == event_type and str(event.person_id) not in result:
            result[str(event.person_id)] = event
    return result
