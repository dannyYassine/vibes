import { Component } from '@angular/core';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [ToolbarComponent, CanvasComponent, SidebarComponent],
  template: `
    <div class="layout">
      <app-toolbar />
      <div class="main">
        <app-canvas class="canvas-area" />
        <app-sidebar class="sidebar-area" />
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: grid;
      grid-template-rows: 48px 1fr;
      height: 100vh;
      width: 100vw;
    }
    .main {
      display: grid;
      grid-template-columns: 1fr 300px;
      overflow: hidden;
    }
    .canvas-area { overflow: hidden; }
    .sidebar-area { overflow-y: auto; }
  `],
})
export class LayoutComponent {}
