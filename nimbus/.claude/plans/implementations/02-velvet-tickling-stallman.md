# Plan: Frontend Scaffolding & Domain (Week 1)

## Context
The backend is complete (Rust clean architecture with 5 crates). No frontend exists yet. This plan initializes the Angular 19 project with the same clean architecture layers, domain models, state management, DI wiring, and a basic layout shell — everything needed for `ng build` to succeed and the app to render at `http://localhost:4200`.

---

## Step 1: Initialize Angular 19 Project

```bash
cd /Users/dannyyassine/dev/vibes/nimbus
npx @angular/cli@19 new frontend \
  --style=scss --routing=true --standalone=true \
  --ssr=false --skip-git=true --skip-tests=false
```

Then replace Karma with Jest:
```bash
cd frontend
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter jasmine-core @types/jasmine
npm install --save-dev jest@29 @types/jest@29 jest-preset-angular@14 ts-jest@29
```

Create `jest.config.ts` and `setup-jest.ts`. Update `tsconfig.spec.json` for Jest.

---

## Step 2: Environment Files

- `src/environments/environment.ts` — `{ production: false, apiBaseUrl: 'http://localhost:8080' }`
- `src/environments/environment.prod.ts` — `{ production: true, apiBaseUrl: '' }`
- Update `angular.json` with `fileReplacements` for production

Backend runs on port 8080 (per `backend/crates/nimbus-api/src/config.rs`), CORS already allows `localhost:4200`.

---

## Step 3: Domain Layer (`src/app/domain/`) — Pure TypeScript, no Angular

### Models (`domain/models/`)
- `diagram.model.ts` — `Diagram`, `Viewport`, `CloudProvider`, `DiagramListItem`
- `node.model.ts` — `DiagramNode`, `Position`, `Size`, `NodeType`, `NodeCategory`, `NodeProperties`, `NodeStyle`, `ProviderMappings`, `ProviderMapping`
- `edge.model.ts` — `DiagramEdge`, `EdgeType`, `EdgeProperties`, `CommunicationPattern`, `EdgeStyle`
- `index.ts` — barrel export

All interfaces match `03-data-models.md` TypeScript section exactly.

### Interfaces (`domain/interfaces/`)
- `diagram-repository.interface.ts` — `list()`, `get(id)`, `create()`, `update()`, `delete()` returning Promises
- `ai-provider.interface.ts` — `generate()`, `modify()` returning `AsyncIterable<GenerateEvent>`
- `translation-provider.interface.ts` — `translate()`, `clearTranslation()`, `exportTerraform()`
- `index.ts` — barrel export

Per `05-angular-modules.md` interfaces section.

### State (`domain/state/`)
- `undo-redo.manager.ts` — generic `UndoRedoManager<T>` with `past`/`future` stacks, `push()`, `undo(current)`, `redo(current)`, `canUndo()`, `canRedo()`
- `diagram.state.ts` — `DiagramState` using `UndoRedoManager<Diagram>`. Methods: `load()`, `getDiagram()`, `addNode()`, `updateNode()`, `removeNode()`, `addEdge()`, `removeEdge()`, `moveNode()`, `undo()`, `redo()`. Immutable updates via spread.
- `selection.state.ts` — `SelectionState` with `Set<string>` for node/edge IDs. Methods: `selectNodes()`, `toggleNode()`, `clearSelection()`, getters.
- `index.ts` — barrel export

---

## Step 4: Application Layer (`src/app/application/`)

### DI Tokens (`application/tokens.ts`)
- `DIAGRAM_REPOSITORY = new InjectionToken<DiagramRepository>('DiagramRepository')`
- `AI_PROVIDER`, `TRANSLATION_PROVIDER` (wired in later weeks)

### Facades (`application/facades/`)
- `diagram.facade.ts` — `@Injectable({ providedIn: 'root' })`. Injects `DIAGRAM_REPOSITORY`. Contains:
  - `BehaviorSubject<Diagram | null>` → `diagram$`
  - `BehaviorSubject<string[]>` → `selectedNodeIds$`
  - `BehaviorSubject<boolean>` → `isDirty$`
  - Internally uses `DiagramState` and `SelectionState`
  - Public: `loadDiagram(id)`, `addNode()`, `moveNode()`, `removeNode()`, `addEdge()`, `removeEdge()`, `updateNode()`, `selectNodes()`, `clearSelection()`, `undo()`, `redo()`, `save()`
- `index.ts` — barrel export

### Mappers (`application/mappers/`)
- `diagram.mapper.ts` — `DiagramMapper` with static `fromApi(dto): Diagram` and `toApi(diagram): any`. Largely passthrough since backend uses camelCase serde.
- `node.mapper.ts` — `NodeMapper` with static `fromApi(dto): DiagramNode` and `toApi(node): any`. Handles nested structures.
- `index.ts` — barrel export

---

## Step 5: Infrastructure Layer (`src/app/infrastructure/`)

### Gateways (`infrastructure/gateways/`)
- `api.gateway.ts` — `@Injectable()` class `ApiGateway implements DiagramRepository`. Uses `HttpClient` with `environment.apiBaseUrl`. Endpoints:
  - `GET /api/diagrams` → `list()`
  - `GET /api/diagrams/:id` → `get(id)`
  - `POST /api/diagrams` → `create(name, description?)`
  - `PATCH /api/diagrams/:id` → `update(id, changes)`
  - `DELETE /api/diagrams/:id` → `delete(id)`
  - Converts Observable to Promise via `firstValueFrom`. Uses `DiagramMapper`.
- `index.ts` — barrel export

### Interceptors (`infrastructure/interceptors/`)
- `error.interceptor.ts` — functional `HttpInterceptorFn`. Catches HTTP errors, logs, re-throws. Minimal for Week 1.
- `index.ts` — barrel export

---

## Step 6: Routing & App Config

### `app.routes.ts`
```
{ path: '', redirectTo: 'diagrams', pathMatch: 'full' }
{ path: 'diagrams', loadComponent: () => import('./presentation/diagram-list/...') }
{ path: 'diagrams/:id', loadComponent: () => import('./presentation/editor/...') }
```

### `app.config.ts`
```
providers: [
  { provide: DIAGRAM_REPOSITORY, useClass: ApiGateway },
  provideHttpClient(withInterceptors([errorInterceptor])),
  provideRouter(routes),
  provideZoneChangeDetection({ eventCoalescing: true }),
]
```

### `app.component.ts`
Root component — template is just `<router-outlet />`.

---

## Step 7: Presentation Layer (`src/app/presentation/`)

### Layout Shell (CSS Grid)
```
+--------------------------------------------------+
|  ToolbarComponent (full width, 48px height)       |
|  [Diagram Name]  [Save] [Undo] [Redo]            |
+--------------------------------------------------+
|                              |                    |
|  CanvasComponent             | SidebarComponent   |
|  (flex: 1)                   | (fixed 300px)      |
|  <canvas> placeholder        | "Properties" panel  |
|                              |                    |
+------------------------------+--------------------+
```

### Components (all standalone)
- `layout/layout.component.ts` — CSS Grid shell: toolbar row, canvas + sidebar columns
- `toolbar/toolbar.component.ts` — diagram name (from `diagram$`), Save/Undo/Redo buttons (wired to facade)
- `canvas/canvas.component.ts` — `<canvas>` element, `@ViewChild` for context. Week 1: draws "Canvas Ready" text + grid background
- `sidebar/sidebar.component.ts` — placeholder "Properties" heading, "Select a node to view properties"
- `editor/editor.component.ts` — route component for `/diagrams/:id`. Composes `<app-layout>` with toolbar/canvas/sidebar. Reads `:id` from route, calls `DiagramFacade.loadDiagram(id)`
- `diagram-list/diagram-list.component.ts` — route component for `/diagrams`. Lists diagrams, "New Diagram" button, links to `/diagrams/:id`

---

## Step 8: Global Styles

`src/styles.scss` — CSS reset, box-sizing border-box, 100vh/100vw body, sans-serif font.

---

## File Tree Summary

```
frontend/src/app/
├── app.component.ts / .html / .scss
├── app.config.ts
├── app.routes.ts
├── domain/
│   ├── models/
│   │   ├── diagram.model.ts
│   │   ├── node.model.ts
│   │   ├── edge.model.ts
│   │   └── index.ts
│   ├── interfaces/
│   │   ├── diagram-repository.interface.ts
│   │   ├── ai-provider.interface.ts
│   │   ├── translation-provider.interface.ts
│   │   └── index.ts
│   └── state/
│       ├── diagram.state.ts
│       ├── selection.state.ts
│       ├── undo-redo.manager.ts
│       └── index.ts
├── application/
│   ├── tokens.ts
│   ├── facades/
│   │   ├── diagram.facade.ts
│   │   └── index.ts
│   └── mappers/
│       ├── diagram.mapper.ts
│       ├── node.mapper.ts
│       └── index.ts
├── infrastructure/
│   ├── gateways/
│   │   ├── api.gateway.ts
│   │   └── index.ts
│   └── interceptors/
│       ├── error.interceptor.ts
│       └── index.ts
└── presentation/
    ├── layout/
    │   └── layout.component.ts / .html / .scss
    ├── toolbar/
    │   └── toolbar.component.ts / .html / .scss
    ├── canvas/
    │   └── canvas.component.ts / .html / .scss
    ├── sidebar/
    │   └── sidebar.component.ts / .html / .scss
    ├── editor/
    │   └── editor.component.ts / .html / .scss
    └── diagram-list/
        └── diagram-list.component.ts / .html / .scss
```

---

## Key Reference Files
- `03-data-models.md` — TypeScript interfaces (copy exactly)
- `05-angular-modules.md` — Full architecture, facade patterns, DI tokens, interface definitions
- `02-project-structure.md` — Canonical directory tree
- `backend/crates/nimbus-api/src/config.rs` — Backend port 8080, CORS origin localhost:4200

## Verification
1. `ng build` succeeds with zero errors
2. `ng serve` renders diagram list page at `http://localhost:4200/diagrams`
3. Navigating to `/diagrams/some-id` renders the editor layout with toolbar, canvas, and sidebar
4. Canvas element renders "Canvas Ready" placeholder text
