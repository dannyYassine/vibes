# Phase 2, Week 4 — Frontend: SSE Streaming, Validation & Polish

## Context

The backend SSE streaming endpoints (generate, modify, validate, fix) are complete. The frontend currently uses a non-streaming HTTP POST in `AiGateway` that returns a single `Complete` event. This session converts the frontend to consume real SSE streams for progressive rendering, adds the AI assistant modify flow, implements the validation UI, and polishes node rendering with icons and dark-theme styling.

---

## Step 1: Domain Models & Interfaces

**New file:** `domain/models/validation.model.ts`
- `ValidationSeverity` type: `'Error' | 'Warning' | 'Info'`
- `ValidationRule` type: union of all 10 rule strings (`ORPHAN_NODE`, etc.)
- `ValidationWarning` interface: `{ id, severity, message, nodeIds, edgeIds, rule }`
- `ValidationResult` interface: `{ valid, warnings }`

**New file:** `domain/interfaces/validation-provider.interface.ts`
- `ValidationProvider` with `validate(diagramId: string): Promise<ValidationResult>`

**Modify:** `domain/interfaces/ai-provider.interface.ts`
- Add `fix(diagramId, warningId, rule, message): AsyncIterable<GenerateEvent>` method

---

## Step 2: SSE Client & Infrastructure

**New file:** `infrastructure/clients/sse.client.ts`
- Uses `fetch()` API (not HttpClient — no streaming support in HttpClient)
- `async *post(url, body, signal?): AsyncGenerator<GenerateEvent>`
- Reads `response.body` as `ReadableStream`, parses SSE text protocol
- Handles: `event:` lines → eventType, `data:` lines → JSON parse, blank line → yield event
- Buffers partial chunks across reads
- Accepts `AbortSignal` for cancellation

**Rewrite:** `infrastructure/gateways/ai.gateway.ts`
- Replace HttpClient with SseClient
- `generate(prompt)` → `SseClient.post(baseUrl + '/generate', { prompt })`
- `modify(diagramId, prompt, selectedNodeIds)` → `SseClient.post(baseUrl + '/' + diagramId + '/modify', { prompt, selected_node_ids: selectedNodeIds })`
- `fix(diagramId, warningId, rule, message)` → `SseClient.post(baseUrl + '/' + diagramId + '/fix', { warning_id: warningId, rule, message })`

**New file:** `infrastructure/gateways/validation.gateway.ts`
- Implements `ValidationProvider` using HttpClient
- `POST /api/diagrams/:id/validate` → returns `ValidationResult`

---

## Step 3: Batch Undo Support in DiagramState

**Modify:** `domain/state/diagram.state.ts`
- Add `private batchMode = false` and `private batchSnapshot: Diagram | null = null`
- `beginBatch()`: saves current diagram as snapshot, sets `batchMode = true`
- While `batchMode`, `addNode`/`addEdge`/`removeNode`/`removeEdge`/`updateNode` skip `undoRedo.push()`
- `endBatch()`: pushes saved snapshot to undo stack, sets `batchMode = false`
- `ensureDiagram()`: if `this.diagram` is null, create empty scaffold `{ id: '', name: '', nodes: [], edges: [], ... }`

**Modify:** `application/facades/diagram.facade.ts`
- Expose `beginBatch()`, `endBatch()`, `ensureDiagram()` as pass-throughs
- Add `getCurrentDiagramId(): string | null` getter
- Add `removeEdge(id)` without removing connected edges (for SSE `edge_removed` events — node removal already handles cascading)

---

## Step 4: Progressive Rendering in AiFacade

**Modify:** `application/facades/ai.facade.ts`
- Add `streamingSubject = new BehaviorSubject<boolean>(false)`, expose as `streaming$`
- Add private `handleStreamEvent(event)` switch:
  - `node_added` → `diagramFacade.addNode(mapNode(event.data))`
  - `edge_added` → `diagramFacade.addEdge(mapEdge(event.data))`
  - `node_removed` → `diagramFacade.removeNode(event.data.id)`
  - `node_updated` → `diagramFacade.updateNode(event.data.id, mapNode(event.data))`
  - `edge_removed` → `diagramFacade.removeEdge(event.data.id)`
  - `complete` → `diagramFacade.loadDiagramFromData(event.data)` (final state)
  - `error` → throw
- Refactor `generateDiagram()` to use `handleStreamEvent`, wrap with `beginBatch()`/`endBatch()`
- Call `diagramFacade.ensureDiagram()` before streaming starts (for generate — no existing diagram)
- Add `modifyDiagram(prompt)`: gets current diagram ID + selected node IDs, calls `aiProvider.modify()`, same event loop
- Add `fixWarning(diagramId, warningId, rule, message)`: calls `aiProvider.fix()`, same event loop

Note: Backend sends snake_case event names (`node_added`). The `handleStreamEvent` switch matches on snake_case directly.

---

## Step 5: DI Wiring

**Modify:** `application/tokens.ts`
- Add `VALIDATION_PROVIDER = new InjectionToken<ValidationProvider>('ValidationProvider')`

**Modify:** `app.config.ts`
- Add provider: `{ provide: VALIDATION_PROVIDER, useClass: ValidationGateway }`

---

## Step 6: ValidationFacade

**New file:** `application/facades/validation.facade.ts`
- Injectable, providedIn: 'root'
- BehaviorSubjects: `validationResult$`, `validating$`
- `validate(diagramId)`: calls provider, updates subjects
- `clearValidation()`: resets
- `warningCount$`: derived from `validationResult$`

---

## Step 7: Chat Component Updates

**Modify:** `presentation/chat/chat.component.ts`
- Inject `DiagramFacade` alongside `AiFacade`
- Subscribe to `AiFacade.streaming$`
- Streaming indicator: replace "Generating..." with animated dots while `streaming$` is true
- Smart mode: if `diagram$` has value → button says "Modify", calls `aiFacade.modifyDiagram(prompt)`; else → "Generate", calls `aiFacade.generateDiagram(prompt)`
- Update placeholder text to match mode
- Auto-scroll messages container on new messages via `ViewChild`

---

## Step 8: Toolbar — Validate Button

**Modify:** `presentation/toolbar/toolbar.component.ts`
- Inject `ValidationFacade`
- Add "Validate" button, disabled when no diagram loaded
- On click: `validationFacade.validate(diagram.id)`
- Style with green accent (`#a6e3a1`) border

---

## Step 9: Validation Panel

**New file:** `presentation/validation/validation-panel.component.ts`
- Standalone component, dark theme (Catppuccin Mocha)
- Header with warning count badge
- List of warnings: severity indicator (colored dot), rule name (human-readable), message
- "Fix with AI" button per warning → calls `aiFacade.fixWarning()`
- Click warning → highlight affected nodes via `diagramFacade.selectNodes(warning.nodeIds)`
- Severity colors: Error `#f38ba8`, Warning `#f9e2af`, Info `#89b4fa`

**Modify:** `presentation/layout/layout.component.ts`
- Import and add `ValidationPanelComponent` in right panel below chat

---

## Step 10: Architecture Icons

**New file:** `presentation/canvas/renderers/icon.renderer.ts`
- `IconRenderer` class with procedural Canvas 2D drawing per category
- `drawIcon(ctx, category, x, y, color)` — 24x24px icons
- Icons: Compute=server chip, Networking=globe, Data=cylinder, Caching=lightning, Messaging=envelope, Storage=stacked discs, Security=shield, Observability=eye, Group=dashed rect
- Skip icon below zoom 0.4, fall back to colored dot

---

## Step 11: Node Renderer Polish

**Modify:** `presentation/canvas/renderers/node.renderer.ts`
- **Dark theme**: fill `#313244`, border `#45475a`, text `#cdd6f4`
- **Icon**: replace colored badge with `IconRenderer.drawIcon()` at left side
- **Two-line label**: primary label 14px `#cdd6f4`, secondary (component type) 11px `#a6adc8`
- **Left-aligned** layout: `[8px][24px icon][8px][labels][8px]`
- **Group nodes**: dashed border, semi-transparent fill, label at top-left
- **Selection glow**: `shadowBlur` with `#cba6f7` instead of blue border
- **Validation warning**: accept optional `warnedNodeIds: Set<string>`, draw yellow/red triangle at top-right for warned nodes
- Update `render()` signature to accept `warnedIds?: Set<string>`

---

## File Summary

### New files (7)
1. `frontend/src/app/domain/models/validation.model.ts`
2. `frontend/src/app/domain/interfaces/validation-provider.interface.ts`
3. `frontend/src/app/infrastructure/clients/sse.client.ts`
4. `frontend/src/app/infrastructure/gateways/validation.gateway.ts`
5. `frontend/src/app/application/facades/validation.facade.ts`
6. `frontend/src/app/presentation/canvas/renderers/icon.renderer.ts`
7. `frontend/src/app/presentation/validation/validation-panel.component.ts`

### Modified files (10)
1. `frontend/src/app/domain/interfaces/ai-provider.interface.ts`
2. `frontend/src/app/domain/state/diagram.state.ts`
3. `frontend/src/app/infrastructure/gateways/ai.gateway.ts`
4. `frontend/src/app/application/facades/diagram.facade.ts`
5. `frontend/src/app/application/facades/ai.facade.ts`
6. `frontend/src/app/application/tokens.ts`
7. `frontend/src/app/app.config.ts`
8. `frontend/src/app/presentation/canvas/renderers/node.renderer.ts`
9. `frontend/src/app/presentation/chat/chat.component.ts`
10. `frontend/src/app/presentation/toolbar/toolbar.component.ts`
11. `frontend/src/app/presentation/layout/layout.component.ts`

---

## Verification

1. `ng build` — zero errors
2. `ng serve` — app loads at localhost:4200
3. Manual test with backend running:
   - Type prompt in chat → SSE stream starts → nodes appear progressively on canvas
   - After generation, button switches to "Modify" → type modification → canvas updates incrementally
   - Click "Validate" → validation panel shows warnings
   - Click "Fix with AI" on a warning → SSE stream fixes the issue
4. Visual check: dark-themed nodes with category icons, group node dashed borders, selection glow
