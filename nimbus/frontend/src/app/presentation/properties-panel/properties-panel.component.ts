import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { DiagramFacade } from '../../application/facades/diagram.facade';
import { DiagramNode, NodeCategory } from '../../domain/models/node.model';
import { DiagramEdge, EdgeType } from '../../domain/models/edge.model';
import { SERVICE_CATALOG, CATEGORY_COLORS } from '../../domain/models/service-catalog';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="panel">
      <h3>Properties</h3>

      @if (!selectedNode && !selectedEdge && selectedCount === 0) {
        <p class="placeholder">Select a node to view properties</p>
      }

      @if (selectedCount > 1) {
        <div class="multi-select">
          <p>{{ selectedCount }} nodes selected</p>
          <button class="delete-btn" (click)="onBulkDelete()">Delete Selected</button>
        </div>
      }

      @if (selectedNode) {
        <div class="form">
          <label>Label</label>
          <input
            type="text"
            [value]="selectedNode.label"
            (blur)="onLabelChange($event)"
            (keydown.enter)="onLabelChange($event)"
          />

          <label>Category</label>
          <select [value]="selectedNode.nodeType.category" (change)="onCategoryChange($event)">
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>

          <label>Component</label>
          <select [value]="selectedNode.nodeType.component" (change)="onComponentChange($event)">
            @for (comp of currentComponents; track comp) {
              <option [value]="comp">{{ comp }}</option>
            }
          </select>

          <label>Config (JSON)</label>
          <textarea
            rows="6"
            [value]="configJson"
            (blur)="onConfigChange($event)"
          ></textarea>
        </div>
      }

      @if (selectedEdge) {
        <div class="form">
          <label>Edge Type</label>
          <select [value]="selectedEdge.edgeType" (change)="onEdgeTypeChange($event)">
            @for (t of edgeTypes; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>

          <label>Label</label>
          <input
            type="text"
            [value]="selectedEdge.label || ''"
            (blur)="onEdgeLabelChange($event)"
            (keydown.enter)="onEdgeLabelChange($event)"
          />

          <label>Protocol</label>
          <input
            type="text"
            [value]="selectedEdge.properties.protocol || ''"
            (blur)="onEdgeProtocolChange($event)"
          />

          <label>Port</label>
          <input
            type="number"
            [value]="selectedEdge.properties.port || ''"
            (blur)="onEdgePortChange($event)"
          />

          <label class="checkbox-label">
            <input
              type="checkbox"
              [checked]="selectedEdge.properties.bidirectional"
              (change)="onEdgeBidirectionalChange($event)"
            />
            Bidirectional
          </label>
        </div>
      }
    </div>
  `,
  styles: [`
    .panel {
      padding: 16px;
      height: 100%;
      background: #1e1e2e;
      color: #cdd6f4;
      border-left: 1px solid #313244;
      box-sizing: border-box;
      overflow-y: auto;
    }
    h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
    .placeholder { color: #6c7086; font-size: 13px; }
    .multi-select p { color: #a6adc8; font-size: 13px; margin: 0 0 12px; }
    .delete-btn {
      padding: 8px 16px;
      background: #f38ba8;
      color: #1e1e2e;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .delete-btn:hover { background: #eba0ac; }
    .form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    label {
      font-size: 12px;
      color: #a6adc8;
      margin-top: 4px;
    }
    input, select, textarea {
      padding: 6px 8px;
      background: #313244;
      border: 1px solid #45475a;
      border-radius: 4px;
      color: #cdd6f4;
      font-size: 13px;
      font-family: inherit;
    }
    textarea { resize: vertical; font-family: monospace; font-size: 12px; }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #cdd6f4;
      cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] { width: auto; }
  `],
})
export class PropertiesPanelComponent implements OnInit, OnDestroy {
  selectedNode: DiagramNode | null = null;
  selectedEdge: DiagramEdge | null = null;
  selectedCount = 0;
  configJson = '{}';
  categories = Object.keys(SERVICE_CATALOG) as NodeCategory[];
  currentComponents: string[] = [];
  edgeTypes: EdgeType[] = ['Synchronous', 'Asynchronous', 'DataFlow', 'Dependency'];

  private subscriptions: Subscription[] = [];

  constructor(private facade: DiagramFacade) {}

  ngOnInit(): void {
    this.subscriptions.push(
      combineLatest([this.facade.selectedNodeIds$, this.facade.diagram$, this.facade.selectedEdgeIds$]).subscribe(
        ([nodeIds, diagram, edgeIds]) => {
          this.selectedCount = nodeIds.length;
          this.selectedNode = null;
          this.selectedEdge = null;

          if (nodeIds.length === 1 && diagram) {
            this.selectedNode = diagram.nodes.find(n => n.id === nodeIds[0]) ?? null;
            if (this.selectedNode) {
              this.configJson = JSON.stringify(this.selectedNode.properties.config, null, 2);
              this.currentComponents = SERVICE_CATALOG[this.selectedNode.nodeType.category] || [];
            }
          } else if (nodeIds.length === 0 && edgeIds.length === 1 && diagram) {
            this.selectedEdge = diagram.edges.find(e => e.id === edgeIds[0]) ?? null;
          }
        },
      ),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  onLabelChange(event: Event): void {
    if (!this.selectedNode) return;
    const value = (event.target as HTMLInputElement).value;
    if (value !== this.selectedNode.label) {
      this.facade.updateNode(this.selectedNode.id, { label: value });
    }
  }

  onCategoryChange(event: Event): void {
    if (!this.selectedNode) return;
    const category = (event.target as HTMLSelectElement).value as NodeCategory;
    const components = SERVICE_CATALOG[category] || [];
    this.currentComponents = components;
    this.facade.updateNode(this.selectedNode.id, {
      nodeType: { category, component: components[0] || '' },
    });
  }

  onComponentChange(event: Event): void {
    if (!this.selectedNode) return;
    const component = (event.target as HTMLSelectElement).value;
    this.facade.updateNode(this.selectedNode.id, {
      nodeType: { ...this.selectedNode.nodeType, component },
    });
  }

  onConfigChange(event: Event): void {
    if (!this.selectedNode) return;
    const value = (event.target as HTMLTextAreaElement).value;
    try {
      const config = JSON.parse(value);
      this.facade.updateNode(this.selectedNode.id, {
        properties: { ...this.selectedNode.properties, config },
      });
    } catch {
      // Invalid JSON, ignore
    }
  }

  onBulkDelete(): void {
    (this as any)._bulkDeleteRequested = true;
  }

  onEdgeTypeChange(event: Event): void {
    if (!this.selectedEdge) return;
    const edgeType = (event.target as HTMLSelectElement).value as EdgeType;
    this.facade.updateEdge(this.selectedEdge.id, { edgeType });
  }

  onEdgeLabelChange(event: Event): void {
    if (!this.selectedEdge) return;
    const label = (event.target as HTMLInputElement).value || undefined;
    this.facade.updateEdge(this.selectedEdge.id, { label });
  }

  onEdgeProtocolChange(event: Event): void {
    if (!this.selectedEdge) return;
    const protocol = (event.target as HTMLInputElement).value || undefined;
    this.facade.updateEdge(this.selectedEdge.id, {
      properties: { ...this.selectedEdge.properties, protocol },
    });
  }

  onEdgePortChange(event: Event): void {
    if (!this.selectedEdge) return;
    const portStr = (event.target as HTMLInputElement).value;
    const port = portStr ? parseInt(portStr, 10) : undefined;
    this.facade.updateEdge(this.selectedEdge.id, {
      properties: { ...this.selectedEdge.properties, port },
    });
  }

  onEdgeBidirectionalChange(event: Event): void {
    if (!this.selectedEdge) return;
    const bidirectional = (event.target as HTMLInputElement).checked;
    this.facade.updateEdge(this.selectedEdge.id, {
      properties: { ...this.selectedEdge.properties, bidirectional },
    });
  }
}
