# Test Plan and Quality Strategy

## Purpose

This document describes the current automated test strategy for ReRooted and how new tests should be added.

The project already uses tests as a primary verification mechanism for backend behavior, data contracts, and regression prevention.

---

## Test Stack

| Tool | Role |
|---|---|
| `pytest` | test runner and fixture system |
| `fastapi.testclient.TestClient` | API/integration testing |
| in-memory `SQLite` | isolated test database |
| `ruff` | formatting and lint checks |
| `mypy` | static type verification |

---

## Test Directory Structure

| Path | Focus |
|---|---|
| `tests/conftest.py` | shared DB/session/client fixtures |
| `tests/unit/` | unit-level service and utility behavior |
| `tests/integration/` | app foundation and service integration |
| `tests/test_*.py` | API contract and end-to-end route behavior |

---

## Fixture Strategy

`tests/conftest.py` creates a dedicated in-memory SQLite environment for tests.

### Key properties

- `sqlite://` with `StaticPool`
- `check_same_thread=False`
- schema created from ORM metadata for test runs
- FastAPI dependency override for `get_db()`
- shared `client` fixture for HTTP-level tests

### Why this matters

This gives the test suite:

- isolation from the repo-root `rerooted.db`
- fast setup/teardown
- realistic execution of routers, services, and models together

---

## Current Coverage Map

## Foundation and app startup

| File | Verifies |
|---|---|
| `tests/integration/test_app_foundation.py` | `/health`, app wiring, and baseline foundation behavior |

## Services and utilities

| File | Verifies |
|---|---|
| `tests/unit/test_date_parser.py` | flexible date parsing and sortable output behavior |
| `tests/unit/test_tree_service.py` | graph node/edge generation semantics |
| `tests/unit/test_gedcom_service.py` | GEDCOM parsing/import-export helper behavior |
| `tests/integration/test_person_service.py` | service-layer person operations |

## API contracts

| File | Verifies |
|---|---|
| `tests/test_persons.py` | person list/detail/update/delete contracts |
| `tests/test_events.py` | event CRUD and event ordering/date behavior |
| `tests/test_places.py` | place creation and search/autocomplete behavior |
| `tests/test_relationships.py` | relationship CRUD and child linking rules |
| `tests/test_tree.py` | `/tree` graph contract for frontend consumption |
| `tests/test_files.py` | upload validation and file-serving behavior |
| `tests/test_sources.py` | sources and citations workflow |
| `tests/test_gedcom.py` | GEDCOM preview/import/export HTTP flow |

---

## Quality Gates

The project’s practical quality gates are:

```powershell
pytest -q
ruff check . --fix
mypy .
```

Optionally format before linting:

```powershell
ruff format .
```

A change should not be considered complete unless the relevant tests pass and the lint/type checks remain clean.

---

## Testing Principles Used in This Repository

### 1. Test behavior, not implementation details

Tests should validate:

- returned API contract shapes
- business rules
- error cases
- ordering and derived fields

They should avoid depending on incidental internal structure unless that structure is itself the contract.

### 2. Prefer realistic integration over excessive mocking

Because the app already has a lightweight in-memory DB setup, many behaviors can be tested against the real service and router stack instead of complex mocks.

### 3. Add regression tests for bugs

When a defect is found:

1. reproduce it with a failing test
2. implement the smallest root-cause fix
3. rerun the relevant suite

---

## How to Add a New Backend Feature Safely

1. add or update the test first
2. run the focused test file
3. implement the feature in the appropriate layer
4. rerun the focused tests
5. run the full quality gates

Example:

```powershell
pytest tests/test_relationships.py -q
pytest -q
ruff check . --fix
mypy .
```

---

## Current Boundaries of the Test Strategy

What is covered well:

- backend route behavior
- service logic
- date parsing
- GEDCOM flows
- graph projection contracts

What is not yet covered in depth:

- frontend rendering behavior
- browser interaction tests
- visual regression tests
- performance/load testing
- multi-user concurrency scenarios

This reflects the current project state, where the backend is more complete than the frontend.

---

## Recommended Future Additions

As the frontend becomes implemented, the next useful layers would be:

- component tests for `features/` and `components/`
- contract tests around the API client error handling
- end-to-end browser tests for person editing, tree visualization, and GEDCOM import flow

Until then, the existing backend-focused suite remains the main safety net.
