# Frontend Architecture (Current Scaffold)

## Scope and Status

The frontend is currently a **structural scaffold** rather than a finished application. This document describes what is actually present in `frontend/src/` and how it is intended to connect to the backend.

Where behavior is not implemented yet, it is marked as **implementation-dependent**.

---

## Current Frontend Topology

| Path | Current role |
|---|---|
| `frontend/src/main.tsx` | bootstrap stub |
| `frontend/src/App.tsx` | root component stub |
| `frontend/src/api/client.ts` | fetch wrapper for backend requests |
| `frontend/src/hooks/usePersons.ts` | query-definition hook for `/persons` |
| `frontend/src/hooks/useTree.ts` | query-definition hook for `/tree` |
| `frontend/src/layouts/AppLayout.tsx` | layout boundary stub |
| `frontend/src/pages/` | page-level route boundaries (currently `null` components) |
| `frontend/src/features/` | domain-oriented component boundaries |
| `frontend/src/components/` | reusable typed UI building blocks |
| `frontend/src/design/tokens.css` | design tokens / CSS custom properties |

---

## Bootstrap Layer

### `main.tsx`

The current entry point only logs a startup message:

```ts
function bootstrap(): void {
  console.info("ReRooted frontend scaffold initialised.");
}
```

There is currently:

- no DOM mounting logic
- no router setup
- no React Query provider
- no global state provider

This means the frontend folder currently documents **planned module boundaries** more than active browser behavior.

---

## API Access Layer

`frontend/src/api/client.ts` provides a minimal typed wrapper:

- base URL is hardcoded to `http://localhost:8000`
- default `Content-Type` is JSON
- non-2xx responses throw a generic `Error`

### Current implications

- all frontend network calls are expected to go through a single adapter function
- backend error bodies are not yet decoded into richer client-side error types
- multipart flows will require call-site header control because uploads must not force JSON encoding

---

## Data Hooks

### `usePersons()`

Returns a React Query-style object:

- `queryKey: ["persons"]`
- `queryFn: () => apiRequest("/persons")`

### `useTree()`

Returns a React Query-style object for the tree graph:

- `queryKey: ["tree"]`
- `queryFn: () => apiRequest("/tree")`

These hooks do not themselves call `useQuery()` yet. They are contract helpers for whichever query composition pattern the final app adopts.

---

## Page Boundaries

Current pages:

- `TreePage.tsx`
- `PersonsPage.tsx`
- `ImportPage.tsx`

All currently return `null`.

### Interpretation

The repository already expresses the intended navigation surface:

- a tree visualization view
- a person management view
- an import/export view

The concrete routing setup is **implementation-dependent** because no router is wired yet.

---

## Feature Modules

The `features/` directory encodes the intended domain split.

### Tree feature

Files:

- `features/tree/TreeView.tsx`
- `features/tree/PersonNode.tsx`
- `features/tree/FamilyEdge.tsx`

Currently exported types indicate the expected rendering inputs:

- `TreeGraph` contains `nodes` and `edges`
- `PersonNodeData` includes `first_name`, `last_name`, `birth_year`, `death_year`

This matches the backend’s `/tree` response contract.

### Persons feature

Files:

- `features/persons/PersonForm.tsx`
- `features/persons/PersonSidebar.tsx`
- `features/persons/EventTimeline.tsx`

The present type exports show the intended editing boundary for person data (`first_name`, `last_name`, `description`).

---

## Reusable Components

### `FlexDateInput.tsx`

Defines the shape:

```ts
export type FlexDateValue = {
  raw: string;
  qualifier?: string | null;
};
```

This aligns conceptually with the backend’s `parse_flex_date()` utility, which turns raw genealogy-style dates into sortable metadata.

### `PlaceAutocomplete.tsx`

Defines the option shape:

```ts
export type PlaceOption = {
  id: string;
  name: string;
  full_name?: string | null;
};
```

This matches the current `/places` API output.

---

## Design Tokens

`frontend/src/design/tokens.css` centralizes a small visual vocabulary:

- background and surface colors
- primary and accent colors
- muted text color
- medium border radius
- soft elevation shadow
- global sans-serif font token

This indicates an intention to keep visual styling tokenized rather than scattering ad hoc constants through components.

---

## Backend Contracts the Frontend Already Depends On

Even though the UI is still skeletal, the existing hooks and types reveal several hard dependencies:

### `/persons`

Expected by `usePersons()` for list retrieval.

### `/tree`

Expected by `useTree()` and `TreeGraph` typing.

### `/places`

Implied by `PlaceAutocomplete` typing and backend autocomplete support.

### Flexible dates

Implied by `FlexDateInput` and the backend `date_text`/`date_sort` dual representation.

---

## Integration Notes for Future Implementation

The current codebase suggests the following intended extension points:

| Concern | Likely file boundary |
|---|---|
| page composition | `pages/*.tsx` |
| shared layout and navigation shell | `layouts/AppLayout.tsx` |
| API state integration | `hooks/` |
| graph rendering | `features/tree/` |
| form composition | `features/persons/` + `components/` |
| visual consistency | `design/tokens.css` |

These are architectural boundaries already encoded in the repo, even though the rendering logic is not yet implemented.

---

## Summary

The frontend is currently best understood as a **typed integration scaffold** for the backend rather than a complete application.

What already exists:

- a backend-oriented API client
- query-definition hooks
- page and feature boundaries
- type hints for tree/person/date/place data
- design tokens

What remains implementation-dependent:

- routing
- actual React rendering
- state provider setup
- form behavior
- graph visualization integration details
