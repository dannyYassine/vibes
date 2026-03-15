import { Diagram } from '../models/diagram.model';
import { DiagramNode, Position } from '../models/node.model';
import { DiagramEdge } from '../models/edge.model';
import { UndoRedoManager } from './undo-redo.manager';

export class DiagramState {
  private diagram: Diagram | null = null;
  private undoRedo = new UndoRedoManager<Diagram>();

  load(diagram: Diagram): void {
    this.diagram = diagram;
  }

  getDiagram(): Diagram | null {
    return this.diagram;
  }

  addNode(node: DiagramNode): Diagram {
    const current = this.diagram!;
    this.undoRedo.push(current);
    this.diagram = {
      ...current,
      nodes: [...current.nodes, node],
    };
    return this.diagram;
  }

  updateNode(id: string, changes: Partial<DiagramNode>): Diagram {
    const current = this.diagram!;
    this.undoRedo.push(current);
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
    this.undoRedo.push(current);
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
    this.undoRedo.push(current);
    this.diagram = {
      ...current,
      edges: [...current.edges, edge],
    };
    return this.diagram;
  }

  removeEdge(id: string): Diagram {
    const current = this.diagram!;
    this.undoRedo.push(current);
    this.diagram = {
      ...current,
      edges: current.edges.filter((e) => e.id !== id),
    };
    return this.diagram;
  }

  moveNode(id: string, position: Position): Diagram {
    const current = this.diagram!;
    this.undoRedo.push(current);
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
