# Backend API Contract

## Scope

This document captures the **current HTTP surface** implemented by the FastAPI backend. It focuses on internal contracts relevant for frontend integration, extension, and debugging.

All routes are mounted in `backend/app/main.py`.

---

## Error Envelope

The backend normalizes most error responses into:

```json
{
  "error": "snake_case_code",
  "detail": "Human-readable explanation"
}
```

### Error codes currently used

| Code | Meaning |
|---|---|
| `not_found` | resource lookup by ID failed |
| `conflict` | relationship or child assignment conflict |
| `validation_error` | request validation failure |
| `invalid_file` | upload type/size/path validation failure |
| `invalid_gedcom` | GEDCOM parse failure |
| `http_error` | generic fallback for uncategorized HTTP exceptions |

---

## Response Serialization Notes

Pydantic serializes Python `date` values as **ISO strings** in JSON. This matters for:

- `EventOut.date_sort`
- `RelationshipOut.start_date`
- `RelationshipOut.end_date`
- `/tree` partner edge dates

So while the service layer works with Python `date` objects internally, the wire format is string-based.

---

## Endpoint Groups

## Health

| Method | Path | Response |
|---|---|---|
| `GET` | `/health` | `{"status": "ok", "version": settings.app_version}` |

---

## Persons

| Method | Path | Response model | Notes |
|---|---|---|---|
| `GET` | `/persons` | `list[PersonOut]` | optional `?search=` filters by first/last name |
| `POST` | `/persons` | `PersonOut` | creates a person |
| `GET` | `/persons/{person_id}` | `PersonDetail` | includes eager-loaded events + birth place |
| `PUT` | `/persons/{person_id}` | `PersonOut` | partial update |
| `DELETE` | `/persons/{person_id}` | `204 No Content` | cascades via ORM relationships |
| `POST` | `/persons/{person_id}/images` | `PersonOut` | multipart upload of a profile/attached image |

### `PersonOut`

```json
{
  "id": "uuid",
  "first_name": "...",
  "last_name": "...",
  "is_living": true,
  "birth_place_id": "uuid-or-null",
  "description": "...",
  "gramps_id": "@I1@",
  "profile_image_url": "/files/{file_id}"
}
```

### `PersonDetail`

Extends `PersonOut` with:

- `events: list[EventOut]`
- `birth_place: PlaceOut | null`

The `events` field is always a list, not `null`.

---

## Events

| Method | Path | Response model | Notes |
|---|---|---|---|
| `GET` | `/persons/{person_id}/events` | `list[EventOut]` | ordered by `date_sort nulls last`, then `id` |
| `POST` | `/persons/{person_id}/events` | `EventOut` | derives `date_sort` from `date_text` |
| `PUT` | `/events/{event_id}` | `EventOut` | recomputes `date_sort` when `date_text` changes |
| `DELETE` | `/events/{event_id}` | `204 No Content` | deletes one event |

### `EventOut`

```json
{
  "id": "uuid",
  "person_id": "uuid",
  "event_type": "birth",
  "date_text": "ca. 1920",
  "date_sort": "1920-01-01",
  "place_id": "uuid-or-null",
  "place_name": "Berlin",
  "description": "...",
  "is_private": false
}
```

`date_text` always preserves the raw input text; `date_sort` is a machine-sortable derivative.

---

## Places

| Method | Path | Response model | Notes |
|---|---|---|---|
| `GET` | `/places?q=...` | `list[PlaceOut]` | autocomplete search, max 10 results |
| `POST` | `/places` | `PlaceOut` | creates a place |

### `PlaceOut`

```json
{
  "id": "uuid",
  "name": "Springfield",
  "full_name": "Springfield, Illinois",
  "latitude": null,
  "longitude": null
}
```

---

## Relationships

| Method | Path | Response model | Notes |
|---|---|---|---|
| `GET` | `/relationships` | `list[RelationshipOut]` | supports optional `?person_id=` filter |
| `POST` | `/relationships` | `RelationshipOut` | validates persons and child links |
| `PUT` | `/relationships/{relationship_id}` | `RelationshipOut` | updates dates/type/participants |
| `DELETE` | `/relationships/{relationship_id}` | `204 No Content` | cascades to child links |
| `POST` | `/relationships/{relationship_id}/children/{child_id}` | `201 Created` | adds one child to the relationship |
| `DELETE` | `/relationships/{relationship_id}/children/{child_id}` | `204 No Content` | removes one child link |

### `RelationshipOut`

```json
{
  "id": "uuid",
  "person1_id": "uuid",
  "person2_id": "uuid-or-null",
  "rel_type": "partner",
  "start_date": "2001-06-15",
  "end_date": null,
  "child_ids": ["uuid", "uuid"]
}
```

`child_ids` is intentionally flattened to plain identifiers rather than nested person objects.

---

## Sources and Citations

| Method | Path | Response model | Notes |
|---|---|---|---|
| `GET` | `/sources` | `list[SourceOut]` | optional `?search=` on title/author |
| `POST` | `/sources` | `SourceOut` | create source metadata |
| `GET` | `/sources/{source_id}` | `SourceOut` | one source |
| `DELETE` | `/sources/{source_id}` | `204 No Content` | deletes source and cascaded citations |
| `POST` | `/events/{event_id}/citations` | `CitationOut` | attach a source citation to an event |
| `GET` | `/events/{event_id}/citations` | `list[CitationOut]` | eager loads source |
| `DELETE` | `/citations/{citation_id}` | `204 No Content` | delete one citation |

### `CitationOut`

```json
{
  "id": "uuid",
  "source_id": "uuid",
  "source_title": "Civil Registry",
  "event_id": "uuid-or-null",
  "person_id": "uuid-or-null",
  "page": "42",
  "confidence": "high"
}
```

`source_title` is exposed directly so the frontend does not need an extra source lookup.

---

## Files

| Method | Path | Response model | Notes |
|---|---|---|---|
| `POST` | `/files/upload` | `FileOut` | multipart image upload with thumbnail generation |
| `GET` | `/files/{file_id}` | `FileResponse` | raw file download/serving |
| `GET` | `/files/{file_id}/thumb` | `FileResponse` | generated thumbnail |

### `FileOut`

```json
{
  "id": "uuid",
  "filename": "avatar.jpg",
  "content_type": "image/jpeg",
  "url": "/files/{id}",
  "thumb_url": "/files/{id}/thumb"
}
```

---

## GEDCOM Import/Export

| Method | Path | Response | Notes |
|---|---|---|---|
| `POST` | `/import/gedcom/preview` | summary counts | validates extension + size first |
| `POST` | `/import/gedcom` | import summary | single import transaction/commit path |
| `GET` | `/export/gedcom` | `FileResponse` | plain-text GEDCOM download |

### Preview response

```json
{
  "persons": 2,
  "families": 1,
  "places": 2,
  "events": 4
}
```

### Import response

```json
{
  "imported_persons": 2,
  "imported_families": 1,
  "status": "ok"
}
```

### Export behavior

- content type: `text/plain; charset=utf-8`
- filename: `rerooted_export.ged`
- living persons are anonymized during export

---

## Tree Projection Endpoint

| Method | Path | Response | Notes |
|---|---|---|---|
| `GET` | `/tree` | `{ nodes: [...], edges: [...] }` | intended for direct React Flow consumption |

### Node contract

```json
{
  "id": "uuid",
  "type": "person",
  "position": {"x": 0, "y": 0},
  "data": {
    "first_name": "Ada",
    "last_name": "Ancestor",
    "is_living": false,
    "birth_year": "1923",
    "death_year": "1987",
    "profile_image_url": "/files/{uuid}",
    "description_excerpt": "up to 120 chars"
  }
}
```

### Edge contract

Partner edge:

```json
{
  "id": "partner-{rel_uuid}",
  "source": "person1_uuid",
  "target": "person2_uuid",
  "type": "partner",
  "data": {
    "rel_type": "partner",
    "start_date": "2001-06-15",
    "end_date": null
  }
}
```

Child edge:

```json
{
  "id": "child-{rel_uuid}-{parent_uuid}-{child_uuid}",
  "source": "parent_uuid",
  "target": "child_uuid",
  "type": "child",
  "data": {
    "rel_type": "adoption",
    "dashed": true
  }
}
```

Note that the current child-edge ID includes both parent and child identifiers to keep edges unique when one relationship contributes two parent-to-child edges.
