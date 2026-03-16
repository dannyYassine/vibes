export interface KeyboardCallbacks {
  onDeleteRequested: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}

export class KeyboardHandler {
  private boundKeyDown: (e: KeyboardEvent) => void;
  private callbacks: KeyboardCallbacks;

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    const mod = event.metaKey || event.ctrlKey;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.callbacks.onDeleteRequested();
      return;
    }

    if (mod && event.key === 'z' && event.shiftKey) {
      event.preventDefault();
      this.callbacks.onRedo();
      return;
    }

    if (mod && event.key === 'z') {
      event.preventDefault();
      this.callbacks.onUndo();
      return;
    }

    if (mod && event.key === 's') {
      event.preventDefault();
      this.callbacks.onSave();
      return;
    }
  }
}
