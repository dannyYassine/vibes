import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, from } from 'rxjs';
import { debounceTime, filter, exhaustMap } from 'rxjs/operators';
import { Diagram, Viewport } from '../../domain/models/diagram.model';
import { DiagramNode, Position } from '../../domain/models/node.model';
import { DiagramEdge } from '../../domain/models/edge.model';
import { DiagramRepository } from '../../domain/interfaces/diagram-repository.interface';
import { DiagramState } from '../../domain/state/diagram.state';
import { SelectionState } from '../../domain/state/selection.state';
import { DIAGRAM_REPOSITORY } from '../tokens';

@Injectable({ providedIn: 'root' })
export class DiagramFacade {
  private diagramSubject = new BehaviorSubject<Diagram | null>(null);
  readonly diagram$ = this.diagramSubject.asObservable();

  private selectionSubject = new BehaviorSubject<string[]>([]);
  readonly selectedNodeIds$ = this.selectionSubject.asObservable();

  private selectedEdgeSubject = new BehaviorSubject<string[]>([]);
  readonly selectedEdgeIds$ = this.selectedEdgeSubject.asObservable();

  readonly isDirty$ = new BehaviorSubject<boolean>(false);

  private diagramState = new DiagramState();
  private selectionState = new SelectionState();

  private autoSave$ = new Subject<void>();
  private autoSaveSub: Subscription;
  private isSaving = false;

  constructor(
    @Inject(DIAGRAM_REPOSITORY) private repo: DiagramRepository,
  ) {
    this.autoSaveSub = this.autoSave$.pipe(
      debounceTime(2000),
      filter(() => this.isDirty$.value && !this.isSaving),
      exhaustMap(() => from(this.save())),
    ).subscribe();
  }

  getCurrentDiagramId(): string | null {
    const diagram = this.diagramState.getDiagram();
    return diagram?.id ?? null;
  }

  async loadDiagram(id: string): Promise<void> {
    const diagram = await this.repo.get(id);
    this.diagramState.load(diagram);
    this.diagramSubject.next(diagram);
  }

  ensureDiagram(): void {
    const diagram = this.diagramState.ensureDiagram();
    this.diagramSubject.next(diagram);
  }

  beginBatch(): void {
    this.diagramState.beginBatch();
  }

  endBatch(): void {
    this.diagramState.endBatch();
  }

  private markDirty(): void {
    this.isDirty$.next(true);
    this.autoSave$.next();
  }

  updateViewport(viewport: Viewport): void {
    this.diagramState.setViewport(viewport);
    this.diagramSubject.next(this.diagramState.getDiagram());
    this.markDirty();
  }

  addNode(node: DiagramNode): void {
    const updated = this.diagramState.addNode(node);
    this.diagramSubject.next(updated);
    this.markDirty();
  }

  updateNode(id: string, changes: Partial<DiagramNode>): void {
    const updated = this.diagramState.updateNode(id, changes);
    this.diagramSubject.next(updated);
    this.markDirty();
  }

  moveNode(id: string, position: Position): void {
    const updated = this.diagramState.moveNode(id, position);
    this.diagramSubject.next(updated);
    this.markDirty();
  }

  removeNode(id: string): void {
    const updated = this.diagramState.removeNode(id);
    this.diagramSubject.next(updated);
    this.markDirty();
  }

  addEdge(edge: DiagramEdge): void {
    const updated = this.diagramState.addEdge(edge);
    this.diagramSubject.next(updated);
    this.markDirty();
  }

  updateEdge(id: string, changes: Partial<DiagramEdge>): void {
    const diagram = this.diagramState.getDiagram();
    if (!diagram) return;
    const edge = diagram.edges.find(e => e.id === id);
    if (!edge) return;
    const updated = this.diagramState.updateEdge(id, changes);
    this.diagramSubject.next(updated);
    this.markDirty();
  }

  removeEdge(id: string): void {
    const updated = this.diagramState.removeEdge(id);
    this.diagramSubject.next(updated);
    this.markDirty();
  }

  selectNodes(ids: string[]): void {
    this.selectionState.selectNodes(ids);
    this.selectionSubject.next(this.selectionState.getSelectedNodeIds());
    // Clear edge selection when selecting nodes
    if (ids.length > 0) {
      this.selectedEdgeSubject.next([]);
    }
  }

  selectEdges(ids: string[]): void {
    this.selectionState.selectNodes([]);
    this.selectionSubject.next([]);
    this.selectedEdgeSubject.next(ids);
  }

  clearSelection(): void {
    this.selectionState.clearSelection();
    this.selectionSubject.next([]);
    this.selectedEdgeSubject.next([]);
  }

  undo(): void {
    const diagram = this.diagramState.undo();
    if (diagram) {
      this.diagramSubject.next(diagram);
      this.markDirty();
    }
  }

  redo(): void {
    const diagram = this.diagramState.redo();
    if (diagram) {
      this.diagramSubject.next(diagram);
      this.markDirty();
    }
  }

  getCurrentDiagram(): Diagram | null {
    return this.diagramState.getDiagram();
  }

  async createDiagram(name: string): Promise<Diagram> {
    return this.repo.create(name);
  }

  async updateDiagramRemote(id: string, changes: Partial<Diagram>): Promise<Diagram> {
    return this.repo.update(id, changes);
  }

  loadDiagramFromData(diagram: Diagram): void {
    this.diagramState.load(diagram);
    this.diagramSubject.next(diagram);
    this.isDirty$.next(false);
  }

  async save(): Promise<void> {
    if (this.isSaving) return;
    const diagram = this.diagramState.getDiagram();
    if (!diagram) return;
    this.isSaving = true;
    try {
      await this.repo.update(diagram.id, diagram);
      this.isDirty$.next(false);
    } catch {
      // Keep dirty on failure so auto-save retries
    } finally {
      this.isSaving = false;
    }
  }

  destroy(): void {
    this.autoSaveSub.unsubscribe();
    if (this.isDirty$.value && !this.isSaving) {
      this.save();
    }
  }
}
