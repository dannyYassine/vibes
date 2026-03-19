import { UndoRedoManager } from './undo-redo.manager';

describe('UndoRedoManager', () => {
  let manager: UndoRedoManager<string>;

  beforeEach(() => {
    manager = new UndoRedoManager<string>();
  });

  it('should start with no undo/redo available', () => {
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
  });

  it('push should enable undo', () => {
    manager.push('state-1');
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('push should clear future', () => {
    manager.push('state-1');
    manager.undo('state-2');
    expect(manager.canRedo()).toBe(true);
    manager.push('state-3');
    expect(manager.canRedo()).toBe(false);
  });

  it('undo should return previous state', () => {
    manager.push('state-1');
    const result = manager.undo('state-2');
    expect(result).toBe('state-1');
  });

  it('undo on empty should return null', () => {
    const result = manager.undo('current');
    expect(result).toBeNull();
  });

  it('redo should return future state', () => {
    manager.push('state-1');
    manager.undo('state-2');
    const result = manager.redo('state-1');
    expect(result).toBe('state-2');
  });

  it('redo on empty should return null', () => {
    const result = manager.redo('current');
    expect(result).toBeNull();
  });

  it('multi-step undo/redo sequence', () => {
    manager.push('a');
    manager.push('b');
    manager.push('c');

    // Undo twice from 'd'
    const r1 = manager.undo('d');
    expect(r1).toBe('c');
    const r2 = manager.undo('c');
    expect(r2).toBe('b');

    // Redo once
    const r3 = manager.redo('b');
    expect(r3).toBe('c');

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(true);
  });
});
