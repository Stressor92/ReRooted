# Frontend Application Architecture

## Scope

This document describes the **implemented** frontend runtime under `frontend/src/`. It is intended for developers who need to understand how the tree workspace, person panel, import page, data hooks, and design system interact internally.

This is **not** end-user documentation.

---

## Runtime Composition

### Bootstrap Path

```text
main.tsx
  -> imports global CSS + React Flow styles + react-pdf styles
  -> mounts <App /> with React.StrictMode

App.tsx
  -> QueryClientProvider
  -> BrowserRouter
  -> ErrorBoundary
  -> AppLayout
  -> Routes
  -> ToastContainer
```

### Provider / Routing Graph

```mermaid
flowchart TD
    Main[main.tsx]
    App[App.tsx]
    Query[QueryClientProvider]
    Router[BrowserRouter]
    ErrorBoundary[ErrorBoundary]
    Layout[AppLayout]
    TreeRoute[/ route]
    ImportRoute[/import route]
    Toasts[ToastContainer]

    Main --> App --> Query --> Router --> ErrorBoundary --> Layout
    Layout --> TreeRoute
    Layout --> ImportRoute
    ErrorBoundary --> Toasts
```

### Active Routes

| Route | Component | Purpose |
|---|---|---|
| `/` | `features/tree/TreePage.tsx` | main genealogy workspace |
| `/import` | `pages/ImportPage.tsx` | GEDCOM preview/import flow |

`frontend/src/pages/PersonsPage.tsx` exists in the codebase but is not part of the active route graph.

---

## Frontend Module Map

| Path | Responsibility |
|---|---|
| `api/` | typed API contracts and the shared Axios client |
| `hooks/` | React Query hooks, mutations, export helpers, keyboard shortcuts, template state |
| `features/tree/` | React Flow canvas, layout, nodes, edges, search, context interactions |
| `features/persons/` | panel header, tabs, quick-add, relationship dialogs |
| `components/` | reusable controls (`CanvasToolbar`, `ConfirmDialog`, `Lightbox`, `Toast`, `PlaceAutocomplete`, etc.) |
| `design/templates/` | runtime-selectable theme definitions |
| `design/tokens.css` | CSS variable contract and component styling |
| `layouts/AppLayout.tsx` | fixed header and root content shell |

---

## State Management Model

The frontend deliberately uses **three different state scopes**, each with a distinct ownership model.

### 1. Server State — React Query

React Query owns backend-backed data and mutation invalidation.

| Query key | Source | Typical consumer | Notes |
|---|---|---|---|
| `['tree']` | `GET /tree` | `TreePage`, `TreeCanvas` | stale time `10s`; central graph payload |
| `['persons']` | `GET /persons` | search, lookups, relation summaries | reused across multiple flows |
| `['person', personId]` | `GET /persons/{id}` | `PersonPanel` | drives all tab content |
| `['person-citations', personId]` | citation routes | sources/documents flows | invalidated on create/update |
| `['person-documents', personId]` | sources + citations | `DocumentsTab` | derived document view |
| `['image-export-formats']` | `GET /export/image-formats` | `useCanvasExport()` | metadata only; actual rendering stays client-side |

Mutation hooks such as `useUpdatePerson`, `useCreateRelationship`, `useUploadPersonImage`, and `useCreateSourceCitation` perform invalidation explicitly after successful writes.

### 2. UI-Scoped Global State — Zustand

Two lightweight stores handle UI concerns that do not belong in server state:

| Store | File | Responsibility |
|---|---|---|
| `useToastStore()` | `hooks/useToast.ts` | toast queue, auto-dismiss timing, success/error notifications |
| `useTemplate()` | `hooks/useTemplate.ts` | active design template and selected background pattern |

This keeps UI-global state out of React Query while avoiding prop drilling through the tree workspace.

### 3. Local Component State

Transient interaction state remains local to the owning component, e.g.:

- selected node and panel tab in `TreePage`
- mobile toolbar / help modal state in `CanvasToolbar`
- draft and auto-save state in `InfoTab`
- PDF preview expansion state in `DocumentsTab`
- dialog mode and relationship form data in `RelationshipDialog`

This division is one of the key architectural choices of the frontend.

---

## API Client and Contracts

### Shared Axios Client

`frontend/src/api/client.ts` provides the boundary to the backend:

- derives default base URL from `VITE_API_URL` or `window.location.hostname:8000`
- sets JSON headers by default
- logs failed requests with method, URL, status, and payload
- exposes `getApiErrorMessage()` to normalize Axios error text for UI toasts

### Contract Style

The frontend keeps API contracts in dedicated modules rather than embedding inline types everywhere:

- `api/tree.ts` for `TreeData`, `TreeNode`, `TreeEdge`, `PersonNodeData`, `EdgeData`
- `api/persons.ts` for `PersonSummary`, `PersonDetail`, `PersonEvent`, `PersonImage`
- `api/files.ts` for upload/download helpers

This keeps UI code close to semantic domain types instead of raw JSON blobs.

---

## Tree Workspace Composition

The root route is assembled as follows:

1. `TreePage` requests `useTree()`.
2. `toFlowNodes()` and `toFlowEdges()` adapt backend data to React Flow types.
3. `applyDagreLayout()` computes visual positions in either `TB` or `LR` direction.
4. `TreeCanvas` renders the interactive graph.
5. Selecting a node opens `PersonPanel` with a currently active tab.

The tree workspace is therefore the primary integration surface between:

- graph data from the backend
- local viewport/layout state
- inline creation and relationship editing flows
- the right-side person editor

For full subsystem detail, see `docs/frontend/tree-canvas.md`.

---

## Person Panel Composition

`PersonPanel` is mounted only when a `selectedPersonId` exists. Its internal structure is:

- `PersonPanelHeader` for name/profile image actions and relative creation
- Radix Tabs for `Info`, `Fotos`, `Dokumente`
- `ConfirmDialog` for destructive delete flow

The panel loads canonical data via `usePerson(personId)` and delegates tab-specific behavior to:

- `tabs/InfoTab.tsx`
- `tabs/PhotosTab.tsx`
- `tabs/DocumentsTab.tsx`

For detailed tab behavior and synchronization rules, see `docs/frontend/person-panel.md`.

---

## Error Handling and Recovery Behavior

### Global Error Handling

`components/ErrorBoundary.tsx` protects the routed app shell and displays a recovery UI when rendering fails.

### Tree-Specific Error Handling

`features/tree/TreePage.tsx` wraps the canvas in a dedicated class-based `TreeErrorBoundary`. This isolates React Flow rendering issues from the rest of the app shell.

### Request-Level Failures

Mutation hooks convert backend failures into toasts using `getApiErrorMessage()`. This creates a consistent error surface without every component implementing its own Axios parsing.

---

## Styling and Theming Model

The design system is runtime-driven through CSS custom properties set by `applyTemplate()` in `design/templates/types.ts`.

Each template defines:

- canvas background and dot color
- node background, border, shadow, and typography colors
- panel background/border
- accent color and font family

The actual UI therefore depends on **theme tokens**, not on hard-coded component colors.

This allows `TemplatePicker` and `BackgroundPicker` to change the canvas appearance without re-mounting the tree or changing component logic.

---

## Extension Guidance

When extending the frontend, prefer the following rules:

1. **Add or update typed contracts in `api/` first** when backend payloads change.
2. **Put backend-backed behavior into hooks**, not directly into UI components.
3. **Keep feature-specific logic inside `features/tree/` or `features/persons/`**.
4. **Use toasts for user-facing operation feedback** rather than silent failures.
5. **Invalidate React Query caches explicitly** after writes; do not rely on implicit refresh.
6. **Prefer CSS token updates over hard-coded per-component color changes**.

---

## Implementation-Dependent Areas

A few areas should be documented cautiously because their behavior is intentionally narrow or incomplete:

- image export rendering is client-side; the backend only publishes format metadata
- the app is optimized for a single interactive workspace rather than multi-route CRUD screens
- no explicit persistence of theme/background preferences to local storage is implemented in the current codebase
- `PersonsPage.tsx` exists but is not part of the active navigation flow

---

## Summary

The frontend is no longer a placeholder scaffold. It is a compact but fully working SPA with:

- a narrow route surface
- a React Query + Zustand + local state split
- a React Flow-based tree workspace
- a right-side person editing system
- runtime theming/background selection
- client-side image export and server-backed GEDCOM import/export

Its architecture is intentionally feature-oriented and should remain so as the UI grows.
