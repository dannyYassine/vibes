import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { DiagramFacade } from '../../application/facades/diagram.facade';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [LayoutComponent],
  template: `<app-layout />`,
})
export default class EditorComponent implements OnInit, OnDestroy {
  constructor(
    private route: ActivatedRoute,
    private facade: DiagramFacade,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.facade.loadDiagram(id);
    }
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }
}
