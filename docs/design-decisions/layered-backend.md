# Design Decision: Layered Backend Boundaries

## Status

Accepted and reflected in the current codebase.

---

## Context

ReRooted needs to support several distinct but interrelated backend concerns:

- CRUD APIs for genealogy entities
- graph projection for visualization
- file upload and media handling
- GEDCOM normalization and interchange
- future extensibility without turning the API layer into a monolith

Without clear boundaries, these concerns would quickly mix routing, persistence, transformation, and business rules in the same files.

---

## Decision

The backend is organized into explicit layers:

- `api/` for HTTP transport
- `services/` for business logic and orchestration
- `schemas/` for request/response models
- `models/` for persistence structure
- `core/` for shared runtime infrastructure
- `utils/` for narrow reusable helpers

Routers should stay thin and call services. Direct SQL or persistence rules should not live in the route handlers.

---

## Why this was chosen

### 1. Genealogy workflows are not simple CRUD

Several features need orchestration rather than one-table operations:

- GEDCOM import has multiple phases
- `/tree` is a graph projection, not a raw table dump
- profile image selection is derived behavior
- flexible date handling requires normalization and sorting logic

A dedicated service layer keeps this logic testable and reusable.

### 2. API contracts must stay explicit

Pydantic schemas make the HTTP surface intentional:

- `PersonDetail` is different from `PersonOut`
- `EventOut` exposes derived `place_name`
- `RelationshipOut` flattens `child_ids`

Keeping schemas separate from models avoids leaking raw ORM structure to clients.

### 3. The project is expected to grow feature-wise

The current domain already spans:

- persons
- events
- places
- relationships
- sources/citations
- files
- GEDCOM import/export
- tree rendering support

Layered boundaries reduce the risk that one feature change cascades unpredictably into others.

---

## Consequences

### Positive

- easier unit and integration testing
- clearer ownership of business logic
- thinner, more readable route handlers
- safer extension points for new features
- better separation between relational storage and frontend-oriented response shapes

### Negative / Trade-offs

- more files and indirection than a minimal prototype
- developers must know where behavior belongs before adding code
- small changes sometimes require updates across model, schema, service, and router layers

---

## Guardrails for Future Work

When adding a feature:

1. define or update ORM shape in `models/`
2. create request/response contracts in `schemas/`
3. implement business rules in `services/`
4. expose the feature via a thin route in `api/`
5. add tests at the correct layer

Avoid bypassing the service layer from route handlers unless the operation is truly trivial and purely transport-related.
