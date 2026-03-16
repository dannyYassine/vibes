import { CanvasContext, ViewportState } from './canvas-context';
import { GridRenderer } from './renderers/grid.renderer';
import { NodeRenderer } from './renderers/node.renderer';
import { EdgeRenderer } from './renderers/edge.renderer';
import { ZoomHandler } from './handlers/zoom.handler';
import { DragHandler } from './handlers/drag.handler';
import { SelectionHandler } from './handlers/selection.handler';
import { Diagram } from '../../domain/models/diagram.model';
import { DiagramNode } from '../../domain/models/node.model';
import { DiagramEdge } from '../../domain/models/edge.model';
import { Position } from '../../domain/models/node.model';

export class CanvasEngine implements CanvasContext {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  viewport: ViewportState = { x: 0, y: 0, zoom: 1 };

  private gridRenderer = new GridRenderer();
  private nodeRenderer = new NodeRenderer();
  private edgeRenderer = new EdgeRenderer();

  private zoomHandler!: ZoomHandler;
  private dragHandler!: DragHandler;
  private selectionHandler!: SelectionHandler;

  private nodes: DiagramNode[] = [];
  private edges: DiagramEdge[] = [];
  private selectedIds = new Set<string>();
  private renderRequested = false;
  private dpr = 1;

  // Callbacks
  onNodeMoved: ((id: string, position: Position) => void) | null = null;
  onSelectionChanged: ((ids: string[]) => void) | null = null;

  // Bound event listeners for cleanup
  private boundWheel: (e: WheelEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor() {
    this.boundWheel = this.handleWheel.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;

    this.zoomHandler = new ZoomHandler(this);
    this.dragHandler = new DragHandler(this, this.nodeRenderer, () => this.nodes);
    this.selectionHandler = new SelectionHandler(
      this, this.nodeRenderer, () => this.nodes, () => [...this.selectedIds],
    );

    this.dragHandler.onNodeMoved = (id, pos) => this.onNodeMoved?.(id, pos);
    this.selectionHandler.onSelectionChanged = (ids) => this.onSelectionChanged?.(ids);

    this.attachEvents();
  }

  destroy(): void {
    this.detachEvents();
  }

  resize(width: number, height: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.requestRender();
  }

  setDiagram(diagram: Diagram | null): void {
    if (!diagram) {
      this.nodes = [];
      this.edges = [];
    } else {
      this.nodes = diagram.nodes;
      this.edges = diagram.edges;
    }
    this.requestRender();
  }

  setSelectedNodeIds(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.requestRender();
  }

  // CanvasContext interface
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.viewport.x) / this.viewport.zoom,
      y: (screenY - this.viewport.y) / this.viewport.zoom,
    };
  }

  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: canvasX * this.viewport.zoom + this.viewport.x,
      y: canvasY * this.viewport.zoom + this.viewport.y,
    };
  }

  requestRender(): void {
    if (this.renderRequested) return;
    this.renderRequested = true;
    requestAnimationFrame(() => this.render());
  }

  private render(): void {
    this.renderRequested = false;
    const { ctx, canvas } = this;
    const w = canvas.width / this.dpr;
    const h = canvas.height / this.dpr;

    // Clear
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Apply viewport transform
    ctx.save();
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    // Draw in order: grid, edges, nodes
    this.gridRenderer.render(ctx, canvas, this.viewport);
    this.edgeRenderer.render(ctx, this.edges, this.nodes, this.selectedIds);
    this.nodeRenderer.render(ctx, this.nodes, this.selectedIds);

    ctx.restore();

    // Draw selection rect overlay in screen space
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.selectionHandler.renderSelectionRect(ctx);
  }

  // Event handling
  private attachEvents(): void {
    this.canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
  }

  private detachEvents(): void {
    this.canvas.removeEventListener('wheel', this.boundWheel);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
  }

  private handleWheel(event: WheelEvent): void {
    this.zoomHandler.onWheel(event);
  }

  private handleMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const canvasPos = this.screenToCanvas(screenX, screenY);
    const hitNode = this.nodeRenderer.hitTest(this.nodes, canvasPos.x, canvasPos.y);

    // Shift+drag on empty = selection rect
    if (event.shiftKey) {
      if (this.selectionHandler.onMouseDown(event)) return;
    }

    // Non-shift click on node or empty = drag (node drag or pan)
    if (this.dragHandler.onMouseDown(event, hitNode)) {
      // If clicking on a node without dragging, we'll handle selection on mouseUp
      if (hitNode && !this.selectedIds.has(hitNode.id) && !event.shiftKey) {
        this.selectionHandler.handleClick(hitNode, false);
      }
      this.updateCursor(hitNode);
      return;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.dragHandler.isDragging) {
      this.dragHandler.onMouseMove(event);
      this.updateCursorForMode();
      return;
    }

    this.selectionHandler.onMouseMove(event);

    // Update cursor on hover
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const canvasPos = this.screenToCanvas(screenX, screenY);
    const hitNode = this.nodeRenderer.hitTest(this.nodes, canvasPos.x, canvasPos.y);
    this.canvas.style.cursor = hitNode ? 'pointer' : 'default';
  }

  private handleMouseUp(event: MouseEvent): void {
    const wasDragging = this.dragHandler.isDragging;
    const wasMode = this.dragHandler.currentMode;

    this.dragHandler.onMouseUp();
    this.selectionHandler.onMouseUp();

    // If it was a click (not a drag), handle selection
    if (!wasDragging || wasMode === 'none') {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const canvasPos = this.screenToCanvas(screenX, screenY);
      const hitNode = this.nodeRenderer.hitTest(this.nodes, canvasPos.x, canvasPos.y);

      if (!event.shiftKey && !hitNode) {
        this.selectionHandler.handleClick(null, false);
      }
    }

    this.canvas.style.cursor = 'default';
  }

  private updateCursor(hitNode: DiagramNode | null): void {
    if (hitNode) {
      this.canvas.style.cursor = 'move';
    } else {
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private updateCursorForMode(): void {
    switch (this.dragHandler.currentMode) {
      case 'pan':
        this.canvas.style.cursor = 'grabbing';
        break;
      case 'node':
        this.canvas.style.cursor = 'move';
        break;
      default:
        this.canvas.style.cursor = 'default';
    }
  }
}
