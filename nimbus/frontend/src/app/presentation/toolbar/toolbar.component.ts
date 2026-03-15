import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { DiagramFacade } from '../../application/facades/diagram.facade';

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
        <button (click)="facade.undo()">Undo</button>
        <button (click)="facade.redo()">Redo</button>
        <button (click)="facade.save()">Save</button>
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
    button:hover { background: #45475a; }
  `],
})
export class ToolbarComponent {
  constructor(public facade: DiagramFacade) {}
}
