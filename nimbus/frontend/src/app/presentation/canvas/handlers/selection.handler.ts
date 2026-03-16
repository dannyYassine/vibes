import { CanvasContext, SelectionRect } from '../canvas-context';
import { DiagramNode } from '../../../domain/models/node.model';
import { NodeRenderer } from '../renderers/node.renderer';

export class SelectionHandler {
  private selectionRect: SelectionRect | null = null;
  private isDragging = false;

  onSelectionChanged: ((ids: string[]) => void) | null = null;

  constructor(
    private context: CanvasContext,
    private nodeRenderer: NodeRenderer,
    private getNodes: () => DiagramNode[],
    private getSelectedIds: () => string[],
  ) {}

  /** Start a shift+drag selection rectangle */
  onMouseDown(event: MouseEvent): boolean {
    if (event.button !== 0 || !event.shiftKey) return false;

    const rect = this.context.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const canvasPos = this.context.screenToCanvas(screenX, screenY);

    // Check if shift-clicking a node (toggle)
    const hitNode = this.nodeRenderer.hitTest(this.getNodes(), canvasPos.x, canvasPos.y);
    if (hitNode) {
      const current = this.getSelectedIds();
      const idx = current.indexOf(hitNode.id);
      if (idx >= 0) {
        const next = [...current];
        next.splice(idx, 1);
        this.onSelectionChanged?.(next);
      } else {
        this.onSelectionChanged?.([...current, hitNode.id]);
      }
      return true;
    }

    // Start selection rect
    this.selectionRect = {
      startX: screenX,
      startY: screenY,
      endX: screenX,
      endY: screenY,
    };
    this.isDragging = true;
    return true;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.selectionRect) return;
    const rect = this.context.canvas.getBoundingClientRect();
    this.selectionRect.endX = event.clientX - rect.left;
    this.selectionRect.endY = event.clientY - rect.top;
    this.context.requestRender();
  }

  onMouseUp(): void {
    if (!this.isDragging || !this.selectionRect) {
      this.isDragging = false;
      return;
    }

    // Convert selection rect to canvas space
    const topLeft = this.context.screenToCanvas(
      Math.min(this.selectionRect.startX, this.selectionRect.endX),
      Math.min(this.selectionRect.startY, this.selectionRect.endY),
    );
    const bottomRight = this.context.screenToCanvas(
      Math.max(this.selectionRect.startX, this.selectionRect.endX),
      Math.max(this.selectionRect.startY, this.selectionRect.endY),
    );

    const hitNodes = this.nodeRenderer.hitTestRect(this.getNodes(), {
      x: topLeft.x,
      y: topLeft.y,
      w: bottomRight.x - topLeft.x,
      h: bottomRight.y - topLeft.y,
    });

    if (hitNodes.length > 0) {
      const current = this.getSelectedIds();
      const newIds = new Set([...current, ...hitNodes.map(n => n.id)]);
      this.onSelectionChanged?.([...newIds]);
    }

    this.selectionRect = null;
    this.isDragging = false;
    this.context.requestRender();
  }

  /** Handle click selection (non-shift, no drag) */
  handleClick(hitNode: DiagramNode | null, shiftKey: boolean): void {
    if (hitNode) {
      if (shiftKey) {
        const current = this.getSelectedIds();
        const idx = current.indexOf(hitNode.id);
        if (idx >= 0) {
          const next = [...current];
          next.splice(idx, 1);
          this.onSelectionChanged?.(next);
        } else {
          this.onSelectionChanged?.([...current, hitNode.id]);
        }
      } else {
        this.onSelectionChanged?.([hitNode.id]);
      }
    } else {
      this.onSelectionChanged?.([]);
    }
  }

  renderSelectionRect(ctx: CanvasRenderingContext2D): void {
    if (!this.selectionRect || !this.isDragging) return;

    const { startX, startY, endX, endY } = this.selectionRect;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(33, 150, 243, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
}
