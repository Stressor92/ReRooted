# Tree Canvas Architecture

## Scope

This document describes the internals of the genealogy canvas implemented in:

- `frontend/src/features/tree/TreePage.tsx`
- `frontend/src/features/tree/TreeCanvas.tsx`
- `frontend/src/features/tree/PersonNode.tsx`
- `frontend/src/features/tree/FamilyEdge.tsx`
- `frontend/src/features/tree/useLayout.ts`
- `frontend/src/components/CanvasToolbar.tsx`
- `frontend/src/hooks/useCanvasSearch.ts`

It focuses on how the tree is composed, laid out, rendered, and interacted with.

---

## Rendering Pipeline

```mermaid
flowchart TD
    Query[useTree()] --> Data[TreeData from /tree]
    Data --> Adapt[toFlowNodes / toFlowEdges]
    Adapt --> Layout[applyDagreLayout(dir)]
    Layout --> Canvas[TreeCanvas]
    Canvas --> Node[PersonNode]
    Canvas --> Edge[FamilyEdge]
    Canvas --> Panel[PersonPanel selection]
    Canvas --> Dialogs[QuickAddPopover / RelationshipDialog]
```

### Input Contract

The canvas consumes the backend’s `TreeData` contract, which is already shaped for React Flow-style rendering:

```ts
TreeData = {
  nodes: TreeNode[];
  edges: TreeEdge[];
}
```

The backend supplies the **semantic family graph**, while the frontend adds the **visual layout and viewport behavior**.

---

## Layout Strategy

### Dagre as the Layout Engine

`applyDagreLayout()` uses `@dagrejs/dagre` to compute node positions on the client.

| Setting | `TB` layout | `LR` layout |
|---|---:|---:|
| `rankdir` | `TB` | `LR` |
| `ranksep` | `56` | `88` |
| `nodesep` | `36` | `52` |
| `edgesep` | `24` | `24` |
| Node size assumption | `160 x 164` | `160 x 164` |

### Why layout stays on the client

The backend intentionally does **not** persist visual positions. That allows the frontend to:

- switch between top-bottom (`TB`) and left-right (`LR`) layouts instantly
- relayout the graph without another round-trip
- keep the backend model purely genealogical instead of presentation-specific

### Handle Position Switching

`TreePage.tsx` maps layout direction to connection anchors:

- `TB`: source on bottom, target on top
- `LR`: source on right, target on left

This is critical for making the graph look structurally correct when the direction changes.

---

## Node Rendering

### `PersonNode`

Each person is rendered through the custom `person` node type.

The component changes its visual density based on React Flow zoom:

| Zoom range | Mode | Behavior |
|---|---|---|
| `>= 0.6` | `full` | photo/initials, full name, life dates |
| `0.3 - 0.59` | `compact` | reduced card size, no date line |
| `< 0.3` | `micro` | circular avatar-only representation |

### Display data

The node currently renders:

- profile image when present, otherwise initials fallback
- full name
- birth/death summary when visible and available
- a colored status dot derived from `is_living`

### Status encoding

| `is_living` | Visual meaning |
|---|---|
| `true` | living color token |
| `false` | deceased color token |
| `null` | unknown status token |

---

## Edge Rendering

### `FamilyEdge`

All relationship lines go through a custom edge component.

- partner edges use a straight path
- child edges use a bezier path
- edge labels are interactive buttons that reopen relationship editing

### Style mapping

| Relationship type | Edge treatment |
|---|---|
| `partner` | solid accent marriage line |
| `ex` / `divorced` | dashed line |
| `adoption` | dashed adoption color |
| `foster` | dashed foster color |
| `unknown` | light dashed line |
| default child relation | biological style |

A small metadata line becomes visible on hover and includes the date range where available.

---

## Interaction Model

## 1. Selection and panel opening

Clicking a person node sets `selectedPersonId` in `TreePage`. That is the only condition required to mount `PersonPanel`.

This keeps the graph itself stateless with respect to sidebar visibility.

## 2. Search and focus behavior

`useCanvasSearch()` implements the tree search flow:

- 300 ms debounce before matching
- search text composed from `first_name`, `last_name`, `birth_year`, `death_year`, and `description_excerpt`
- matches sorted by:
  1. whether the full name starts with the query
  2. alphabetical fallback (`localeCompare`)
- `focusMatch()` cycles through results and recenters the viewport via `setCenter()`

This is deliberately simple, deterministic, and cheap enough to run in-memory on the loaded graph.

## 3. Quick add and relationship creation

`TreeCanvas` supports multiple creation paths:

- toolbar button `+ Person`
- context menu actions (`child`, `partner`, `parent`, `sibling`)
- invalid connection gestures via `onConnectEnd`

`QuickAddPopover` creates the person first and optionally seeds a relationship preset so `RelationshipDialog` can finish the structural link.

### Sibling creation note

The current sibling flow is parent-driven: it searches for an existing parent/family relationship and adds the new child into that family. It is **not** modeled as a direct sibling edge.

## 4. Relationship editing

There are two entry points:

- draw a connection between nodes (`onConnect`)
- click an existing edge label (`FamilyEdge` -> `onEditRelationship`)

In both cases `RelationshipDialog` becomes the canonical edit surface.

---

## Toolbar Responsibilities

`CanvasToolbar` is the control surface for the workspace.

### Functional groups

| Group | Capabilities |
|---|---|
| Viewport | zoom in/out, reset zoom, fit view |
| Layout | `TB` / `LR` direction and relayout |
| Theme | `Designs` picker + `Hintergrund` picker |
| Search | text query and next-match focus |
| Actions | GEDCOM import/export, image export, shortcuts help |

### Keyboard shortcuts

Shortcuts are registered through `useKeyboardShortcuts()` and include:

- `Ctrl+0` fit view
- `Ctrl++` / `Ctrl+-` zoom
- `Ctrl+F` focus search
- `Ctrl+N` quick add
- `?` open help
- `Esc` close help/mobile overlays

---

## Export Behavior

Image export is exposed through the `📷` menu and currently supports:

- `PNG`
- `JPG`
- `SVG`

Important implementation detail:

- actual rendering is done **client-side** with `html-to-image`
- the toolbar, floating action button, and top `ReRooted` header are filtered out of the exported output
- the backend endpoint `GET /export/image-formats` only provides the list of supported formats

---

## Failure and Recovery Characteristics

| Failure mode | Handling |
|---|---|
| `/tree` request fails | `TreePage` shows a retry card |
| React Flow render exception | `TreeErrorBoundary` isolates the failure |
| mutation fails | toast error + query reconciliation |
| empty result set | graph still renders; toolbar remains usable |

The canvas relies on re-fetching canonical server state after mutations rather than trusting optimistic cache state permanently.

---

## Debugging Notes

### Blank or apparently empty canvas

Check, in order:

1. `/tree` returns non-empty `nodes` and `edges`
2. `applyDagreLayout()` produces positions inside the viewport range
3. `fitView()` is being called after nodes initialize
4. the selected background is not visually masking nodes

### Wrong connection orientation after switching layout

Verify `sourcePosition` / `targetPosition` in `toFlowNodes()` align with the selected `layoutDir`.

### Search finds nodes but viewport jumps strangely

Inspect `setCenter(node.position.x + 80, node.position.y + 100, ...)` in `useCanvasSearch.ts`; those offsets are tuned to the current card dimensions.

---

## Extension Guidance

When extending the tree workspace:

1. keep **semantic graph changes** in the backend
2. keep **layout and viewport heuristics** in `useLayout.ts` / `TreeCanvas.tsx`
3. avoid mixing mutation logic directly into node or edge components
4. prefer adding new toolbar actions as isolated components, following the existing picker pattern

This preserves the current separation between data semantics, presentation layout, and interaction logic.
