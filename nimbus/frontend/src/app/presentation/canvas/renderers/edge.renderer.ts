import { DiagramEdge, EdgeType } from '../../../domain/models/edge.model';
import { DiagramNode } from '../../../domain/models/node.model';

interface EdgeStyle {
  color: string;
  dash: number[];
}

const EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  Synchronous: { color: '#555555', dash: [] },
  Asynchronous: { color: '#888888', dash: [6, 4] },
  DataFlow: { color: '#4CAF50', dash: [] },
  Dependency: { color: '#999999', dash: [2, 3] },
};

const ARROW_SIZE = 10;

export class EdgeRenderer {
  render(ctx: CanvasRenderingContext2D, edges: DiagramEdge[], nodes: DiagramNode[], selectedNodeIds: Set<string>, selectedEdgeIds?: Set<string>): void {
    const nodeMap = new Map<string, DiagramNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) continue;
      this.drawEdge(ctx, edge, source, target, selectedNodeIds, selectedEdgeIds);
    }
  }

  private drawEdge(
    ctx: CanvasRenderingContext2D,
    edge: DiagramEdge,
    source: DiagramNode,
    target: DiagramNode,
    selectedNodeIds: Set<string>,
    selectedEdgeIds?: Set<string>,
  ): void {
    const sx = source.position.x + source.size.width / 2;
    const sy = source.position.y + source.size.height / 2;
    const tx = target.position.x + target.size.width / 2;
    const ty = target.position.y + target.size.height / 2;

    // Clip line at node boundaries
    const sourceClip = this.clipAtNodeBoundary(sx, sy, tx, ty, source);
    const targetClip = this.clipAtNodeBoundary(tx, ty, sx, sy, target);

    const style = EDGE_STYLES[edge.edgeType] || EDGE_STYLES['Synchronous'];
    const isConnected = selectedNodeIds.has(edge.sourceId) || selectedNodeIds.has(edge.targetId);
    const isEdgeSelected = selectedEdgeIds?.has(edge.id) ?? false;

    ctx.save();
    ctx.strokeStyle = isEdgeSelected ? '#cba6f7' : style.color;
    ctx.lineWidth = isEdgeSelected ? 3 : isConnected ? 2 : 1.5;
    ctx.setLineDash(style.dash);

    ctx.beginPath();
    ctx.moveTo(sourceClip.x, sourceClip.y);
    ctx.lineTo(targetClip.x, targetClip.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Arrowhead at target
    this.drawArrowhead(ctx, sourceClip.x, sourceClip.y, targetClip.x, targetClip.y, style.color);

    // Arrowhead at source if bidirectional
    if (edge.properties.bidirectional) {
      this.drawArrowhead(ctx, targetClip.x, targetClip.y, sourceClip.x, sourceClip.y, style.color);
    }

    // Label at midpoint
    if (edge.label) {
      const mx = (sourceClip.x + targetClip.x) / 2;
      const my = (sourceClip.y + targetClip.y) / 2;
      this.drawLabel(ctx, edge.label, mx, my);
    }

    ctx.restore();
  }

  private clipAtNodeBoundary(
    fromX: number, fromY: number,
    toX: number, toY: number,
    node: DiagramNode,
  ): { x: number; y: number } {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (dx === 0 && dy === 0) return { x: fromX, y: fromY };

    const hw = node.size.width / 2;
    const hh = node.size.height / 2;

    // Find intersection with rect edge
    let t = 1;
    if (dx !== 0) {
      const tx = hw / Math.abs(dx);
      t = Math.min(t, tx);
    }
    if (dy !== 0) {
      const ty = hh / Math.abs(dy);
      t = Math.min(t, ty);
    }

    return { x: fromX + dx * t, y: fromY + dy * t };
  }

  private drawArrowhead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - ARROW_SIZE * Math.cos(angle - Math.PI / 6), toY - ARROW_SIZE * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - ARROW_SIZE * Math.cos(angle + Math.PI / 6), toY - ARROW_SIZE * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  private drawLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number): void {
    ctx.font = '12px sans-serif';
    const metrics = ctx.measureText(label);
    const pw = 6;
    const ph = 3;
    const tw = metrics.width;

    // White pill background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const rx = x - tw / 2 - pw;
    const ry = y - 7 - ph;
    const rw = tw + pw * 2;
    const rh = 14 + ph * 2;
    const r = rh / 2;
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
    ctx.lineTo(rx + r, ry + rh);
    ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
    ctx.lineTo(rx, ry + r);
    ctx.arcTo(rx, ry, rx + r, ry, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label text
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }

  hitTest(edges: DiagramEdge[], nodes: DiagramNode[], canvasX: number, canvasY: number, tolerance = 5): DiagramEdge | null {
    const nodeMap = new Map<string, DiagramNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) continue;

      const sx = source.position.x + source.size.width / 2;
      const sy = source.position.y + source.size.height / 2;
      const tx = target.position.x + target.size.width / 2;
      const ty = target.position.y + target.size.height / 2;

      const dist = this.pointToSegmentDistance(canvasX, canvasY, sx, sy, tx, ty);
      if (dist <= tolerance) return edge;
    }
    return null;
  }

  private pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return Math.hypot(px - projX, py - projY);
  }
}
