# Phase 1, Week 2: Canvas Basics (Frontend)

## Context
The frontend has a skeleton `CanvasComponent` that only draws a static grid and placeholder text. We need to build the full interactive canvas: renderers for grid/nodes/edges, handlers for zoom/drag/selection, and wire it all to the existing `DiagramFacade`. This is Session 4 per PLAN.md.

## Architecture

Introduce a **`CanvasEngine`** plain TypeScript class that orchestrates renderers and handlers. The Angular component becomes a thin shell.

```
presentation/canvas/
  canvas.component.ts          (rewrite — thin Angular shell)
  canvas-engine.ts             (new — orchestrator, render loop, event dispatch)
  canvas-context.ts            (new — shared types + CanvasContext interface)
  renderers/
    grid.renderer.ts           (new)
    node.renderer.ts           (new)
    edge.renderer.ts           (new)
  handlers/
    zoom.handler.ts            (new)
    drag.handler.ts            (new)
    selection.handler.ts       (new)
```

## Implementation Steps

### 1. `canvas-context.ts` — Shared types
- `CanvasContext` interface: `canvas`, `ctx`, `viewport`, `screenToCanvas()`, `canvasToScreen()`, `requestRender()`
- `ViewportState`: `{ x, y, zoom }`
- `HitTestResult`, `SelectionRect` types
- Coordinate transform: `canvasX = (screenX - viewport.x) / viewport.zoom`

### 2. `renderers/grid.renderer.ts`
- `render(ctx, canvas, viewport)` — stateless
- Base grid size 20px, major grid every 5x
- Compute visible bounds from viewport, only draw visible lines
- Skip minor lines below zoom 0.4, skip all below 0.2

### 3. `renderers/node.renderer.ts`
- `render(ctx, nodes, selectedIds)` — draw all nodes
- `hitTest(nodes, canvasX, canvasY): DiagramNode | null` — point-in-rect, reverse iteration for z-order
- `hitTestRect(nodes, rect): DiagramNode[]` — rectangle intersection for drag-select
- Drawing: rounded rect (6px radius), white fill, shadow, border (#ccc normal / #2196F3 selected), centered label (14px sans-serif), category color badge top-left
- Category color map: Compute=blue, Networking=green, Data=purple, Caching=orange, Messaging=yellow, Storage=teal, Security=red, Observability=cyan, Group=gray

### 4. `renderers/edge.renderer.ts`
- `render(ctx, edges, nodes, selectedNodeIds)` — draw all edges
- `hitTest(edges, nodes, canvasX, canvasY, tolerance=5): DiagramEdge | null` — point-to-line distance
- Draw line from source node center to target node center, clipped at node boundary
- Edge type styling: Synchronous=solid #555, Asynchronous=dashed [6,4] #888, DataFlow=solid #4CAF50, Dependency=dotted [2,3] #999
- Arrowhead: filled triangle 10px at target (+ source if bidirectional)
- Label at midpoint with white background pill if `edge.label` set

### 5. `handlers/zoom.handler.ts`
- `onWheel(event)` — zoom toward cursor position
- Bounds: 0.1x to 3.0x, sensitivity `0.001 * -deltaY`
- Algorithm: compute canvas point under cursor before zoom, update zoom, adjust pan so same point stays under cursor
- `event.preventDefault()` to suppress page scroll

### 6. `handlers/drag.handler.ts`
- Dual mode: `'none' | 'pan' | 'node'`
- `onMouseDown`: hit-test nodes → node drag; empty space → pan
- `onMouseMove`: pan updates `viewport.x/y`; node drag computes delta in canvas-space, updates position locally (not facade)
- `onMouseUp`: if node moved, fire `onNodeMoved(id, position)` callback (component calls `facade.moveNode`)
- Only commits to facade on mouseUp to avoid polluting undo stack

### 7. `handlers/selection.handler.ts`
- Click on node: select it (shift = toggle)
- Click on empty: clear selection
- Shift+drag on empty: draw selection rectangle, `hitTestRect` on mouseUp
- `renderSelectionRect(ctx)` — blue semi-transparent rect in screen-space (drawn after `ctx.restore()`)
- Fires `onSelectionChanged(ids)` callback

### 8. `canvas-engine.ts` — Orchestrator
- Creates all renderers and handlers
- Implements `CanvasContext`
- `setDiagram(d)` / `setSelectedNodeIds(ids)` — called by component on observable emission
- `requestRender()` — coalesced via `requestAnimationFrame` (not continuous loop)
- `render()`: clear, `ctx.save()`, translate+scale viewport, draw grid→edges→nodes, `ctx.restore()`, draw selection rect overlay
- `attachEvents()` / `detachEvents()` — mouse/wheel listeners on canvas
- Event dispatch: mousedown → hit-test → route to drag or selection handler; mousemove → active handler; mouseup → finalize; wheel → zoom
- HiDPI support: multiply canvas dimensions by `devicePixelRatio`, apply `ctx.scale(dpr, dpr)` before viewport transform
- Cursor management: default, pointer (hover node), move (drag node), grabbing (pan), crosshair (selection rect)
- Callbacks: `onNodeMoved`, `onSelectionChanged`

### 9. Rewrite `canvas.component.ts`
- `ngAfterViewInit`: create `CanvasEngine`, wire callbacks to facade methods, subscribe to `diagram$` and `selectedNodeIds$`, set up `ResizeObserver`
- `ngOnDestroy`: cleanup subscriptions and engine
- UX: left-drag on empty = pan; shift+left-drag on empty = selection rect

### 10. Update `PROGRESS.md`
- Check off all Week 2 frontend items

## Key Files to Modify
- `frontend/src/app/presentation/canvas/canvas.component.ts` — rewrite
- `frontend/src/app/application/facades/diagram.facade.ts` — no changes needed (selectNodes handles toggle via array manipulation in handler)

## New Files (8)
- `frontend/src/app/presentation/canvas/canvas-context.ts`
- `frontend/src/app/presentation/canvas/canvas-engine.ts`
- `frontend/src/app/presentation/canvas/renderers/grid.renderer.ts`
- `frontend/src/app/presentation/canvas/renderers/node.renderer.ts`
- `frontend/src/app/presentation/canvas/renderers/edge.renderer.ts`
- `frontend/src/app/presentation/canvas/handlers/zoom.handler.ts`
- `frontend/src/app/presentation/canvas/handlers/drag.handler.ts`
- `frontend/src/app/presentation/canvas/handlers/selection.handler.ts`

## Build Order
Steps 1-4 (types + renderers) can be parallelized. Steps 5-7 (handlers) can be parallelized once NodeRenderer exists. Step 8 integrates all. Step 9 wires to Angular.

## Verification
1. `cd frontend && ng build` — zero errors
2. `ng serve` — canvas renders at localhost:4200
3. Manual test: navigate to `/diagrams/test-id`, verify grid renders
4. To test interactions: temporarily add mock nodes/edges in the engine or facade to verify rendering, drag, zoom, selection work visually
