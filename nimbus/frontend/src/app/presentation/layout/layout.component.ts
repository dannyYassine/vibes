import { Component } from '@angular/core';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [ToolbarComponent, CanvasComponent, SidebarComponent, ChatComponent],
  template: `
    <div class="layout">
      <app-toolbar />
      <div class="main">
        <app-canvas class="canvas-area" />
        <div class="right-panel">
          <app-chat class="chat-area" />
          <app-sidebar class="sidebar-area" />
        </div>
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
    .right-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chat-area {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .sidebar-area {
      overflow-y: auto;
      flex-shrink: 0;
    }
  `],
})
export class LayoutComponent {}
