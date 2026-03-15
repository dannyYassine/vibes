import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'diagrams', pathMatch: 'full' },
  {
    path: 'diagrams',
    loadComponent: () => import('./presentation/diagram-list/diagram-list.component'),
  },
  {
    path: 'diagrams/:id',
    loadComponent: () => import('./presentation/editor/editor.component'),
  },
];
