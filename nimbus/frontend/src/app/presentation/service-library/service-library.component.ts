import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SERVICE_CATALOG, CATEGORY_COLORS } from '../../domain/models/service-catalog';
import { NodeCategory } from '../../domain/models/node.model';

@Component({
  selector: 'app-service-library',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (visible) {
      <div class="library">
        <h3>Service Library</h3>
        <input
          class="search"
          type="text"
          placeholder="Filter services..."
          [(ngModel)]="searchTerm"
        />
        @for (category of categories; track category) {
          @if (filteredComponents(category).length > 0) {
            <div class="category">
              <button class="category-header" (click)="toggleCategory(category)">
                <span class="color-dot" [style.background]="getColor(category)"></span>
                <span>{{ category }}</span>
                <span class="chevron">{{ isExpanded(category) ? '\u25BC' : '\u25B6' }}</span>
              </button>
              @if (isExpanded(category)) {
                <div class="components">
                  @for (comp of filteredComponents(category); track comp) {
                    <div
                      class="component-item"
                      draggable="true"
                      (dragstart)="onDragStart($event, category, comp)"
                    >
                      {{ comp }}
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    }
  `,
  styles: [`
    .library {
      width: 220px;
      height: 100%;
      background: #1e1e2e;
      color: #cdd6f4;
      border-right: 1px solid #313244;
      overflow-y: auto;
      padding: 12px;
      box-sizing: border-box;
    }
    h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
    .search {
      width: 100%;
      padding: 6px 8px;
      background: #313244;
      border: 1px solid #45475a;
      border-radius: 4px;
      color: #cdd6f4;
      font-size: 13px;
      margin-bottom: 12px;
      box-sizing: border-box;
    }
    .search::placeholder { color: #6c7086; }
    .category { margin-bottom: 4px; }
    .category-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 4px;
      background: none;
      border: none;
      color: #cdd6f4;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .category-header:hover { background: #313244; border-radius: 4px; }
    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .chevron { margin-left: auto; font-size: 10px; color: #6c7086; }
    .components { padding-left: 20px; }
    .component-item {
      padding: 4px 8px;
      font-size: 12px;
      color: #a6adc8;
      cursor: grab;
      border-radius: 3px;
      margin-bottom: 2px;
    }
    .component-item:hover { background: #313244; color: #cdd6f4; }
  `],
})
export class ServiceLibraryComponent {
  @Input() visible = false;

  searchTerm = '';
  categories = Object.keys(SERVICE_CATALOG) as NodeCategory[];
  private expandedCategories = new Set<NodeCategory>(this.categories);

  getColor(category: NodeCategory): string {
    return CATEGORY_COLORS[category];
  }

  isExpanded(category: NodeCategory): boolean {
    return this.expandedCategories.has(category);
  }

  toggleCategory(category: NodeCategory): void {
    if (this.expandedCategories.has(category)) {
      this.expandedCategories.delete(category);
    } else {
      this.expandedCategories.add(category);
    }
  }

  filteredComponents(category: NodeCategory): string[] {
    const components = SERVICE_CATALOG[category];
    if (!this.searchTerm) return components;
    const term = this.searchTerm.toLowerCase();
    return components.filter(c => c.toLowerCase().includes(term));
  }

  onDragStart(event: DragEvent, category: NodeCategory, component: string): void {
    event.dataTransfer?.setData('application/nimbus-service', JSON.stringify({ category, component }));
    event.dataTransfer!.effectAllowed = 'copy';
  }
}
