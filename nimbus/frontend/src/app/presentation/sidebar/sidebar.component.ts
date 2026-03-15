import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  template: `
    <div class="sidebar">
      <h3>Properties</h3>
      <p class="placeholder">Select a node to view properties</p>
    </div>
  `,
  styles: [`
    .sidebar {
      padding: 16px;
      height: 100%;
      background: #1e1e2e;
      color: #cdd6f4;
      border-left: 1px solid #313244;
      box-sizing: border-box;
    }
    h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
    .placeholder { color: #6c7086; font-size: 13px; }
  `],
})
export class SidebarComponent {}
