# Backend Runtime and Application Internals

## Purpose

This document explains how the backend is assembled at runtime and how the major internal subsystems collaborate.

---

## Application Entry Point

The FastAPI application is created in `backend/app/main.py`.

### Responsibilities of `create_app()`

- construct the `FastAPI` instance
- install `CORSMiddleware` using `settings.cors_origins`
- register exception handlers that normalize error responses into:

```json
{"error": "snake_case_code", "detail": "..."}
```

- register routers for:
  - persons
  - events
  - places
  - relationships
  - sources/citations
  - tree
  - files
  - GEDCOM import/export

### Lifespan Behavior

The application uses a `lifespan` context manager rather than deprecated startup hooks. Its current role is limited to resource shutdown (`engine.dispose()` on exit).

Schema creation is therefore **not performed automatically on startup**. Database setup is expected to happen via Alembic migrations, while tests create schema metadata explicitly in fixtures.

---

## Configuration Model

`backend/app/core/config.py` defines a single `Settings` object backed by `pydantic-settings`.

### Key Settings

| Setting | Purpose |
|---|---|
| `app_name`, `app_version` | API metadata and `/health` payload |
| `debug` | SQLAlchemy `echo` toggle |
| `database_url` | canonical SQLite URL pointing to repo-root `rerooted.db` |
| `upload_dir` | canonical repo-root `uploads/` directory |
| `max_upload_size_mb` | upload size limit used by file services |
| `cors_origins` | browser origins allowed by CORS middleware |

### Path Resolution

The module resolves canonical paths from the repository layout:

- backend dir = `backend/`
- project root = parent of `backend/`
- DB file = `${project_root}/rerooted.db`
- uploads dir = `${project_root}/uploads`

This avoids accidental duplication when commands are run from different working directories.

---

## Database Runtime

`backend/app/core/database.py` defines the SQLAlchemy engine and session factory.

### Important Details

- backend uses `DeclarativeBase`
- `SessionLocal` is the shared session factory
- routers obtain sessions through `get_db()`
- SQLite receives two PRAGMAs on connect:
  - `journal_mode=WAL`
  - `foreign_keys=ON`

### Why WAL matters here

Write-ahead logging improves local concurrency characteristics for the FastAPI + SQLite setup and aligns well with the developer-centric runtime profile of the project.

---

## Service Inventory

| Service | Core responsibility |
|---|---|
| `person_service.py` | person CRUD, eager loading, profile image association |
| `event_service.py` | event CRUD, `date_sort` derivation from `date_text` |
| `place_service.py` | place search, case-insensitive deduplication |
| `relationship_service.py` | relationship CRUD, child membership rules |
| `source_service.py` | source CRUD, citation creation and retrieval |
| `file_service.py` | upload validation, storage, thumbnail generation, retrieval |
| `tree_service.py` | relational-to-graph projection for React Flow |
| `gedcom_service.py` | GEDCOM preview/import/export normalization pipeline |

---

## Internal Processing Pipelines

## Person Service

`person_service.get_by_id()` is the canonical aggregation read path for person detail pages.

### Eager-loaded relations

- `birth_place`
- `events` + `Event.place`
- `images` + linked file metadata

### Output shaping behavior

- `profile_image_url` is exposed via a model property on `Person`
- events are sorted after loading so detail responses are stable and predictable

---

## Event Service

`event_service` is where flexible genealogy dates become queryable sort values.

### Create/update logic

1. validate referenced person/place existence
2. read `date_text`
3. call `parse_flex_date(date_text)`
4. store the returned `sort` date into `date_sort`

This keeps the raw genealogy text intact while still enabling chronological ordering.

---

## Place Service

`place_service.get_or_create()` is intentionally small but important.

It resolves places using a case-insensitive `func.lower(Place.name) == normalized.lower()` comparison before creating a new row. This supports:

- GEDCOM imports
- autocomplete consistency
- reduced place duplication

---

## Relationship Service

The relationship subsystem models **relationships as first-class records** rather than embedding parent columns directly on `Person`.

### Validation rules

- `person1_id` and `person2_id` cannot be identical
- referenced persons must exist
- a child cannot be added twice to the same relationship
- a child cannot also be one of the parents in that relationship

This is what enables patchwork-family modeling without flattening family history into a single parent tuple.

---

## Tree Service

`tree_service.build_tree()` is the projection layer between normalized relational data and the frontend’s graph renderer.

### Query strategy

The function performs a small number of broad reads:

- all persons with images
- all birth/death events
- all relationships with child links

### Node projection

Each person becomes a node of type `person` with:

- names
- living-state flag
- birth/death year labels
- `profile_image_url`
- truncated description excerpt

### Edge projection

Two edge classes are emitted:

1. **partner edges** between `person1_id` and `person2_id`
2. **child edges** from each parent to each relationship child

Adoption and foster relationships set `dashed = true` on child edges.

---

## File Service

`file_service.upload()` is the backend’s media ingestion path.

### Steps

1. enforce `image/*` MIME type
2. perform a bounded read using `max_upload_size_mb + 1`
3. sanitize the filename down to a basename
4. write the original file into the canonical uploads directory
5. create a `200x200` thumbnail via Pillow when possible
6. persist the DB record
7. roll back and delete written files if the DB write fails

### Retrieval helpers

The service also centralizes:

- file record lookup
- safe path resolution inside the upload root
- thumbnail path resolution

This keeps `api/files.py` free from direct DB access.

---

## GEDCOM Service

`gedcom_service.py` contains the most pipeline-oriented logic in the codebase.

### Parsing strategy

The parser is intentionally defensive:

1. reject empty input
2. try `gedcom.parser` dynamically if available in the environment
3. fall back to internal regex/text parsing otherwise
4. normalize records into four collections:
   - `persons`
   - `families`
   - `events`
   - `places`

### Import phases

```text
parse bytes
  -> create/deduplicate places
  -> upsert persons by gramps_id
  -> create events
  -> create relationships + children
  -> commit once
```

### Export behavior

When exporting:

- living persons are anonymized to `Living /Person/`
- unknown living-state persons receive `RESN PRIVACY`
- birth and death events are emitted when present
- relationships become GEDCOM `FAM` records with `HUSB`, `WIFE`, and `CHIL`

---

## Placeholder Modules

Two files currently act as reserved extension points:

- `backend/app/api/imports.py`
- `backend/app/api/exports.py`

At present, actual import/export behavior is implemented by the GEDCOM endpoints rather than these placeholders.

---

## Operational Notes for Developers

- use Alembic rather than `Base.metadata.create_all()` for the application database
- keep new business logic in services, not routers
- keep request/response surface area explicit through schemas
- preserve `gramps_id` semantics when extending GEDCOM import logic
- treat the repo-root `rerooted.db` and `uploads/` as the canonical runtime state
