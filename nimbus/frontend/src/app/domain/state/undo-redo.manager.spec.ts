import { UndoRedoManager } from './undo-redo.manager';

describe('UndoRedoManager', () => {
  let manager: UndoRedoManager<string>;

  beforeEach(() => {
    manager = new UndoRedoManager<string>();
  });

  test('should start with no undo/redo available', () => {
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
  });

  test('push should enable undo', () => {
    manager.push('state-1');
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  test('push should clear future', () => {
    manager.push('state-1');
    manager.undo('state-2');
    expect(manager.canRedo()).toBe(true);
    manager.push('state-3');
    expect(manager.canRedo()).toBe(false);
  });

  test('undo should return previous state', () => {
    manager.push('state-1');
    const result = manager.undo('state-2');
    expect(result).toBe('state-1');
  });

  test('undo on empty should return null', () => {
    const result = manager.undo('current');
    expect(result).toBeNull();
  });

  test('redo should return future state', () => {
    manager.push('state-1');
    manager.undo('state-2');
    const result = manager.redo('state-1');
    expect(result).toBe('state-2');
  });

  test('redo on empty should return null', () => {
    const result = manager.redo('current');
    expect(result).toBeNull();
  });

  test('multi-step undo/redo sequence', () => {
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
