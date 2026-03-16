# Phase 3, Week 6: Persistence & Export

## Context
The editor currently only saves manually (Ctrl+S or toolbar Save button). There's no auto-save, no export functionality, and the diagram list page lacks delete capability and metadata display. Viewport position isn't synced back from the canvas engine to the diagram state, so it's lost between sessions.

---

## 1. Backend: JSON Export Endpoint

**New use case**: `backend/crates/nimbus-app/src/use_cases/export_diagram_json.rs`
- Follow `GetDiagram` pattern: `ExportDiagramJson` struct with `Arc<dyn DiagramRepository>`, `new()`, `execute(id: Uuid) -> Result<Diagram, DomainError>`
- Thin wrapper over `repo.get(id)` — exists so future export logic has a home

**Register use case**: `backend/crates/nimbus-app/src/use_cases/mod.rs` — add `pub mod export_diagram_json;`

**New handler** in `backend/crates/nimbus-api/src/handlers/diagram.rs`:
- `export_diagram_json(Path(id), State(state))` handler
- Serialize diagram to JSON, return with `Content-Disposition: attachment; filename="{name}.json"` header

**Register route** in `backend/crates/nimbus-api/src/routes.rs`:
```rust
.route("/api/diagrams/{id}/export/json", get(handlers::diagram::export_diagram_json))
```

**Wire in AppState** (`state.rs` + `main.rs`):
- Add `pub export_diagram_json: ExportDiagramJson` field
- Instantiate with `ExportDiagramJson::new(diagram_repo.clone())`

---

## 2. Backend: Database Performance Indexes

**New migration**: `backend/migrations/002_add_performance_indexes.sql`
```sql
CREATE INDEX IF NOT EXISTS idx_diagrams_updated_at ON diagrams(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagrams_name ON diagrams(name);
```
Existing indexes already cover nodes/edges foreign keys. This adds sort optimization for the list query.

---

## 3. Frontend: Viewport Persistence

**Problem**: `CanvasEngine.viewport` is mutated by zoom/drag handlers but never synced back to the diagram model.

**DiagramState** (`domain/state/diagram.state.ts`):
- Add `setViewport(viewport: Viewport): void` — updates `this.diagram.viewport` without pushing to undo history

**DiagramFacade** (`application/facades/diagram.facade.ts`):
- Add `updateViewport(viewport: Viewport): void` — calls `diagramState.setViewport(viewport)`, emits on `diagramSubject`, calls `markDirty()` (no undo)

**CanvasEngine** (`presentation/canvas/canvas-engine.ts`):
- Add callback: `onViewportChanged: ((viewport: ViewportState) => void) | null = null`
- In `setDiagram()`: restore viewport from diagram — `this.viewport = { x: diagram.viewport.x, y: diagram.viewport.y, zoom: diagram.viewport.zoom }`
- Fire `onViewportChanged` after zoom/pan mutations in `handleWheel` and when `dragHandler` is in pan mode in `handleMouseMove`

**CanvasComponent** (`presentation/canvas/canvas.component.ts`):
- Wire: `this.engine.onViewportChanged = (vp) => this.facade.updateViewport(vp);`

---

## 4. Frontend: Auto-Save (Debounced 2s)

**DiagramFacade** (`application/facades/diagram.facade.ts`):

- Add `private autoSave$ = new Subject<void>()`
- Add `private autoSaveSub: Subscription`
- Add `private isSaving = false`
- Add private helper `markDirty()` that does `this.isDirty$.next(true)` + `this.autoSave$.next()`
- Replace all 9 occurrences of `this.isDirty$.next(true)` with `this.markDirty()` (in addNode, updateNode, moveNode, removeNode, addEdge, updateEdge, removeEdge, undo, redo)
- In constructor, set up:
  ```typescript
  this.autoSaveSub = this.autoSave$.pipe(
    debounceTime(2000),
    filter(() => this.isDirty$.value && !this.isSaving),
    exhaustMap(() => from(this.save()))
  ).subscribe();
  ```
- Update `save()` to guard with `isSaving` flag, catch errors (keep dirty on failure)
- Add `destroy()` method to unsubscribe and flush pending save

**EditorComponent** (`presentation/editor/editor.component.ts`):
- Implement `OnDestroy`, call `facade.destroy()` in `ngOnDestroy()`

---

## 5. Frontend: ExportFacade (New File)

**Create**: `frontend/src/app/application/facades/export.facade.ts`

`@Injectable({ providedIn: 'root' })` with methods:

- **`exportPng(canvas: HTMLCanvasElement, diagramName: string): void`**
  - `canvas.toDataURL('image/png')` → create `<a>` with `download` attr → click → remove

- **`exportJson(diagram: Diagram): void`**
  - `JSON.stringify(diagram, null, 2)` → `Blob` → object URL → download link → revoke URL

- **`importJson(file: File): Promise<Diagram>`**
  - `FileReader.readAsText()` → parse JSON → validate shape (id, name, nodes, edges, viewport) → `repo.create(parsed.name)` → `repo.update(newId, { nodes, edges, viewport })` → return created diagram

---

## 6. Frontend: Toolbar Export/Import Buttons

**ToolbarComponent** (`presentation/toolbar/toolbar.component.ts`):
- Inject `ExportFacade`
- Add `@Output() exportPngRequested = new EventEmitter<void>()`
- Add buttons: "Export PNG", "Export JSON", "Import JSON"
- "Export JSON" calls `exportFacade.exportJson(currentDiagram)` directly
- "Export PNG" emits event (needs canvas ref from LayoutComponent)
- "Import JSON" uses hidden `<input type="file" accept=".json">`, on change calls `exportFacade.importJson(file)` then navigates to new diagram via `Router`
- Add `@Output() importCompleted = new EventEmitter<string>()` for navigation

**CanvasComponent** (`presentation/canvas/canvas.component.ts`):
- Add public method `getCanvasElement(): HTMLCanvasElement` → returns `this.canvasRef.nativeElement`

**LayoutComponent** (`presentation/layout/layout.component.ts`):
- Add `@ViewChild(CanvasComponent)` ref
- Wire toolbar's `exportPngRequested` → get canvas element from CanvasComponent → call `exportFacade.exportPng(canvas, name)`

---

## 7. Frontend: DiagramListComponent Improvements

**DiagramListComponent** (`presentation/diagram-list/diagram-list.component.ts`):

- Add `updatedAt` display using `DatePipe`: show formatted date next to node count
- Add delete button per row with `(click)="deleteDiagram($event, diagram.id)"` — `$event.stopPropagation()` to prevent navigation
- Add confirmation using `ConfirmDialogComponent` (already exists in `presentation/shared/`)
- State: `diagramToDelete: string | null = null`, `showDeleteDialog = false`
- `deleteDiagram(event, id)` → stopPropagation, set `diagramToDelete = id`, show dialog
- `onDeleteConfirmed()` → `repo.delete(this.diagramToDelete)`, refresh list
- Import `ConfirmDialogComponent` and `DatePipe`

---

## Implementation Order

1. **Backend: migration + export endpoint** (independent)
2. **Frontend: DiagramState.setViewport + DiagramFacade.updateViewport** (foundation)
3. **Frontend: CanvasEngine viewport sync** (depends on #2)
4. **Frontend: Auto-save with markDirty** (depends on #2)
5. **Frontend: ExportFacade** (independent)
6. **Frontend: Toolbar buttons + Layout wiring** (depends on #5)
7. **Frontend: DiagramListComponent improvements** (independent)

Steps 1, 5, 7 can be parallelized. Steps 2-4 are sequential.

---

## Files Modified/Created

| File | Action |
|------|--------|
| `backend/migrations/002_add_performance_indexes.sql` | Create |
| `backend/crates/nimbus-app/src/use_cases/export_diagram_json.rs` | Create |
| `backend/crates/nimbus-app/src/use_cases/mod.rs` | Edit |
| `backend/crates/nimbus-api/src/handlers/diagram.rs` | Edit |
| `backend/crates/nimbus-api/src/routes.rs` | Edit |
| `backend/crates/nimbus-api/src/state.rs` | Edit |
| `backend/crates/nimbus-api/src/main.rs` | Edit |
| `frontend/src/app/domain/state/diagram.state.ts` | Edit |
| `frontend/src/app/application/facades/diagram.facade.ts` | Edit |
| `frontend/src/app/application/facades/export.facade.ts` | Create |
| `frontend/src/app/presentation/canvas/canvas-engine.ts` | Edit |
| `frontend/src/app/presentation/canvas/canvas.component.ts` | Edit |
| `frontend/src/app/presentation/toolbar/toolbar.component.ts` | Edit |
| `frontend/src/app/presentation/layout/layout.component.ts` | Edit |
| `frontend/src/app/presentation/diagram-list/diagram-list.component.ts` | Edit |
| `frontend/src/app/presentation/editor/editor.component.ts` | Edit |

---

## Verification

1. **Backend**: `cargo build` succeeds. Start server, hit `GET /api/diagrams/:id/export/json` — returns JSON with download header.
2. **Auto-save**: Open editor, add a node, wait 3s, refresh page — diagram persists with the new node.
3. **Viewport**: Zoom/pan, wait for auto-save, refresh — viewport is restored.
4. **Export PNG**: Click Export PNG → downloads a .png file showing the diagram.
5. **Export JSON**: Click Export JSON → downloads a .json file with diagram data.
6. **Import JSON**: Click Import JSON → select file → navigates to new diagram with imported content.
7. **Diagram list**: Shows updated_at dates. Delete button works with confirmation dialog.
8. `ng build` succeeds with zero errors.
