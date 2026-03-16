import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { DiagramFacade } from '../../application/facades/diagram.facade';
import { ValidationFacade } from '../../application/facades/validation.facade';
import { ExportFacade } from '../../application/facades/export.facade';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div class="toolbar">
      @if (facade.diagram$ | async; as diagram) {
        <span class="diagram-name">{{ diagram.name }}</span>
      } @else {
        <span class="diagram-name">Nimbus</span>
      }
      <div class="toolbar-actions">
        <button class="library-btn" (click)="libraryToggled.emit()">Library</button>
        <button (click)="facade.undo()">Undo</button>
        <button (click)="facade.redo()">Redo</button>
        <button class="validate-btn" (click)="onValidate()" [disabled]="!(facade.diagram$ | async)">Validate</button>
        <button (click)="facade.save()">Save</button>
        <button (click)="exportPngRequested.emit()" [disabled]="!(facade.diagram$ | async)">Export PNG</button>
        <button (click)="onExportJson()" [disabled]="!(facade.diagram$ | async)">Export JSON</button>
        <button (click)="fileInput.click()">Import JSON</button>
        <input #fileInput type="file" accept=".json" style="display:none" (change)="onImportFile($event)" />
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 48px;
      background: #1e1e2e;
      color: #cdd6f4;
      border-bottom: 1px solid #313244;
    }
    .diagram-name { font-weight: 600; font-size: 16px; }
    .toolbar-actions { display: flex; gap: 8px; }
    button {
      padding: 6px 12px;
      border: 1px solid #45475a;
      border-radius: 4px;
      background: #313244;
      color: #cdd6f4;
      cursor: pointer;
      font-size: 13px;
    }
    button:hover:not(:disabled) { background: #45475a; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .validate-btn {
      border-color: #a6e3a1;
      color: #a6e3a1;
    }
    .validate-btn:hover:not(:disabled) {
      background: rgba(166, 227, 161, 0.15);
    }
    .library-btn {
      border-color: #89b4fa;
      color: #89b4fa;
    }
    .library-btn:hover {
      background: rgba(137, 180, 250, 0.15);
    }
  `],
})
export class ToolbarComponent {
  @Output() libraryToggled = new EventEmitter<void>();
  @Output() exportPngRequested = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    public facade: DiagramFacade,
    private validationFacade: ValidationFacade,
    private exportFacade: ExportFacade,
    private router: Router,
  ) {}

  onValidate(): void {
    const id = this.facade.getCurrentDiagramId();
    if (id) {
      this.validationFacade.validate(id);
    }
  }

  onExportJson(): void {
    const diagram = this.facade.getCurrentDiagram();
    if (diagram) {
      this.exportFacade.exportJson(diagram);
    }
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const parsed = await this.exportFacade.importJson(file);
      const created = await this.facade.createDiagram(parsed.name);
      await this.facade.updateDiagramRemote(created.id, {
        nodes: parsed.nodes,
        edges: parsed.edges,
        viewport: parsed.viewport,
      });
      this.router.navigate(['/diagrams', created.id]);
    } catch (e) {
      console.error('Import failed:', e);
    }

    input.value = '';
  }
}
