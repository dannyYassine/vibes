export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewport: ViewportState;
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number };
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number };
  requestRender(): void;
}

export interface HitTestResult {
  type: 'node' | 'edge' | 'empty';
  id?: string;
}

export interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
