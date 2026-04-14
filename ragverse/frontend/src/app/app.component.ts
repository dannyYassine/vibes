import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column;">
      <h1 style="color: #6B4EFF; font-weight: 600; font-size: 2.5rem; margin-bottom: 0.5rem;">RagVerse</h1>
      <p style="color: #6B7280;">Application scaffolding complete</p>
    </div>
    <router-outlet />
  `,
})
export class AppComponent {
  title = 'RagVerse';
}
