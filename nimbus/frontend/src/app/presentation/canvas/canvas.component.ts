import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { DiagramFacade } from '../../application/facades/diagram.facade';
import { CanvasEngine } from './canvas-engine';

@Component({
  selector: 'app-canvas',
  standalone: true,
  template: `<canvas #canvasEl></canvas>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    canvas { width: 100%; height: 100%; display: block; }
  `],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private engine = new CanvasEngine();
  private subscriptions: Subscription[] = [];
  private resizeObserver?: ResizeObserver;

  constructor(private facade: DiagramFacade) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.engine.init(canvas);

    // Wire callbacks to facade
    this.engine.onNodeMoved = (id, position) => this.facade.moveNode(id, position);
    this.engine.onSelectionChanged = (ids) => this.facade.selectNodes(ids);

    // Subscribe to diagram changes
    this.subscriptions.push(
      this.facade.diagram$.subscribe(diagram => this.engine.setDiagram(diagram)),
      this.facade.selectedNodeIds$.subscribe(ids => this.engine.setSelectedNodeIds(ids)),
    );

    // Resize observer
    const parent = canvas.parentElement!;
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.engine.resize(width, height);
      }
    });
    this.resizeObserver.observe(parent);

    // Initial size
    this.engine.resize(parent.clientWidth, parent.clientHeight);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.resizeObserver?.disconnect();
    this.engine.destroy();
  }
}
