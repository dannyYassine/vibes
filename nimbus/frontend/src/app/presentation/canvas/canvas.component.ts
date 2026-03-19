import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { DiagramFacade } from '../../application/facades/diagram.facade';
import { TranslationFacade } from '../../application/facades/translation.facade';
import { ValidationFacade } from '../../application/facades/validation.facade';
import { CanvasEngine } from './canvas-engine';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { DiagramNode } from '../../domain/models/node.model';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [ConfirmDialogComponent],
  template: `
    <canvas #canvasEl
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
    ></canvas>
    <app-confirm-dialog
      [visible]="showDeleteDialog"
      [title]="deleteDialogTitle"
      [message]="deleteDialogMessage"
      (confirmed)="onDeleteConfirmed()"
      (cancelled)="showDeleteDialog = false"
    />
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }
    canvas { width: 100%; height: 100%; display: block; }
  `],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  showDeleteDialog = false;
  deleteDialogTitle = 'Delete';
  deleteDialogMessage = '';
  private pendingDeleteNodeIds: string[] = [];
  private pendingDeleteEdgeIds: string[] = [];

  private engine = new CanvasEngine();
  private subscriptions: Subscription[] = [];
  private resizeObserver?: ResizeObserver;

  constructor(
    private facade: DiagramFacade,
    private translationFacade: TranslationFacade,
    private validationFacade: ValidationFacade,
  ) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.engine.init(canvas);

    // Wire callbacks to facade
    this.engine.onNodeMoved = (id, position) => this.facade.moveNode(id, position);
    this.engine.onNodeParentChanged = (nodeId, groupId) => {
      this.facade.updateNode(nodeId, { parentId: groupId ?? undefined });
    };
    this.engine.onSelectionChanged = (ids) => this.facade.selectNodes(ids);

    // Keyboard shortcuts
    this.engine.onDeleteRequested = () => this.handleDeleteRequested();
    this.engine.onUndo = () => this.facade.undo();
    this.engine.onRedo = () => this.facade.redo();
    this.engine.onSave = () => this.facade.save();
    this.engine.onViewportChanged = (vp) => this.facade.updateViewport(vp);

    // Edge creation
    this.engine.onEdgeCreated = (sourceId, targetId) => {
      const id = crypto.randomUUID();
      this.facade.addEdge({
        id,
        sourceId,
        targetId,
        edgeType: 'Synchronous',
        properties: { bidirectional: false },
      });
    };

    // Edge selection
    this.engine.onEdgeSelectionChanged = (ids) => {
      if (ids.length > 0) {
        this.facade.selectEdges(ids);
      } else {
        this.facade.clearSelection();
      }
    };

    // Subscribe to diagram changes
    this.subscriptions.push(
      this.facade.diagram$.subscribe(diagram => this.engine.setDiagram(diagram)),
      this.facade.selectedNodeIds$.subscribe(ids => this.engine.setSelectedNodeIds(ids)),
      this.facade.selectedEdgeIds$.subscribe(ids => this.engine.setSelectedEdgeIds(ids)),
      this.translationFacade.activeProvider$.subscribe(p => this.engine.setActiveProvider(p)),
      this.validationFacade.validationResult$.pipe(
        map(result => {
          if (!result) return [];
          const nodeIds = new Set<string>();
          for (const w of result.warnings) {
            for (const id of w.nodeIds) nodeIds.add(id);
          }
          return [...nodeIds];
        }),
      ).subscribe(ids => this.engine.setWarnedNodeIds(ids)),
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

  private handleDeleteRequested(): void {
    const nodeIds = this.facade['selectionState'].getSelectedNodeIds();
    const edgeIds = this.facade['selectionState'].getSelectedEdgeIds();

    // Also check selected edge IDs from facade
    const selectedEdges = (this.facade as any).selectedEdgeSubject?.getValue() as string[] || [];

    this.pendingDeleteNodeIds = nodeIds;
    this.pendingDeleteEdgeIds = [...edgeIds, ...selectedEdges];

    const total = this.pendingDeleteNodeIds.length + this.pendingDeleteEdgeIds.length;
    if (total === 0) return;

    const items: string[] = [];
    if (this.pendingDeleteNodeIds.length > 0) {
      items.push(`${this.pendingDeleteNodeIds.length} node${this.pendingDeleteNodeIds.length > 1 ? 's' : ''}`);
    }
    if (this.pendingDeleteEdgeIds.length > 0) {
      items.push(`${this.pendingDeleteEdgeIds.length} edge${this.pendingDeleteEdgeIds.length > 1 ? 's' : ''}`);
    }

    this.deleteDialogTitle = 'Delete Elements';
    this.deleteDialogMessage = `Are you sure you want to delete ${items.join(' and ')}?`;
    this.showDeleteDialog = true;
  }

  onDeleteConfirmed(): void {
    this.showDeleteDialog = false;

    this.facade.beginBatch();
    for (const id of this.pendingDeleteEdgeIds) {
      this.facade.removeEdge(id);
    }
    for (const id of this.pendingDeleteNodeIds) {
      this.facade.removeNode(id);
    }
    this.facade.endBatch();

    this.facade.clearSelection();
    this.pendingDeleteNodeIds = [];
    this.pendingDeleteEdgeIds = [];
  }

  getCanvasElement(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  onDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('application/nimbus-service')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const data = event.dataTransfer?.getData('application/nimbus-service');
    if (!data) return;

    const { category, component } = JSON.parse(data);
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const canvasPos = this.engine.screenToCanvas(screenX, screenY);

    const node: DiagramNode = {
      id: crypto.randomUUID(),
      nodeType: { category, component },
      label: component.replace(/([A-Z])/g, ' $1').trim(),
      position: { x: canvasPos.x - 90, y: canvasPos.y - 24 },
      size: { width: 180, height: 48 },
      properties: { config: {} },
    };

    this.facade.addNode(node);
  }
}
