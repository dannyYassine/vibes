# Nimbus — Angular Architecture (Clean Architecture)

## Layer Overview

The frontend follows clean architecture with four layers. Dependencies point inward: Presentation → Application → Domain ← Infrastructure.

```
┌─────────────────────────────────────────────────┐
│  Presentation (Angular Components)              │
│  CanvasComponent, SidebarComponent, ChatComponent│
└────────────────────┬────────────────────────────┘
                     │ calls
┌────────────────────┴────────────────────────────┐
│  Application (Facades)                          │
│  DiagramFacade, AiFacade, ExportFacade           │
└────────────────────┬────────────────────────────┘
                     │ uses
┌────────────────────┴────────────────────────────┐
│  Domain (Pure TypeScript)                       │
│  Models, Interfaces, State, UndoRedoManager      │
└────────────────────┬────────────────────────────┘
                     ↑ implements
┌────────────────────┴────────────────────────────┐
│  Infrastructure (I/O)                           │
│  ApiGateway, SseClient, LocalStorageAdapter      │
└─────────────────────────────────────────────────┘
```

---

## Domain Layer (`app/domain/`)

Framework-agnostic. No Angular imports. No RxJS. Pure TypeScript.

### Models (`domain/models/`)
TypeScript interfaces for Diagram, Node, Edge, Position, Size, etc. (see `03-data-models.md`).

### Interfaces (`domain/interfaces/`)

```typescript
// domain/interfaces/diagram-repository.interface.ts
export interface DiagramRepository {
  list(): Promise<DiagramListItem[]>;
  get(id: string): Promise<Diagram>;
  create(name: string, description?: string): Promise<Diagram>;
  update(id: string, changes: Partial<Diagram>): Promise<Diagram>;
  delete(id: string): Promise<void>;
}

// domain/interfaces/ai-provider.interface.ts
export interface AiProvider {
  generate(prompt: string): AsyncIterable<GenerateEvent>;
  modify(diagramId: string, prompt: string, selectedNodeIds: string[]): AsyncIterable<GenerateEvent>;
}

// domain/interfaces/translation-provider.interface.ts
export interface TranslationProvider {
  translate(diagramId: string, provider: CloudProvider): Promise<Diagram>;
  clearTranslation(diagramId: string): Promise<Diagram>;
  exportTerraform(diagramId: string): Promise<TerraformExportResponse>;
}

// domain/interfaces/validation-provider.interface.ts
export interface ValidationProvider {
  validate(diagramId: string): Promise<ValidationResult>;
  fix(diagramId: string, warningId: string, rule: string, message: string): AsyncIterable<GenerateEvent>;
}
```

### State (`domain/state/`)

```typescript
// domain/state/diagram.state.ts
// Pure business state — no Angular, no RxJS
export class DiagramState {
  private diagram: Diagram | null = null;
  private undoRedo = new UndoRedoManager<Diagram>();

  getDiagram(): Diagram | null { return this.diagram; }
  addNode(node: DiagramNode): Diagram { /* returns new state */ }
  updateNode(id: string, changes: Partial<DiagramNode>): Diagram { /* ... */ }
  removeNode(id: string): Diagram { /* ... */ }
  addEdge(edge: DiagramEdge): Diagram { /* ... */ }
  removeEdge(id: string): Diagram { /* ... */ }
  moveNode(id: string, position: Position): Diagram { /* ... */ }
  undo(): Diagram | null { /* ... */ }
  redo(): Diagram | null { /* ... */ }
}

// domain/state/selection.state.ts
export class SelectionState {
  private selectedNodeIds: Set<string> = new Set();
  private selectedEdgeIds: Set<string> = new Set();

  selectNodes(ids: string[]): void { /* ... */ }
  toggleNode(id: string): void { /* ... */ }
  clearSelection(): void { /* ... */ }
  getSelectedNodeIds(): string[] { /* ... */ }
  getSelectedEdgeIds(): string[] { /* ... */ }
}

// domain/state/undo-redo.manager.ts
export class UndoRedoManager<T> {
  private past: T[] = [];
  private future: T[] = [];

  push(state: T): void { /* ... */ }
  undo(current: T): T | null { /* ... */ }
  redo(current: T): T | null { /* ... */ }
  canUndo(): boolean { /* ... */ }
  canRedo(): boolean { /* ... */ }
}
```

---

## Application Layer (`app/application/`)

Orchestrates domain + infrastructure. Uses Angular DI to receive infrastructure implementations.

### Facades (`application/facades/`)

```typescript
// application/facades/diagram.facade.ts
@Injectable({ providedIn: 'root' })
export class DiagramFacade {
  // RxJS lives here — bridges domain state → observable streams for components
  private diagramSubject = new BehaviorSubject<Diagram | null>(null);
  readonly diagram$ = this.diagramSubject.asObservable();

  private selectionSubject = new BehaviorSubject<string[]>([]);
  readonly selectedNodeIds$ = this.selectionSubject.asObservable();

  readonly isDirty$ = new BehaviorSubject<boolean>(false);

  private diagramState = new DiagramState();
  private selectionState = new SelectionState();

  constructor(
    @Inject(DIAGRAM_REPOSITORY) private repo: DiagramRepository,
  ) {}

  async loadDiagram(id: string): Promise<void> {
    const diagram = await this.repo.get(id);
    this.diagramState.load(diagram);
    this.diagramSubject.next(diagram);
  }

  addNode(node: DiagramNode): void {
    const updated = this.diagramState.addNode(node);
    this.diagramSubject.next(updated);
    this.isDirty$.next(true);
  }

  moveNode(id: string, position: Position): void { /* ... */ }
  removeNode(id: string): void { /* ... */ }
  selectNodes(ids: string[]): void { /* ... */ }
  undo(): void { /* ... */ }
  redo(): void { /* ... */ }

  async save(): Promise<void> {
    const diagram = this.diagramState.getDiagram();
    if (diagram) {
      await this.repo.update(diagram.id, diagram);
      this.isDirty$.next(false);
    }
  }
}
```

```typescript
// application/facades/ai.facade.ts
@Injectable({ providedIn: 'root' })
export class AiFacade {
  readonly isGenerating$ = new BehaviorSubject<boolean>(false);

  constructor(
    @Inject(AI_PROVIDER) private aiProvider: AiProvider,
    private diagramFacade: DiagramFacade,
  ) {}

  async generate(prompt: string): Promise<void> {
    this.isGenerating$.next(true);
    try {
      for await (const event of this.aiProvider.generate(prompt)) {
        this.applyEvent(event);
      }
    } finally {
      this.isGenerating$.next(false);
    }
  }

  private applyEvent(event: GenerateEvent): void {
    switch (event.eventType) {
      case 'node_added': this.diagramFacade.addNode(event.data); break;
      case 'edge_added': this.diagramFacade.addEdge(event.data); break;
      // ...
    }
  }
}
```

```typescript
// application/facades/translation.facade.ts
@Injectable({ providedIn: 'root' })
export class TranslationFacade {
  readonly activeProvider$ = new BehaviorSubject<CloudProvider | null>(null);

  constructor(
    @Inject(TRANSLATION_PROVIDER) private translationProvider: TranslationProvider,
    private diagramFacade: DiagramFacade,
  ) {}

  async translateTo(provider: CloudProvider): Promise<void> {
    const diagram = await this.translationProvider.translate(
      this.diagramFacade.getCurrentDiagramId()!, provider
    );
    this.diagramFacade.loadFromDiagram(diagram);
    this.activeProvider$.next(provider);
  }

  async clearTranslation(): Promise<void> {
    const diagram = await this.translationProvider.clearTranslation(
      this.diagramFacade.getCurrentDiagramId()!
    );
    this.diagramFacade.loadFromDiagram(diagram);
    this.activeProvider$.next(null);
  }
}
```

```typescript
// application/facades/validation.facade.ts
@Injectable({ providedIn: 'root' })
export class ValidationFacade {
  readonly validationResult$ = new BehaviorSubject<ValidationResult | null>(null);
  readonly isFixing$ = new BehaviorSubject<boolean>(false);

  constructor(
    @Inject(VALIDATION_PROVIDER) private validationProvider: ValidationProvider,
    private diagramFacade: DiagramFacade,
  ) {}

  async validate(): Promise<void> {
    const result = await this.validationProvider.validate(
      this.diagramFacade.getCurrentDiagramId()!
    );
    this.validationResult$.next(result);
  }

  async fixWithAi(warningId: string, rule: string, message: string): Promise<void> {
    this.isFixing$.next(true);
    try {
      for await (const event of this.validationProvider.fix(
        this.diagramFacade.getCurrentDiagramId()!, warningId, rule, message
      )) {
        this.diagramFacade.applyEvent(event);
      }
    } finally {
      this.isFixing$.next(false);
    }
  }
}
```

```typescript
// application/facades/export.facade.ts
@Injectable({ providedIn: 'root' })
export class ExportFacade {
  constructor(
    private diagramFacade: DiagramFacade,
    @Inject(TRANSLATION_PROVIDER) private translationProvider: TranslationProvider,
  ) {}

  exportPng(canvas: HTMLCanvasElement, filename: string): void { /* ... */ }
  exportJson(): void { /* ... */ }

  async exportTerraform(): Promise<void> {
    const result = await this.translationProvider.exportTerraform(
      this.diagramFacade.getCurrentDiagramId()!
    );
    // Trigger download of terraform files as zip
  }

  async exportDockerCompose(): Promise<void> {
    const result = await this.repo.exportDockerCompose(
      this.diagramFacade.getCurrentDiagramId()!
    );
    // Trigger download of docker-compose.yml
  }
}
```

### DI Tokens (`application/tokens.ts`)

```typescript
export const DIAGRAM_REPOSITORY = new InjectionToken<DiagramRepository>('DiagramRepository');
export const AI_PROVIDER = new InjectionToken<AiProvider>('AiProvider');
export const TRANSLATION_PROVIDER = new InjectionToken<TranslationProvider>('TranslationProvider');
export const VALIDATION_PROVIDER = new InjectionToken<ValidationProvider>('ValidationProvider');
```

### Mappers (`application/mappers/`)
Transform between API DTOs (camelCase JSON from backend) and domain entities.

---

## Infrastructure Layer (`app/infrastructure/`)

Implements domain interfaces. Contains all external I/O.

### Gateways (`infrastructure/gateways/`)

```typescript
// infrastructure/gateways/api.gateway.ts
@Injectable()
export class ApiGateway implements DiagramRepository {
  constructor(private http: HttpClient) {}

  async list(): Promise<DiagramListItem[]> {
    return firstValueFrom(this.http.get<DiagramListItem[]>('/api/diagrams'));
  }
  async get(id: string): Promise<Diagram> { /* ... */ }
  async create(name: string): Promise<Diagram> { /* ... */ }
  async update(id: string, changes: Partial<Diagram>): Promise<Diagram> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
}

// infrastructure/gateways/sse.client.ts
@Injectable()
export class SseClient implements AiProvider {
  async *generate(prompt: string): AsyncIterable<GenerateEvent> {
    const response = await fetch('/api/diagrams/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const reader = response.body!.getReader();
    // Parse SSE stream, yield GenerateEvent objects
  }
}

// infrastructure/gateways/translation.gateway.ts
@Injectable()
export class TranslationGateway implements TranslationProvider {
  constructor(private http: HttpClient) {}

  async translate(diagramId: string, provider: CloudProvider): Promise<Diagram> {
    return firstValueFrom(
      this.http.post<Diagram>(`/api/diagrams/${diagramId}/translate`, { provider })
    );
  }
  async clearTranslation(diagramId: string): Promise<Diagram> {
    return firstValueFrom(
      this.http.delete<Diagram>(`/api/diagrams/${diagramId}/translate`)
    );
  }
  async exportTerraform(diagramId: string): Promise<TerraformExportResponse> {
    return firstValueFrom(
      this.http.get<TerraformExportResponse>(`/api/diagrams/${diagramId}/export/terraform`)
    );
  }
}
```

### Wiring (in `app.config.ts`)

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: DIAGRAM_REPOSITORY, useClass: ApiGateway },
    { provide: AI_PROVIDER, useClass: SseClient },
    { provide: TRANSLATION_PROVIDER, useClass: TranslationGateway },
    { provide: VALIDATION_PROVIDER, useClass: ValidationGateway },
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideRouter(routes),
  ],
};
```

---

## Presentation Layer (`app/presentation/`)

Thin Angular components. No business logic — delegate to facades.

### Canvas Feature

#### `CanvasComponent` (smart component)
```
Selector: app-canvas
Responsibilities:
  - Initialize HTML5 Canvas context
  - Set up render loop (requestAnimationFrame)
  - Delegate to renderer and handler classes
  - Subscribe to DiagramFacade.diagram$ for re-renders
  - Forward mouse/keyboard events to handlers
```

#### Renderer Classes (plain TypeScript, not components)

**`NodeRenderer`** — Draws nodes: icon, label, border, selection highlight. Hit-testing.
**`EdgeRenderer`** — Draws edges: arrows, labels, elbow routing. Hit-testing.
**`GridRenderer`** — Background grid, adjusts density per zoom level.

#### Handler Classes (plain TypeScript, not components)

**`DragHandler`** — Node dragging, snap-to-grid, canvas panning. Calls `DiagramFacade.moveNode()`.
**`ZoomHandler`** — Scroll zoom, pinch-to-zoom, zoom bounds (0.1x–3.0x).
**`SelectionHandler`** — Click, shift-click, drag-rectangle. Calls `DiagramFacade.selectNodes()`.

### Sidebar Feature

#### `SidebarComponent` — Tabbed panel (Properties | Services). Subscribes to `DiagramFacade.selectedNodeIds$`.
#### `PropertiesPanelComponent` — Edit node label/type/config. Calls `DiagramFacade.updateNode()`.
#### `ServiceLibraryComponent` — Categorized list of generic architecture components (Compute, Networking, Data, Messaging, etc.). When a cloud provider is active, shows provider-specific names alongside generic names. Drag to canvas.

### Chat Feature

#### `ChatComponent` — Text input + message list. Calls `AiFacade.generate()`. Subscribes to `AiFacade.isGenerating$`.

### Toolbar Feature

#### `ProviderSelectorComponent`
- Dropdown/button group: Generic | AWS | GCP | Azure
- Clicking a provider triggers `TranslationFacade.translateTo(provider)`
- Clicking "Generic" triggers `TranslationFacade.clearTranslation()`
- Shows current active provider with provider icon/color
- "Export Terraform" button (enabled only when a provider is active)

#### `ToolbarComponent` — Diagram name, Save/Export/Undo/Redo buttons, Validate button, zoom controls, provider selector. Calls facade methods. Validate button triggers `ValidationFacade.validate()` and opens a validation results panel.

## Shared Components (`app/shared/`)

- **ToastComponent** — Floating notifications (success, error, info)
- **ConfirmDialogComponent** — Modal for destructive actions

## Routing

```typescript
export const routes: Routes = [
  { path: '', redirectTo: 'diagrams', pathMatch: 'full' },
  { path: 'diagrams', loadComponent: () => import('./presentation/diagram-list/diagram-list.component') },
  { path: 'diagrams/:id', loadComponent: () => import('./presentation/editor/editor.component') },
];
```

## State Flow

```
User Action → Handler → DiagramFacade → DiagramState (domain) → BehaviorSubject → Canvas re-render
                                       → Auto-save (debounced)

AI Generation → AiFacade → SseClient (infra) → DiagramFacade → DiagramState → Canvas re-render
```
