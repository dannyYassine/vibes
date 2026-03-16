import { CanvasContext } from '../canvas-context';
import { DiagramNode, Position } from '../../../domain/models/node.model';
import { NodeRenderer } from '../renderers/node.renderer';

type DragMode = 'none' | 'pan' | 'node';

export class DragHandler {
  private mode: DragMode = 'none';
  private lastScreenX = 0;
  private lastScreenY = 0;
  private draggedNodeId: string | null = null;
  private dragStartPos: Position | null = null;
  private hasMoved = false;

  onNodeMoved: ((id: string, position: Position) => void) | null = null;

  constructor(
    private context: CanvasContext,
    private nodeRenderer: NodeRenderer,
    private getNodes: () => DiagramNode[],
  ) {}

  get isDragging(): boolean {
    return this.mode !== 'none';
  }

  get currentMode(): DragMode {
    return this.mode;
  }

  onMouseDown(event: MouseEvent, hitNode: DiagramNode | null): boolean {
    if (event.button !== 0) return false;

    this.lastScreenX = event.clientX;
    this.lastScreenY = event.clientY;
    this.hasMoved = false;

    if (hitNode && !event.shiftKey) {
      this.mode = 'node';
      this.draggedNodeId = hitNode.id;
      this.dragStartPos = { ...hitNode.position };
      return true;
    }

    if (!event.shiftKey) {
      this.mode = 'pan';
      return true;
    }

    return false;
  }

  onMouseMove(event: MouseEvent): void {
    const dx = event.clientX - this.lastScreenX;
    const dy = event.clientY - this.lastScreenY;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.hasMoved = true;
    }

    if (this.mode === 'pan') {
      this.context.viewport.x += dx;
      this.context.viewport.y += dy;
      this.lastScreenX = event.clientX;
      this.lastScreenY = event.clientY;
      this.context.requestRender();
    } else if (this.mode === 'node' && this.draggedNodeId) {
      const canvasDx = dx / this.context.viewport.zoom;
      const canvasDy = dy / this.context.viewport.zoom;

      // Update node position locally
      const nodes = this.getNodes();
      const node = nodes.find(n => n.id === this.draggedNodeId);
      if (node) {
        node.position.x += canvasDx;
        node.position.y += canvasDy;
      }

      this.lastScreenX = event.clientX;
      this.lastScreenY = event.clientY;
      this.context.requestRender();
    }
  }

  onMouseUp(): void {
    if (this.mode === 'node' && this.draggedNodeId && this.hasMoved) {
      const nodes = this.getNodes();
      const node = nodes.find(n => n.id === this.draggedNodeId);
      if (node && this.onNodeMoved) {
        this.onNodeMoved(this.draggedNodeId, { ...node.position });
      }
    }

    this.mode = 'none';
    this.draggedNodeId = null;
    this.dragStartPos = null;
  }
}
