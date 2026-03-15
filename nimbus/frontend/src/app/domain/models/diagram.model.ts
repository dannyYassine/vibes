import { DiagramNode } from './node.model';
import { DiagramEdge } from './edge.model';

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: Viewport;
  activeProvider?: CloudProvider;
  createdAt: string;
  updatedAt: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type CloudProvider = 'Aws' | 'Gcp' | 'Azure';

export interface DiagramListItem {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
  activeProvider?: CloudProvider;
  updatedAt: string;
}
