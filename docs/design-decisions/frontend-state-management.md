# Design Decisions: Frontend State Management

This document records the major frontend state-management choices visible in the current implementation.

---

## Decision 1 — Split state by ownership instead of forcing a single store

### Problem

The frontend must manage several very different kinds of state at the same time:

- backend-backed data (`tree`, `persons`, `person detail`, citations, files)
- UI-global settings (toasts, active template, background pattern)
- short-lived interaction state (selected tab, dialog open state, form drafts, hover state)

A single state container would blur ownership and make invalidation rules harder to reason about.

### Options considered

1. **Use only React local state**
   - simple for small forms
   - poor fit for shared server-state caching and invalidation

2. **Move everything into Zustand**
   - one global store
   - would require manual cache, request lifecycle, and stale-state management

3. **Use React Query for server state, Zustand for lightweight UI-global state, and local component state for ephemeral interaction state**

### Chosen solution

The implementation uses a **hybrid model**:

- `@tanstack/react-query` for server-backed state and invalidation
- `zustand` for toast and template/background selection
- component-local `useState()` / `useEffect()` for transient interaction state

### Trade-offs

**Advantages**

- clear ownership boundaries
- good cache invalidation behavior for API data
- avoids over-centralizing purely local interaction concerns

**Costs**

- contributors must understand three state scopes instead of one
- invalidation discipline becomes part of the architecture, not an optional detail

### Future considerations

- theme/background preferences could be persisted to `localStorage` without changing the overall split
- repeated invalidation patterns may justify a higher-level shared utility beyond the existing helper functions

---

## Decision 2 — Use optimistic updates for high-frequency graph mutations

### Problem

Tree editing operations such as creating a person or adding a relationship feel visually slow if the graph only changes after the round-trip to the backend finishes.

### Options considered

1. **Always wait for the backend before updating the tree**
   - simplest consistency model
   - noticeably less responsive for graph editing

2. **Maintain a separate unsaved client-side graph model**
   - very responsive
   - much more complex conflict and rollback handling

3. **Use optimistic React Query updates with temporary nodes/edges, then reconcile with canonical server data**

### Chosen solution

The current implementation chooses **optimistic cache updates** in hooks such as:

- `useCreatePerson()`
- `useCreateRelationship()`

Temporary IDs are inserted into the cached `['tree']` payload until the backend confirms the change.

### Trade-offs

**Advantages**

- immediate visual feedback on the canvas
- preserves the backend as the source of truth

**Costs**

- rollback logic is required on failure
- temporary IDs and replacement logic add complexity
- brief divergence between local optimistic state and server state is expected

### Future considerations

- undo/redo support would need a more explicit mutation history layer
- if multi-user editing is introduced, optimistic reconciliation rules would need to become more robust

---

## Decision 3 — Auto-save person details instead of using an explicit save form

### Problem

The `Info` tab contains many small fields (names, dates, places, address, phone number, description). Requiring a manual submit button after every edit would add friction and encourage stale unsaved drafts.

### Options considered

1. **Single explicit “Save” button**
   - easy to reason about
   - higher click friction and more unsaved-state risk

2. **Immediate write on every keystroke**
   - no unsaved state
   - too many requests, especially for textarea and date inputs

3. **Debounced auto-save with diff detection**

### Chosen solution

`InfoTab.tsx` implements **diff-based, debounced auto-save**:

- changes are serialized and compared against the last known saved snapshot
- save is delayed by roughly `800 ms`
- only changed fields are sent
- person fields and event fields are persisted through different mutation paths

### Trade-offs

**Advantages**

- low-friction editing experience
- avoids a full form submission model for every field group

**Costs**

- save timing becomes asynchronous and slightly less explicit
- background request failures must be surfaced well through UI state and toasts

### Future considerations

- if validation rules become more complex, a per-section save strategy may become preferable
- collaborative editing would require explicit dirty-state conflict handling
