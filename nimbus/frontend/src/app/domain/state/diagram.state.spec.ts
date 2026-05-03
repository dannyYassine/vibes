import { DiagramState } from './diagram.state';
import { Diagram } from '../models/diagram.model';
import { DiagramNode } from '../models/node.model';
import { DiagramEdge } from '../models/edge.model';

function makeDiagram(overrides: Partial<Diagram> = {}): Diagram {
  return {
    id: 'diag-1',
    name: 'Test',
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeNode(id: string, label: string = 'Node'): DiagramNode {
  return {
    id,
    nodeType: { category: 'Compute', component: 'ApplicationServer' },
    label,
    position: { x: 0, y: 0 },
    size: { width: 180, height: 48 },
    properties: { config: {} },
  };
}

function makeEdge(id: string, sourceId: string, targetId: string): DiagramEdge {
  return {
    id,
    sourceId,
    targetId,
    edgeType: 'Synchronous',
    properties: { bidirectional: false },
  };
}

describe('DiagramState', () => {
  let state: DiagramState;

  beforeEach(() => {
    state = new DiagramState();
  });

  test('getDiagram should return null initially', () => {
    expect(state.getDiagram()).toBeNull();
  });

  test('load and getDiagram', () => {
    const diagram = makeDiagram();
    state.load(diagram);
    expect(state.getDiagram()).toBe(diagram);
  });

  test('ensureDiagram should create default diagram if none loaded', () => {
    const diagram = state.ensureDiagram();
    expect(diagram).toBeDefined();
    expect(diagram.nodes).toEqual([]);
    expect(diagram.edges).toEqual([]);
  });

  test('ensureDiagram should return existing diagram', () => {
    const original = makeDiagram({ name: 'Existing' });
    state.load(original);
    const result = state.ensureDiagram();
    expect(result.name).toBe('Existing');
  });

  test('addNode should add node and support undo', () => {
    state.load(makeDiagram());
    const node = makeNode('n1');
    state.addNode(node);
    expect(state.getDiagram()!.nodes).toHaveLength(1);
    expect(state.canUndo()).toBe(true);

    state.undo();
    expect(state.getDiagram()!.nodes).toHaveLength(0);
  });

  test('updateNode should update matching node', () => {
    state.load(makeDiagram({ nodes: [makeNode('n1', 'Old')] }));
    state.updateNode('n1', { label: 'New' });
    expect(state.getDiagram()!.nodes[0].label).toBe('New');
  });

  test('removeNode should cascade remove edges', () => {
    const n1 = makeNode('n1');
    const n2 = makeNode('n2');
    const edge = makeEdge('e1', 'n1', 'n2');
    state.load(makeDiagram({ nodes: [n1, n2], edges: [edge] }));

    state.removeNode('n1');
    expect(state.getDiagram()!.nodes).toHaveLength(1);
    expect(state.getDiagram()!.edges).toHaveLength(0);
  });

  test('addEdge should add edge', () => {
    state.load(makeDiagram());
    const edge = makeEdge('e1', 'n1', 'n2');
    state.addEdge(edge);
    expect(state.getDiagram()!.edges).toHaveLength(1);
  });

  test('updateEdge should update matching edge', () => {
    const edge = makeEdge('e1', 'n1', 'n2');
    state.load(makeDiagram({ edges: [edge] }));
    state.updateEdge('e1', { label: 'Updated' });
    expect(state.getDiagram()!.edges[0].label).toBe('Updated');
  });

  test('removeEdge should remove matching edge', () => {
    const edge = makeEdge('e1', 'n1', 'n2');
    state.load(makeDiagram({ edges: [edge] }));
    state.removeEdge('e1');
    expect(state.getDiagram()!.edges).toHaveLength(0);
  });

  test('moveNode should update position', () => {
    state.load(makeDiagram({ nodes: [makeNode('n1')] }));
    state.moveNode('n1', { x: 50, y: 100 });
    expect(state.getDiagram()!.nodes[0].position).toEqual({ x: 50, y: 100 });
  });

  test('setViewport should update viewport', () => {
    state.load(makeDiagram());
    state.setViewport({ x: 10, y: 20, zoom: 2 });
    expect(state.getDiagram()!.viewport).toEqual({ x: 10, y: 20, zoom: 2 });
  });

  test('setViewport should no-op when diagram is null', () => {
    state.setViewport({ x: 10, y: 20, zoom: 2 });
    expect(state.getDiagram()).toBeNull();
  });

  test('undo and redo', () => {
    state.load(makeDiagram());
    state.addNode(makeNode('n1'));
    state.addNode(makeNode('n2'));

    expect(state.getDiagram()!.nodes).toHaveLength(2);

    state.undo();
    expect(state.getDiagram()!.nodes).toHaveLength(1);
    expect(state.canRedo()).toBe(true);

    state.redo();
    expect(state.getDiagram()!.nodes).toHaveLength(2);
  });

  test('canUndo and canRedo', () => {
    state.load(makeDiagram());
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(false);

    state.addNode(makeNode('n1'));
    expect(state.canUndo()).toBe(true);

    state.undo();
    expect(state.canRedo()).toBe(true);
  });

  test('batch should group operations as single undo', () => {
    state.load(makeDiagram());
    state.beginBatch();
    state.addNode(makeNode('n1'));
    state.addNode(makeNode('n2'));
    state.addNode(makeNode('n3'));
    state.endBatch();

    expect(state.getDiagram()!.nodes).toHaveLength(3);

    // Single undo should revert all 3 adds
    state.undo();
    expect(state.getDiagram()!.nodes).toHaveLength(0);
  });
});
