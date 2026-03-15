import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Diagram } from '../../domain/models/diagram.model';
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

  updateNode(id: string, changes: Partial<DiagramNode>): void {
    const updated = this.diagramState.updateNode(id, changes);
    this.diagramSubject.next(updated);
    this.isDirty$.next(true);
  }

  moveNode(id: string, position: Position): void {
    const updated = this.diagramState.moveNode(id, position);
    this.diagramSubject.next(updated);
    this.isDirty$.next(true);
  }

  removeNode(id: string): void {
    const updated = this.diagramState.removeNode(id);
    this.diagramSubject.next(updated);
    this.isDirty$.next(true);
  }

  addEdge(edge: DiagramEdge): void {
    const updated = this.diagramState.addEdge(edge);
    this.diagramSubject.next(updated);
    this.isDirty$.next(true);
  }

  removeEdge(id: string): void {
    const updated = this.diagramState.removeEdge(id);
    this.diagramSubject.next(updated);
    this.isDirty$.next(true);
  }

  selectNodes(ids: string[]): void {
    this.selectionState.selectNodes(ids);
    this.selectionSubject.next(this.selectionState.getSelectedNodeIds());
  }

  clearSelection(): void {
    this.selectionState.clearSelection();
    this.selectionSubject.next([]);
  }

  undo(): void {
    const diagram = this.diagramState.undo();
    if (diagram) {
      this.diagramSubject.next(diagram);
      this.isDirty$.next(true);
    }
  }

  redo(): void {
    const diagram = this.diagramState.redo();
    if (diagram) {
      this.diagramSubject.next(diagram);
      this.isDirty$.next(true);
    }
  }

  async save(): Promise<void> {
    const diagram = this.diagramState.getDiagram();
    if (diagram) {
      await this.repo.update(diagram.id, diagram);
      this.isDirty$.next(false);
    }
  }
}
