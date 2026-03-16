import { DiagramNode, NodeCategory } from '../../../domain/models/node.model';

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  Compute: '#2196F3',
  Networking: '#4CAF50',
  Data: '#9C27B0',
  Caching: '#FF9800',
  Messaging: '#FFEB3B',
  Storage: '#009688',
  Security: '#F44336',
  Observability: '#00BCD4',
  Group: '#9E9E9E',
};

const CORNER_RADIUS = 6;
const BADGE_SIZE = 8;
const BADGE_MARGIN = 8;

export class NodeRenderer {
  render(ctx: CanvasRenderingContext2D, nodes: DiagramNode[], selectedIds: Set<string>): void {
    for (const node of nodes) {
      this.drawNode(ctx, node, selectedIds.has(node.id));
    }
  }

  private drawNode(ctx: CanvasRenderingContext2D, node: DiagramNode, selected: boolean): void {
    const { x, y } = node.position;
    const { width: w, height: h } = node.size;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // Rounded rect
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, CORNER_RADIUS);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Border
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, CORNER_RADIUS);
    ctx.strokeStyle = selected ? '#2196F3' : '#cccccc';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();

    // Category color badge
    const color = CATEGORY_COLORS[node.nodeType.category] || '#9E9E9E';
    ctx.beginPath();
    ctx.arc(x + BADGE_MARGIN + BADGE_SIZE / 2, y + BADGE_MARGIN + BADGE_SIZE / 2, BADGE_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Label
    ctx.fillStyle = '#333333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, x + w / 2, y + h / 2, w - 16);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  hitTest(nodes: DiagramNode[], canvasX: number, canvasY: number): DiagramNode | null {
    // Reverse iteration for z-order (last drawn = on top)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const { x, y } = node.position;
      const { width: w, height: h } = node.size;
      if (canvasX >= x && canvasX <= x + w && canvasY >= y && canvasY <= y + h) {
        return node;
      }
    }
    return null;
  }

  hitTestRect(nodes: DiagramNode[], rect: { x: number; y: number; w: number; h: number }): DiagramNode[] {
    const results: DiagramNode[] = [];
    for (const node of nodes) {
      const { x, y } = node.position;
      const { width: nw, height: nh } = node.size;
      // Intersection test
      if (x + nw >= rect.x && x <= rect.x + rect.w && y + nh >= rect.y && y <= rect.y + rect.h) {
        results.push(node);
      }
    }
    return results;
  }
}
