import { CanvasContext } from '../canvas-context';

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export interface PortHit {
  nodeId: string;
  side: PortSide;
}

export interface EdgeCreatedEvent {
  sourceId: string;
  targetId: string;
}

export class EdgeCreationHandler {
  private sourceNodeId: string | null = null;
  private sourcePort: PortSide | null = null;
  private currentMouseX = 0;
  private currentMouseY = 0;
  private active = false;

  onEdgeCreated: ((event: EdgeCreatedEvent) => void) | null = null;

  constructor(private context: CanvasContext) {}

  get isCreating(): boolean {
    return this.active;
  }

  onMouseDown(portHit: PortHit): boolean {
    this.sourceNodeId = portHit.nodeId;
    this.sourcePort = portHit.side;
    this.active = true;
    return true;
  }

  onMouseMove(screenX: number, screenY: number): void {
    if (!this.active) return;
    const pos = this.context.screenToCanvas(screenX, screenY);
    this.currentMouseX = pos.x;
    this.currentMouseY = pos.y;
    this.context.requestRender();
  }

  onMouseUp(targetPortHit: PortHit | null): void {
    if (!this.active) return;

    if (targetPortHit && targetPortHit.nodeId !== this.sourceNodeId) {
      this.onEdgeCreated?.({
        sourceId: this.sourceNodeId!,
        targetId: targetPortHit.nodeId,
      });
    }

    this.active = false;
    this.sourceNodeId = null;
    this.sourcePort = null;
    this.context.requestRender();
  }

  cancel(): void {
    this.active = false;
    this.sourceNodeId = null;
    this.sourcePort = null;
    this.context.requestRender();
  }

  getSourcePortPosition(nodes: { id: string; position: { x: number; y: number }; size: { width: number; height: number } }[]): { x: number; y: number } | null {
    if (!this.sourceNodeId || !this.sourcePort) return null;
    const node = nodes.find(n => n.id === this.sourceNodeId);
    if (!node) return null;
    return getPortPosition(node, this.sourcePort);
  }

  renderPreview(ctx: CanvasRenderingContext2D, nodes: { id: string; position: { x: number; y: number }; size: { width: number; height: number } }[]): void {
    if (!this.active) return;
    const sourcePos = this.getSourcePortPosition(nodes);
    if (!sourcePos) return;

    ctx.save();
    ctx.strokeStyle = '#cba6f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(sourcePos.x, sourcePos.y);
    ctx.lineTo(this.currentMouseX, this.currentMouseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

export function getPortPosition(
  node: { position: { x: number; y: number }; size: { width: number; height: number } },
  side: PortSide,
): { x: number; y: number } {
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;
  switch (side) {
    case 'top': return { x: x + w / 2, y };
    case 'right': return { x: x + w, y: y + h / 2 };
    case 'bottom': return { x: x + w / 2, y: y + h };
    case 'left': return { x, y: y + h / 2 };
  }
}

const PORT_RADIUS = 5;
const PORT_HIT_RADIUS = 8;

export function drawPorts(
  ctx: CanvasRenderingContext2D,
  node: { position: { x: number; y: number }; size: { width: number; height: number } },
  color: string,
): void {
  const sides: PortSide[] = ['top', 'right', 'bottom', 'left'];
  for (const side of sides) {
    const pos = getPortPosition(node, side);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, PORT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function hitTestPort(
  nodes: { id: string; position: { x: number; y: number }; size: { width: number; height: number } }[],
  canvasX: number,
  canvasY: number,
  visibleNodeIds: Set<string>,
): PortHit | null {
  const sides: PortSide[] = ['top', 'right', 'bottom', 'left'];
  for (const node of nodes) {
    if (!visibleNodeIds.has(node.id)) continue;
    for (const side of sides) {
      const pos = getPortPosition(node, side);
      const dx = canvasX - pos.x;
      const dy = canvasY - pos.y;
      if (dx * dx + dy * dy <= PORT_HIT_RADIUS * PORT_HIT_RADIUS) {
        return { nodeId: node.id, side };
      }
    }
  }
  return null;
}
