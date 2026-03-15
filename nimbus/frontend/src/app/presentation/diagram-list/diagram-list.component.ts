import { Component, Inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiagramListItem } from '../../domain/models/diagram.model';
import { DiagramRepository } from '../../domain/interfaces/diagram-repository.interface';
import { DIAGRAM_REPOSITORY } from '../../application/tokens';

@Component({
  selector: 'app-diagram-list',
  standalone: true,
  imports: [RouterLink],
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
              <span class="meta">{{ diagram.nodeCount }} nodes</span>
            </a>
          </li>
        }
      </ul>
      @if (diagrams.length === 0) {
        <p class="empty">No diagrams yet. Create one to get started.</p>
      }
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
    }
    .diagram-list a {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      text-decoration: none;
      color: #cdd6f4;
    }
    .diagram-list a:hover { background: #313244; border-radius: 8px; }
    .name { font-weight: 500; }
    .meta { color: #6c7086; font-size: 13px; }
    .empty { color: #6c7086; text-align: center; margin-top: 48px; }
  `],
})
export default class DiagramListComponent implements OnInit {
  diagrams: DiagramListItem[] = [];

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
}
