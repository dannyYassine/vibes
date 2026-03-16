import { ViewportState } from '../canvas-context';

const BASE_GRID = 20;
const MAJOR_EVERY = 5;

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, viewport: ViewportState): void {
    const { x: vx, y: vy, zoom } = viewport;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    // Visible bounds in canvas-space
    const left = -vx / zoom;
    const top = -vy / zoom;
    const right = left + w / zoom;
    const bottom = top + h / zoom;

    if (zoom >= 0.2) {
      const step = zoom >= 0.4 ? BASE_GRID : BASE_GRID * MAJOR_EVERY;
      const startX = Math.floor(left / step) * step;
      const startY = Math.floor(top / step) * step;

      // Minor lines (only if zoom >= 0.4 and step is BASE_GRID)
      if (zoom >= 0.4) {
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        for (let x = startX; x <= right; x += step) {
          if (x % (BASE_GRID * MAJOR_EVERY) === 0) continue;
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
        }
        for (let y = startY; y <= bottom; y += step) {
          if (y % (BASE_GRID * MAJOR_EVERY) === 0) continue;
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
        }
        ctx.stroke();
      }

      // Major lines
      const majorStep = BASE_GRID * MAJOR_EVERY;
      const majorStartX = Math.floor(left / majorStep) * majorStep;
      const majorStartY = Math.floor(top / majorStep) * majorStep;

      ctx.strokeStyle = '#d0d0d0';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = majorStartX; x <= right; x += majorStep) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      for (let y = majorStartY; y <= bottom; y += majorStep) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();
    }
  }
}
