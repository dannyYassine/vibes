import { NodeCategory } from '../../../domain/models/node.model';

const ICON_SIZE = 24;

export class IconRenderer {
  drawIcon(ctx: CanvasRenderingContext2D, category: NodeCategory, x: number, y: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (category) {
      case 'Compute':
        this.drawCompute(ctx, x, y);
        break;
      case 'Networking':
        this.drawNetworking(ctx, x, y);
        break;
      case 'Data':
        this.drawData(ctx, x, y);
        break;
      case 'Caching':
        this.drawCaching(ctx, x, y);
        break;
      case 'Messaging':
        this.drawMessaging(ctx, x, y);
        break;
      case 'Storage':
        this.drawStorage(ctx, x, y);
        break;
      case 'Security':
        this.drawSecurity(ctx, x, y);
        break;
      case 'Observability':
        this.drawObservability(ctx, x, y);
        break;
      case 'Group':
        this.drawGroup(ctx, x, y);
        break;
    }

    ctx.restore();
  }

  drawFallbackDot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.beginPath();
    ctx.arc(x + ICON_SIZE / 2, y + ICON_SIZE / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Server chip
  private drawCompute(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12;
    ctx.strokeRect(cx - 8, cy - 6, 16, 12);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.stroke();
    // Dots
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 4, cy + 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Globe
  private drawNetworking(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12, r = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.stroke();
    // Ellipse
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4, r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cylinder
  private drawData(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, 7, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 5);
    ctx.lineTo(cx - 7, cy + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 5);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 7, 3, 0, 0, Math.PI);
    ctx.stroke();
  }

  // Lightning bolt
  private drawCaching(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 8);
    ctx.lineTo(cx - 4, cy + 1);
    ctx.lineTo(cx + 1, cy + 1);
    ctx.lineTo(cx - 2, cy + 8);
    ctx.lineTo(cx + 4, cy - 1);
    ctx.lineTo(cx - 1, cy - 1);
    ctx.closePath();
    ctx.fill();
  }

  // Envelope
  private drawMessaging(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12;
    ctx.strokeRect(cx - 8, cy - 5, 16, 10);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 5);
    ctx.lineTo(cx, cy + 1);
    ctx.lineTo(cx + 8, cy - 5);
    ctx.stroke();
  }

  // Stacked discs
  private drawStorage(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12;
    for (let i = 0; i < 3; i++) {
      const ey = y + 7 + i * 5;
      ctx.beginPath();
      ctx.ellipse(cx, ey, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 7, y + 7);
    ctx.lineTo(cx - 7, y + 17);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 7, y + 7);
    ctx.lineTo(cx + 7, y + 17);
    ctx.stroke();
  }

  // Shield
  private drawSecurity(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 7, cy - 4);
    ctx.lineTo(cx + 7, cy + 2);
    ctx.quadraticCurveTo(cx + 7, cy + 8, cx, cy + 10);
    ctx.quadraticCurveTo(cx - 7, cy + 8, cx - 7, cy + 2);
    ctx.lineTo(cx - 7, cy - 4);
    ctx.closePath();
    ctx.stroke();
  }

  // Eye
  private drawObservability(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy);
    ctx.quadraticCurveTo(cx, cy - 7, cx + 9, cy);
    ctx.quadraticCurveTo(cx, cy + 7, cx - 9, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dashed rect
  private drawGroup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cx = x + 12, cy = y + 12;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(cx - 8, cy - 6, 16, 12);
    ctx.setLineDash([]);
  }
}
