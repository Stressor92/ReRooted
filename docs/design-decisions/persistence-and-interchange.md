# Design Decision: Canonical Local Persistence and GEDCOM Interchange

## Status

Accepted and reflected in the current repository layout.

---

## Context

ReRooted is currently a local-first development application with strong emphasis on:

- predictable developer setup
- stable file and database locations
- interoperability with GEDCOM datasets

Earlier ambiguity around relative runtime paths can create duplicate databases or upload directories when commands are run from different working directories. Genealogy data interchange also requires pragmatic tolerance for imperfect GEDCOM files.

---

## Decision

The project standardizes on the following runtime and interchange approach:

### Canonical runtime artifacts

- database: repo-root `rerooted.db`
- uploads: repo-root `uploads/`
- backend dependency definition: `backend/pyproject.toml`

### Persistence technology

- `SQLite` for storage
- `Alembic` for schema management
- SQLAlchemy ORM models as the single mapping layer

### Interchange strategy

- use GEDCOM as the import/export boundary
- parse via external library when available
- fall back to internal text parsing when necessary
- anonymize living people during export

---

## Why this was chosen

### 1. Local developer ergonomics

SQLite is easy to bootstrap, inspect, and reset. It fits the current project stage and avoids unnecessary infrastructure overhead.

### 2. Single-source runtime state

Anchoring the DB and uploads directory at repo root avoids a common class of errors where running the app from different folders accidentally creates separate runtime artifacts.

### 3. Schema evolution discipline

Using Alembic instead of application startup auto-creation makes schema changes reviewable and repeatable.

### 4. Real-world GEDCOM tolerance

Genealogy data in the wild is often inconsistent. The fallback parser strategy makes import more resilient and lowers the barrier for users bringing data from different tools.

### 5. Privacy-aware export

Anonymizing living persons on export is a safe default for genealogy data exchange.

---

## Consequences

### Positive

- easier onboarding for local development
- less ambiguity about where data lives
- better migration hygiene
- broader compatibility with GEDCOM input variations
- privacy-respecting default export behavior

### Trade-offs

- SQLite is not optimized for high-concurrency multi-instance deployment
- fallback GEDCOM parsing is necessarily narrower than a full dedicated parser ecosystem
- a repo-local database is convenient for development but should be reconsidered for production deployment models

---

## Developer Guidance

- treat `backend/pyproject.toml` as the canonical dependency definition
- use Alembic for schema changes
- do not reintroduce startup `create_all()` for the application database
- keep file writes inside the canonical `uploads/` directory
- preserve `gramps_id` and place-deduplication behavior when extending GEDCOM import logic
