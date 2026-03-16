import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (visible) {
      <div class="backdrop" (click)="onCancel()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
          <div class="actions">
            <button class="cancel-btn" (click)="onCancel()">Cancel</button>
            <button class="delete-btn" (click)="onConfirm()">Delete</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 8px;
      padding: 24px;
      min-width: 320px;
      max-width: 420px;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 600;
      color: #cdd6f4;
    }
    p {
      margin: 0 0 20px;
      font-size: 14px;
      color: #a6adc8;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      border: none;
    }
    .cancel-btn {
      background: #313244;
      color: #cdd6f4;
      border: 1px solid #45475a;
    }
    .cancel-btn:hover { background: #45475a; }
    .delete-btn {
      background: #f38ba8;
      color: #1e1e2e;
      font-weight: 600;
    }
    .delete-btn:hover { background: #eba0ac; }
  `],
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
