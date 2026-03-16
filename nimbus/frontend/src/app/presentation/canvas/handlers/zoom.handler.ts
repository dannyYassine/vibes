import { CanvasContext } from '../canvas-context';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;
const SENSITIVITY = 0.001;

export class ZoomHandler {
  constructor(private context: CanvasContext) {}

  onWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.context.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Canvas point under cursor before zoom
    const before = this.context.screenToCanvas(mouseX, mouseY);

    // Update zoom
    const delta = -event.deltaY * SENSITIVITY;
    const oldZoom = this.context.viewport.zoom;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * (1 + delta)));
    this.context.viewport.zoom = newZoom;

    // Adjust pan so same canvas point stays under cursor
    this.context.viewport.x = mouseX - before.x * newZoom;
    this.context.viewport.y = mouseY - before.y * newZoom;

    this.context.requestRender();
  }
}
