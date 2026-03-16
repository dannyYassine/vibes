# Phase 3, Week 5: Manual Editing

## Context

The diagram editor currently supports AI-driven generation and validation but lacks manual editing capabilities. Users cannot edit node properties, create edges visually, delete elements, or drag services from a library. This phase adds the hands-on editing tools needed to make the editor fully interactive.

---

## Implementation Steps

### Step 1: Service Catalog Data (shared dependency)

**New file:** `frontend/src/app/domain/models/service-catalog.ts`

- Export `SERVICE_CATALOG: Record<NodeCategory, string[]>` mapping each category to its component list (mirroring Rust enums exactly)
- Export `CATEGORY_COLORS` map (already used in renderers, centralize here)
- Used by both PropertiesPanelComponent and ServiceLibraryComponent

---

### Step 2: Keyboard Shortcuts

**New file:** `frontend/src/app/presentation/canvas/handlers/keyboard.handler.ts`

- Listens on `window` for `keydown` events
- **Delete/Backspace** → `onDeleteRequested` callback
- **Ctrl+Z / Cmd+Z** → `onUndo` callback
- **Ctrl+Shift+Z / Cmd+Shift+Z** → `onRedo` callback
- **Ctrl+S / Cmd+S** → `onSave` callback (prevent default)
- Skip events when `event.target` is an input/textarea/select

**Modify:** `frontend/src/app/presentation/canvas/canvas-engine.ts`
- Instantiate `KeyboardHandler` in `init()`, destroy in `destroy()`
- Add callback properties: `onDeleteRequested`, `onUndo`, `onRedo`, `onSave`

**Modify:** `frontend/src/app/presentation/canvas/canvas.component.ts`
- Wire engine callbacks → `facade.undo()`, `facade.redo()`, `facade.save()`, and delete flow

---

### Step 3: Properties Panel (replaces sidebar placeholder)

**Rewrite:** `frontend/src/app/presentation/sidebar/sidebar.component.ts` → rename to `properties-panel/properties-panel.component.ts`

- Inject `DiagramFacade`, subscribe to `selectedNodeIds$` + `diagram$`
- **No selection**: Show placeholder text
- **Single node selected**: Show editable form:
  - Label (text input, update on blur/Enter)
  - Category (dropdown from `SERVICE_CATALOG` keys)
  - Component (dropdown, populated from selected category's components)
  - Config (JSON textarea for MVP)
  - All changes → `facade.updateNode(id, changes)`
- **Multiple nodes**: Show "N nodes selected" + bulk delete button
- **Single edge selected** (Step 6): Show edge properties (type, label, protocol, port, bidirectional)

**Modify:** `frontend/src/app/presentation/layout/layout.component.ts`
- Replace `SidebarComponent` import with `PropertiesPanelComponent`

---

### Step 4: Deletion with Confirmation Dialog

**New file:** `frontend/src/app/presentation/shared/confirm-dialog.component.ts`

- Standalone modal: backdrop overlay + card with title, message, Cancel/Delete buttons
- Inputs: `visible`, `title`, `message`; Outputs: `confirmed`, `cancelled`
- Catppuccin theme: red (#f38ba8) delete button

**Modify:** `frontend/src/app/presentation/canvas/canvas.component.ts`
- On `onDeleteRequested`: gather selected node/edge IDs, show confirmation dialog
- On confirm: `facade.beginBatch()` → remove each node/edge → `facade.endBatch()` (single undo operation)

---

### Step 5: Port Rendering + Edge Creation

**Modify:** `frontend/src/app/presentation/canvas/renderers/node.renderer.ts`
- Add `drawPorts()`: small circles (r=5px) at center of each side (top/right/bottom/left)
- Only render ports on hovered or selected nodes
- Add `hitTestPort(nodes, x, y)` → `{ nodeId, side } | null` (hit radius ~8px)

**New file:** `frontend/src/app/presentation/canvas/handlers/edge-creation.handler.ts`
- State: `sourceNodeId`, `sourcePort`, `currentMousePos`
- `onMouseDown`: if port hit, start edge creation, return true
- `onMouseMove`: update preview line endpoint
- `onMouseUp`: check target port hit → fire `onEdgeCreated(sourceId, targetId)` or cancel
- `renderPreview(ctx)`: dashed line from source port to mouse position

**Modify:** `frontend/src/app/presentation/canvas/canvas-engine.ts`
- Track `hoveredNodeId` (update in `handleMouseMove`)
- In `handleMouseDown`: check port hit first → route to EdgeCreationHandler before DragHandler
- In `render()`: call `edgeCreationHandler.renderPreview()` after nodes
- Add `onEdgeCreated` callback
- Cursor: `crosshair` when hovering a port

**Modify:** `frontend/src/app/presentation/canvas/canvas.component.ts`
- Wire `onEdgeCreated` → `facade.addEdge()` with generated UUID + default Synchronous type

---

### Step 6: Edge Selection

**Modify:** `frontend/src/app/presentation/canvas/canvas-engine.ts`
- In click handling: if no node hit, check `edgeRenderer.hitTest()` for edge click
- Track `selectedEdgeIds` alongside `selectedIds` (nodes)
- Pass to edge renderer for highlight rendering

**Modify:** `frontend/src/app/presentation/canvas/renderers/edge.renderer.ts`
- Accept `selectedEdgeIds` set, render selected edges with thicker/highlighted style

**Modify:** `frontend/src/app/application/facades/diagram.facade.ts`
- Add `selectedEdgeIds$` BehaviorSubject + `selectEdges(ids)` method

**Modify:** `frontend/src/app/presentation/canvas/canvas.component.ts`
- Wire edge selection changes to facade

---

### Step 7: Service Library + Drag-to-Canvas

**New file:** `frontend/src/app/presentation/service-library/service-library.component.ts`

- Uses `SERVICE_CATALOG` data
- Categorized list with collapsible sections (category name + color)
- Each item: draggable, sets `dataTransfer` with category + component
- Search/filter input at top
- ~220px wide, toggleable panel

**Modify:** `frontend/src/app/presentation/toolbar/toolbar.component.ts`
- Add "Library" toggle button → emits event

**Modify:** `frontend/src/app/presentation/layout/layout.component.ts`
- Add service library as a toggleable left panel (between toolbar area and canvas)
- Grid: `auto 1fr 300px` where `auto` is 0 or 220px based on toggle

**Modify:** `frontend/src/app/presentation/canvas/canvas.component.ts`
- Listen for `dragover` (prevent default) and `drop` events on canvas host
- On drop: extract type from `dataTransfer`, compute canvas position via `screenToCanvas()`, create node with default size (180x48) + default label, call `facade.addNode(node)`

---

### Step 8: Backend — Granular Node/Edge CRUD Endpoints

**New use cases** (each follows fetch-mutate-save pattern):
- `backend/crates/nimbus-app/src/use_cases/add_diagram_node.rs` — add single node
- `backend/crates/nimbus-app/src/use_cases/patch_diagram_node.rs` — update single node fields
- `backend/crates/nimbus-app/src/use_cases/delete_diagram_node.rs` — remove node + connected edges
- `backend/crates/nimbus-app/src/use_cases/add_diagram_edge.rs` — add single edge
- `backend/crates/nimbus-app/src/use_cases/patch_diagram_edge.rs` — update single edge
- `backend/crates/nimbus-app/src/use_cases/delete_diagram_edge.rs` — remove single edge

**Modify:** `backend/crates/nimbus-app/src/use_cases/mod.rs` — export new modules

**Modify:** `backend/crates/nimbus-api/src/dto/diagram.rs` — add DTOs:
- `AddNodeRequest`, `PatchNodeRequest`, `AddEdgeRequest`, `PatchEdgeRequest`

**Modify:** `backend/crates/nimbus-api/src/handlers/diagram.rs` — add 6 handler functions

**Modify:** `backend/crates/nimbus-api/src/routes.rs` — add routes:
- `POST /api/diagrams/{id}/nodes`
- `PATCH /api/diagrams/{id}/nodes/{nodeId}`
- `DELETE /api/diagrams/{id}/nodes/{nodeId}`
- `POST /api/diagrams/{id}/edges`
- `PATCH /api/diagrams/{id}/edges/{edgeId}`
- `DELETE /api/diagrams/{id}/edges/{edgeId}`

**Modify:** `backend/crates/nimbus-api/src/state.rs` — add use cases to AppState
**Modify:** `backend/crates/nimbus-api/src/main.rs` — instantiate and inject use cases

Concurrency: last-write-wins via existing transactional `repo.update()`.

---

## Key Decisions

1. **Properties panel replaces sidebar** — same layout slot, not a new panel
2. **Edge creation via port drag** — no mode toggle; users drag from visible port circles
3. **Batch undo for multi-delete** — `beginBatch()`/`endBatch()` wraps multi-node deletion
4. **Service catalog as static TS data** — mirrors Rust enums, no API call needed
5. **Frontend keeps full-save** — granular backend endpoints built for future use; frontend MVP continues using `facade.save()` which sends the whole diagram

---

## Verification

1. `cargo build` — all backend crates compile
2. `ng build` — frontend compiles with zero errors
3. **Keyboard shortcuts**: Press Delete with node selected → confirmation dialog → node removed; Ctrl+Z undoes; Ctrl+Shift+Z redoes; Ctrl+S saves
4. **Properties panel**: Select node → edit label → see change on canvas; change category/component → node type updates
5. **Edge creation**: Hover node → ports appear → drag from port to another node's port → edge created
6. **Service library**: Toggle library → drag "LoadBalancer" onto canvas → node appears at drop position
7. **Backend endpoints**: `curl -X POST .../diagrams/{id}/nodes` adds a node; `curl -X DELETE .../diagrams/{id}/nodes/{nodeId}` removes it
