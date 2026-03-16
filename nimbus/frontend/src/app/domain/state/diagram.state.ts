import { Diagram } from '../models/diagram.model';
import { DiagramNode, Position } from '../models/node.model';
import { DiagramEdge } from '../models/edge.model';
import { UndoRedoManager } from './undo-redo.manager';

export class DiagramState {
  private diagram: Diagram | null = null;
  private undoRedo = new UndoRedoManager<Diagram>();
  private batchMode = false;
  private batchSnapshot: Diagram | null = null;

  load(diagram: Diagram): void {
    this.diagram = diagram;
  }

  getDiagram(): Diagram | null {
    return this.diagram;
  }

  ensureDiagram(): Diagram {
    if (!this.diagram) {
      this.diagram = {
        id: '',
        name: '',
        description: '',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return this.diagram;
  }

  beginBatch(): void {
    this.batchSnapshot = this.diagram ? { ...this.diagram } : null;
    this.batchMode = true;
  }

  endBatch(): void {
    if (this.batchSnapshot) {
      this.undoRedo.push(this.batchSnapshot);
    }
    this.batchMode = false;
    this.batchSnapshot = null;
  }

  private pushUndo(current: Diagram): void {
    if (!this.batchMode) {
      this.undoRedo.push(current);
    }
  }

  addNode(node: DiagramNode): Diagram {
    const current = this.diagram!;
    this.pushUndo(current);
    this.diagram = {
      ...current,
      nodes: [...current.nodes, node],
    };
    return this.diagram;
  }

  updateNode(id: string, changes: Partial<DiagramNode>): Diagram {
    const current = this.diagram!;
    this.pushUndo(current);
    this.diagram = {
      ...current,
      nodes: current.nodes.map((n) =>
        n.id === id ? { ...n, ...changes } : n
      ),
    };
    return this.diagram;
  }

  removeNode(id: string): Diagram {
    const current = this.diagram!;
    this.pushUndo(current);
    this.diagram = {
      ...current,
      nodes: current.nodes.filter((n) => n.id !== id),
      edges: current.edges.filter(
        (e) => e.sourceId !== id && e.targetId !== id
      ),
    };
    return this.diagram;
  }

  addEdge(edge: DiagramEdge): Diagram {
    const current = this.diagram!;
    this.pushUndo(current);
    this.diagram = {
      ...current,
      edges: [...current.edges, edge],
    };
    return this.diagram;
  }

  removeEdge(id: string): Diagram {
    const current = this.diagram!;
    this.pushUndo(current);
    this.diagram = {
      ...current,
      edges: current.edges.filter((e) => e.id !== id),
    };
    return this.diagram;
  }

  moveNode(id: string, position: Position): Diagram {
    const current = this.diagram!;
    this.pushUndo(current);
    this.diagram = {
      ...current,
      nodes: current.nodes.map((n) =>
        n.id === id ? { ...n, position } : n
      ),
    };
    return this.diagram;
  }

  undo(): Diagram | null {
    if (!this.diagram) return null;
    const prev = this.undoRedo.undo(this.diagram);
    if (prev) this.diagram = prev;
    return this.diagram;
  }

  redo(): Diagram | null {
    if (!this.diagram) return null;
    const next = this.undoRedo.redo(this.diagram);
    if (next) this.diagram = next;
    return this.diagram;
  }

  canUndo(): boolean {
    return this.undoRedo.canUndo();
  }

  canRedo(): boolean {
    return this.undoRedo.canRedo();
  }
}
