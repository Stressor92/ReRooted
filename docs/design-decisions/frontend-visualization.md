# Design Decisions: Frontend Visualization and Interaction

This document records the main visualization-oriented decisions used by the current frontend implementation.

---

## Decision 1 — Use React Flow for interaction and Dagre for layout

### Problem

ReRooted needs to display editable family structures with:

- directed parent-child connections
- partner relationships
- pan/zoom navigation
- selection and edge interaction
- quick visual relayout in different directions

No single out-of-the-box layout engine covers both visual arrangement and interactive editing ergonomics equally well.

### Options considered

1. **Pure CSS/SVG layout with custom drag and edge logic**
   - maximum control
   - high implementation cost for selection, zooming, connection gestures, viewport fitting

2. **Backend-computed coordinates**
   - deterministic layout from the server
   - harder to switch view direction or tune spacing interactively in the browser

3. **React Flow for interaction + Dagre for client-side layout**

### Chosen solution

The frontend uses:

- `@xyflow/react` for canvas interaction, node/edge rendering, viewport control, and connection gestures
- `@dagrejs/dagre` for deterministic client-side layout in `TB` and `LR` modes

### Trade-offs

**Advantages**

- interactive graph behavior comes almost entirely from a proven library
- layout can change instantly without another backend request
- the backend stays focused on genealogy semantics, not pixel positions

**Costs**

- node dimensions must be approximated for layout heuristics
- layout issues can look like rendering bugs if fit/spacing values drift
- the browser must load and lay out the full graph in memory

### Future considerations

- very large trees may eventually need viewport virtualization or progressive loading
- alternate layout engines could be introduced if Dagre becomes too rigid for complex patchwork families

---

## Decision 2 — Use a side panel for person editing instead of editing inline on the node

### Problem

Person editing includes a wide range of fields and media operations:

- scalar fields (names, address, phone)
- birth/death mapping through events
- relationship summary and timeline
- image uploads and metadata
- document/source uploads and PDF preview

Inline node editing would overload the graph surface and make multi-step forms difficult to manage.

### Options considered

1. **Edit directly on the node card**
   - minimal navigation
   - poor fit for rich forms and media workflows

2. **Navigate to a dedicated route per person**
   - clear separation
   - loses direct context with the tree while editing

3. **Open a right-side `PersonPanel` tied to the selected node**

### Chosen solution

The current UI uses an animated right-side `PersonPanel` with tabs for `Info`, `Fotos`, and `Dokumente`.

### Trade-offs

**Advantages**

- keeps the graph visible while editing
- supports richer workflows without bloating the node UI
- naturally groups media/document functionality into tabs

**Costs**

- panel state must stay synchronized with the selected node
- narrow screens need additional responsive handling

### Future considerations

- if the project later needs a record-centric workflow, a dedicated route view could complement the current panel instead of replacing it

---

## Decision 3 — Keep image export client-side and let the backend publish supported formats

### Problem

Users need quick export to `PNG`, `JPG`, and `SVG`, but the thing being exported is the **current browser-rendered viewport state**, including theme/background choices and React Flow rendering.

### Options considered

1. **Render exports on the backend**
   - potentially more deterministic server output
   - would require a separate rendering pipeline for the graph and themes

2. **Export entirely in the browser**
   - directly captures what the user sees
   - relies on DOM/SVG serialization working correctly

3. **Hybrid model: frontend renders the export, backend exposes supported format metadata**

### Chosen solution

The current code uses a **hybrid model**:

- `useCanvasExport.ts` renders images in the browser with `html-to-image`
- `GET /export/image-formats` provides the supported export format list (`png`, `jpg`, `svg`)

### Trade-offs

**Advantages**

- exported image matches the current themed UI view
- no server-side rendering stack is needed
- the UI can still be backend-driven regarding which formats are considered supported

**Costs**

- export quality depends on browser rendering behavior
- DOM elements that should not appear in the export must be filtered manually

### Future considerations

- a server-side export service could be added later for deterministic print/export output, but it should be treated as a separate pipeline rather than a minor extension of the current one

---

## Decision 4 — Use CSS custom properties for live theming rather than component-local style variants

### Problem

The app supports multiple visual templates and background variants that must affect many components at once: canvas, cards, panel, borders, accent colors, edge colors, and typography.

### Options considered

1. **Component-by-component theme props**
   - explicit
   - prop-heavy and repetitive across the tree workspace

2. **CSS class switching only**
   - simple for small theme sets
   - less expressive when many token values change together

3. **Runtime CSS custom properties populated from design template objects**

### Chosen solution

`applyTemplate()` writes a template’s values into CSS custom properties on `document.documentElement`, and components consume those tokens through `tokens.css`.

### Trade-offs

**Advantages**

- consistent theme updates without reworking component APIs
- easy to add new templates as data objects
- good fit for background pickers and export rendering

**Costs**

- token names become part of the architecture and must stay consistent
- there is less compile-time safety than with typed style props alone

### Future considerations

- additional token sets (e.g. accessibility/high-contrast presets) can build on the same mechanism without changing feature logic
