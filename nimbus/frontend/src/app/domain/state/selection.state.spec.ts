import { SelectionState } from './selection.state';

describe('SelectionState', () => {
  let state: SelectionState;

  beforeEach(() => {
    state = new SelectionState();
  });

  test('should start with empty selection', () => {
    expect(state.getSelectedNodeIds()).toEqual([]);
    expect(state.getSelectedEdgeIds()).toEqual([]);
  });

  test('selectNodes should replace current selection', () => {
    state.selectNodes(['a', 'b']);
    expect(state.getSelectedNodeIds()).toEqual(expect.arrayContaining(['a', 'b']));
    expect(state.getSelectedNodeIds()).toHaveLength(2);

    state.selectNodes(['c']);
    expect(state.getSelectedNodeIds()).toEqual(['c']);
  });

  test('toggleNode should add node if not selected', () => {
    state.toggleNode('a');
    expect(state.getSelectedNodeIds()).toContain('a');
  });

  test('toggleNode should remove node if already selected', () => {
    state.selectNodes(['a', 'b']);
    state.toggleNode('a');
    expect(state.getSelectedNodeIds()).not.toContain('a');
    expect(state.getSelectedNodeIds()).toContain('b');
  });

  test('clearSelection should clear all selections', () => {
    state.selectNodes(['a', 'b']);
    state.clearSelection();
    expect(state.getSelectedNodeIds()).toEqual([]);
    expect(state.getSelectedEdgeIds()).toEqual([]);
  });

  test('getSelectedEdgeIds should return empty array by default', () => {
    expect(state.getSelectedEdgeIds()).toEqual([]);
  });
});
