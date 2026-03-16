import { DiagramNode, NodeCategory } from '../../../domain/models/node.model';
import { IconRenderer } from './icon.renderer';

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  Compute: '#89b4fa',
  Networking: '#a6e3a1',
  Data: '#cba6f7',
  Caching: '#fab387',
  Messaging: '#f9e2af',
  Storage: '#94e2d5',
  Security: '#f38ba8',
  Observability: '#89dceb',
  Group: '#6c7086',
};

const CORNER_RADIUS = 6;
const ICON_SIZE = 24;
const ICON_PADDING = 8;
const MIN_ZOOM_FOR_ICON = 0.4;

export class NodeRenderer {
  private iconRenderer = new IconRenderer();

  render(ctx: CanvasRenderingContext2D, nodes: DiagramNode[], selectedIds: Set<string>, warnedIds?: Set<string>): void {
    for (const node of nodes) {
      if (node.nodeType.category === 'Group') {
        this.drawGroupNode(ctx, node, selectedIds.has(node.id));
      } else {
        this.drawNode(ctx, node, selectedIds.has(node.id), warnedIds?.has(node.id) ?? false);
      }
    }
  }

  private drawGroupNode(ctx: CanvasRenderingContext2D, node: DiagramNode, selected: boolean): void {
    const { x, y } = node.position;
    const { width: w, height: h } = node.size;

    // Dashed border, semi-transparent fill
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, CORNER_RADIUS);
    ctx.fillStyle = 'rgba(49, 50, 68, 0.4)';
    ctx.fill();

    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = selected ? '#cba6f7' : '#6c7086';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Selection glow
    if (selected) {
      ctx.save();
      ctx.shadowColor = '#cba6f7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      this.roundRect(ctx, x, y, w, h, CORNER_RADIUS);
      ctx.strokeStyle = 'rgba(203, 166, 247, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Label at top-left
    ctx.fillStyle = '#cdd6f4';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label, x + ICON_PADDING, y + ICON_PADDING, w - ICON_PADDING * 2);
  }

  private drawNode(ctx: CanvasRenderingContext2D, node: DiagramNode, selected: boolean, warned: boolean): void {
    const { x, y } = node.position;
    const { width: w, height: h } = node.size;
    const color = CATEGORY_COLORS[node.nodeType.category] || '#6c7086';

    // Selection glow
    if (selected) {
      ctx.save();
      ctx.shadowColor = '#cba6f7';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      this.roundRect(ctx, x, y, w, h, CORNER_RADIUS);
      ctx.fillStyle = '#313244';
      ctx.fill();
      ctx.restore();
    }

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // Rounded rect fill
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, CORNER_RADIUS);
    ctx.fillStyle = '#313244';
    ctx.fill();
    ctx.restore();

    // Border
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, CORNER_RADIUS);
    ctx.strokeStyle = selected ? '#cba6f7' : '#45475a';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();

    // Icon or fallback dot
    const iconX = x + ICON_PADDING;
    const iconY = y + (h - ICON_SIZE) / 2;
    const currentZoom = ctx.getTransform().a; // approximate zoom from transform
    if (currentZoom >= MIN_ZOOM_FOR_ICON) {
      this.iconRenderer.drawIcon(ctx, node.nodeType.category, iconX, iconY, color);
    } else {
      this.iconRenderer.drawFallbackDot(ctx, iconX, iconY, color);
    }

    // Two-line label: primary label + component type
    const textX = x + ICON_PADDING + ICON_SIZE + ICON_PADDING;
    const maxTextWidth = w - (ICON_PADDING + ICON_SIZE + ICON_PADDING + ICON_PADDING);

    // Primary label
    ctx.fillStyle = '#cdd6f4';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, textX, y + h / 2 - 7, maxTextWidth);

    // Secondary label (component type)
    ctx.fillStyle = '#a6adc8';
    ctx.font = '11px sans-serif';
    ctx.fillText(node.nodeType.component, textX, y + h / 2 + 8, maxTextWidth);

    // Validation warning triangle
    if (warned) {
      this.drawWarningTriangle(ctx, x + w - 16, y + 4);
    }
  }

  private drawWarningTriangle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x + 10, y + 10);
    ctx.closePath();
    ctx.fillStyle = '#f9e2af';
    ctx.fill();
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Exclamation
    ctx.fillStyle = '#1e1e2e';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x + 5, y + 6.5);
    ctx.restore();
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
      if (x + nw >= rect.x && x <= rect.x + rect.w && y + nh >= rect.y && y <= rect.y + rect.h) {
        results.push(node);
      }
    }
    return results;
  }
}
