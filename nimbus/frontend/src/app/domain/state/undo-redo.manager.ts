export class UndoRedoManager<T> {
  private past: T[] = [];
  private future: T[] = [];

  push(state: T): void {
    this.past.push(state);
    this.future = [];
  }

  undo(current: T): T | null {
    if (this.past.length === 0) return null;
    this.future.push(current);
    return this.past.pop()!;
  }

  redo(current: T): T | null {
    if (this.future.length === 0) return null;
    this.past.push(current);
    return this.future.pop()!;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }
}
