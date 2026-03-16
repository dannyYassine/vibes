import { Component, Inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DiagramListItem } from '../../domain/models/diagram.model';
import { DiagramRepository } from '../../domain/interfaces/diagram-repository.interface';
import { DIAGRAM_REPOSITORY } from '../../application/tokens';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

@Component({
  selector: 'app-diagram-list',
  standalone: true,
  imports: [RouterLink, DatePipe, ConfirmDialogComponent],
  template: `
    <div class="diagram-list-page">
      <div class="header">
        <h1>Diagrams</h1>
        <button class="new-btn" (click)="createDiagram()">New Diagram</button>
      </div>
      <ul class="diagram-list">
        @for (diagram of diagrams; track diagram.id) {
          <li>
            <a [routerLink]="['/diagrams', diagram.id]">
              <span class="name">{{ diagram.name }}</span>
              <span class="meta">
                {{ diagram.nodeCount }} nodes
                <span class="separator">&middot;</span>
                {{ diagram.updatedAt | date:'medium' }}
              </span>
            </a>
            <button class="delete-btn" (click)="deleteDiagram($event, diagram.id)">Delete</button>
          </li>
        }
      </ul>
      @if (diagrams.length === 0) {
        <p class="empty">No diagrams yet. Create one to get started.</p>
      }
      <app-confirm-dialog
        [visible]="showDeleteDialog"
        title="Delete Diagram"
        message="Are you sure you want to delete this diagram? This cannot be undone."
        (confirmed)="onDeleteConfirmed()"
        (cancelled)="showDeleteDialog = false"
      />
    </div>
  `,
  styles: [`
    .diagram-list-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 16px;
      color: #cdd6f4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    h1 { margin: 0; font-size: 24px; }
    .new-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: #89b4fa;
      color: #1e1e2e;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    .new-btn:hover { background: #74c7ec; }
    .diagram-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .diagram-list li {
      border: 1px solid #313244;
      border-radius: 8px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
    }
    .diagram-list a {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      text-decoration: none;
      color: #cdd6f4;
      flex: 1;
    }
    .diagram-list a:hover { background: #313244; border-radius: 8px 0 0 8px; }
    .name { font-weight: 500; }
    .meta { color: #6c7086; font-size: 13px; }
    .separator { margin: 0 4px; }
    .delete-btn {
      padding: 8px 12px;
      margin-right: 8px;
      border: 1px solid #f38ba8;
      border-radius: 4px;
      background: transparent;
      color: #f38ba8;
      cursor: pointer;
      font-size: 12px;
      flex-shrink: 0;
    }
    .delete-btn:hover { background: rgba(243, 139, 168, 0.15); }
    .empty { color: #6c7086; text-align: center; margin-top: 48px; }
  `],
})
export default class DiagramListComponent implements OnInit {
  diagrams: DiagramListItem[] = [];
  showDeleteDialog = false;
  private diagramToDelete: string | null = null;

  constructor(
    @Inject(DIAGRAM_REPOSITORY) private repo: DiagramRepository,
  ) {}

  async ngOnInit(): Promise<void> {
    this.diagrams = await this.repo.list();
  }

  async createDiagram(): Promise<void> {
    await this.repo.create('Untitled Diagram');
    this.diagrams = await this.repo.list();
  }

  deleteDiagram(event: Event, id: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.diagramToDelete = id;
    this.showDeleteDialog = true;
  }

  async onDeleteConfirmed(): Promise<void> {
    this.showDeleteDialog = false;
    if (this.diagramToDelete) {
      await this.repo.delete(this.diagramToDelete);
      this.diagramToDelete = null;
      this.diagrams = await this.repo.list();
    }
  }
}
