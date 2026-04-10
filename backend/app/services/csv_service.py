from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.models import Event, EventType, Person, Place, Relationship, RelType

FIELDNAMES = [
    "person_id",
    "vorname",
    "nachname",
    "geburtsdatum",
    "geburtsort",
    "sterbedatum",
    "sterbeort",
    "lebt_status",
    "beschreibung",
    "elter1_id",
    "elter1_name",
    "elter1_beziehungstyp",
    "elter2_id",
    "elter2_name",
    "elter2_beziehungstyp",
    "partner1_id",
    "partner1_name",
    "partner1_beziehungstyp",
    "partner1_von",
    "partner1_bis",
    "partner2_id",
    "partner2_name",
    "partner2_beziehungstyp",
    "partner2_von",
    "partner2_bis",
    "partner3_id",
    "partner3_name",
    "partner3_beziehungstyp",
    "partner3_von",
    "partner3_bis",
    "kind1_id",
    "kind1_name",
    "kind1_beziehungstyp",
    "kind2_id",
    "kind2_name",
    "kind2_beziehungstyp",
    "kind3_id",
    "kind3_name",
    "kind3_beziehungstyp",
    "kind4_id",
    "kind4_name",
    "kind4_beziehungstyp",
    "kind5_id",
    "kind5_name",
    "kind5_beziehungstyp",
]

LIVING_LABELS = {True: "Lebt", False: "Verstorben", None: "Unbekannt"}

REL_TYPE_PARTNER_LABELS = {
    RelType.PARTNER: "Ehe/Partnerschaft",
    RelType.EX: "Ex-Partnerschaft",
    RelType.ADOPTION: "Unbekannt",
    RelType.FOSTER: "Unbekannt",
    RelType.UNKNOWN: "Unbekannt",
}

REL_TYPE_CHILD_LABELS = {
    RelType.PARTNER: "Biologisch",
    RelType.EX: "Biologisch",
    RelType.ADOPTION: "Adoption",
    RelType.FOSTER: "Pflege",
    RelType.UNKNOWN: "Unbekannt",
}


def _blank_row(person_id: str = "") -> dict[str, str]:
    row = {field: "" for field in FIELDNAMES}
    row["person_id"] = person_id
    return row


def _display_name(person: Person) -> str:
    return " ".join(part for part in [person.first_name, person.last_name] if part).strip()


def _event_date_str(event: Event | None) -> str:
    return (event.date_text or "").strip() if event is not None else ""


def _relationship_date_str(value: date | None) -> str:
    return value.isoformat() if value is not None else ""


def _clean_description(value: str | None) -> str:
    if not value:
        return ""
    return value.replace("\r", " ").replace("\n", " ")[:200]


def _person_row_base(
    person: Person,
    birth_event: Event | None,
    death_event: Event | None,
    places: dict[str, str],
) -> dict[str, str]:
    return {
        "person_id": str(person.id),
        "vorname": person.first_name,
        "nachname": person.last_name,
        "geburtsdatum": _event_date_str(birth_event),
        "geburtsort": places.get(str(birth_event.place_id), "") if birth_event and birth_event.place_id else "",
        "sterbedatum": _event_date_str(death_event),
        "sterbeort": places.get(str(death_event.place_id), "") if death_event and death_event.place_id else "",
        "lebt_status": LIVING_LABELS.get(person.is_living, "Unbekannt"),
        "beschreibung": _clean_description(person.description),
    }


def _chunked(items: list[dict[str, str]], size: int) -> list[list[dict[str, str]]]:
    if not items:
        return [[]]
    return [items[index : index + size] for index in range(0, len(items), size)]


def _apply_parent_slots(row: dict[str, str], parents: list[dict[str, str]]) -> None:
    for index, parent in enumerate(parents[:2], start=1):
        row[f"elter{index}_id"] = parent["id"]
        row[f"elter{index}_name"] = parent["name"]
        row[f"elter{index}_beziehungstyp"] = parent["relationship"]


def _apply_partner_slots(row: dict[str, str], partners: list[dict[str, str]]) -> None:
    for index, partner in enumerate(partners[:3], start=1):
        row[f"partner{index}_id"] = partner["id"]
        row[f"partner{index}_name"] = partner["name"]
        row[f"partner{index}_beziehungstyp"] = partner["relationship"]
        row[f"partner{index}_von"] = partner["from"]
        row[f"partner{index}_bis"] = partner["to"]


def _apply_child_slots(row: dict[str, str], children: list[dict[str, str]]) -> None:
    for index, child in enumerate(children[:5], start=1):
        row[f"kind{index}_id"] = child["id"]
        row[f"kind{index}_name"] = child["name"]
        row[f"kind{index}_beziehungstyp"] = child["relationship"]


def build_csv(db: Session) -> str:
    """Build an Excel-compatible flat CSV export for the current family tree."""
    persons = (
        db.query(Person)
        .order_by(Person.last_name.asc(), Person.first_name.asc(), Person.id.asc())
        .all()
    )

    events = (
        db.query(Event)
        .filter(Event.event_type.in_([EventType.BIRTH, EventType.DEATH]))
        .all()
    )
    birth_events = {str(event.person_id): event for event in events if event.event_type == EventType.BIRTH}
    death_events = {str(event.person_id): event for event in events if event.event_type == EventType.DEATH}

    relationships = db.query(Relationship).options(joinedload(Relationship.children)).all()
    places = {str(place.id): place.name for place in db.query(Place).all()}

    person_as_partner: dict[str, list[Relationship]] = defaultdict(list)
    person_as_child: dict[str, list[tuple[Relationship, str, str | None]]] = defaultdict(list)
    person_name = {str(person.id): _display_name(person) for person in persons}

    for relationship in relationships:
        person1_id = str(relationship.person1_id)
        person2_id = str(relationship.person2_id) if relationship.person2_id else None

        person_as_partner[person1_id].append(relationship)
        if person2_id:
            person_as_partner[person2_id].append(relationship)

        for child_link in relationship.children:
            person_as_child[str(child_link.child_id)].append((relationship, person1_id, person2_id))

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=FIELDNAMES,
        delimiter=";",
        quoting=csv.QUOTE_ALL,
        extrasaction="ignore",
        lineterminator="\r\n",
    )
    writer.writeheader()

    for person in persons:
        person_id = str(person.id)
        birth_event = birth_events.get(person_id)
        death_event = death_events.get(person_id)

        parents: list[dict[str, str]] = []
        seen_parent_ids: set[str] = set()
        for relationship, parent1_id, parent2_id in person_as_child.get(person_id, []):
            relation_label = REL_TYPE_CHILD_LABELS.get(relationship.rel_type, "Unbekannt")
            for parent_id in (parent1_id, parent2_id):
                if not parent_id or parent_id in seen_parent_ids:
                    continue
                seen_parent_ids.add(parent_id)
                parents.append(
                    {
                        "id": parent_id,
                        "name": person_name.get(parent_id, ""),
                        "relationship": relation_label,
                    }
                )
                if len(parents) == 2:
                    break
            if len(parents) == 2:
                break

        partners: list[dict[str, str]] = []
        for relationship in person_as_partner.get(person_id, []):
            other_id = (
                str(relationship.person2_id)
                if str(relationship.person1_id) == person_id and relationship.person2_id
                else str(relationship.person1_id)
            )
            if not other_id or other_id == person_id:
                continue
            partners.append(
                {
                    "id": other_id,
                    "name": person_name.get(other_id, ""),
                    "relationship": REL_TYPE_PARTNER_LABELS.get(relationship.rel_type, "Unbekannt"),
                    "from": _relationship_date_str(relationship.start_date),
                    "to": _relationship_date_str(relationship.end_date),
                }
            )
        partners.sort(key=lambda item: (item["name"].casefold(), item["id"], item["from"], item["to"]))

        children: list[dict[str, str]] = []
        for relationship in person_as_partner.get(person_id, []):
            relation_label = REL_TYPE_CHILD_LABELS.get(relationship.rel_type, "Unbekannt")
            for child_link in relationship.children:
                child_id = str(child_link.child_id)
                children.append(
                    {
                        "id": child_id,
                        "name": person_name.get(child_id, ""),
                        "relationship": relation_label,
                    }
                )
        children.sort(key=lambda item: (item["name"].casefold(), item["id"]))

        partner_chunks = _chunked(partners, 3)
        child_chunks = _chunked(children, 5)
        row_count = max(len(partner_chunks), len(child_chunks), 1)

        for index in range(row_count):
            row = _blank_row(person_id)
            if index == 0:
                row.update(_person_row_base(person, birth_event, death_event, places))
                _apply_parent_slots(row, parents)

            _apply_partner_slots(row, partner_chunks[index] if index < len(partner_chunks) else [])
            _apply_child_slots(row, child_chunks[index] if index < len(child_chunks) else [])
            writer.writerow(row)

    return output.getvalue()
