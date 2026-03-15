import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-canvas',
  standalone: true,
  template: `<canvas #canvasEl></canvas>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    canvas { width: 100%; height: 100%; display: block; }
  `],
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.drawGrid(ctx, canvas.width, canvas.height);
    this.drawPlaceholder(ctx, canvas.width, canvas.height);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#666';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Canvas Ready', w / 2, h / 2);
  }
}
