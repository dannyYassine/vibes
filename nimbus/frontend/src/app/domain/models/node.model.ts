export interface DiagramNode {
  id: string;
  nodeType: NodeType;
  label: string;
  position: Position;
  size: Size;
  properties: NodeProperties;
  parentId?: string;
  providerMappings?: ProviderMappings;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NodeType {
  category: NodeCategory;
  component: string;
}

export type NodeCategory =
  | 'Compute'
  | 'Networking'
  | 'Data'
  | 'Caching'
  | 'Messaging'
  | 'Storage'
  | 'Security'
  | 'Observability'
  | 'Group';

export interface NodeProperties {
  config: Record<string, unknown>;
  style?: NodeStyle;
}

export interface NodeStyle {
  color?: string;
  icon?: string;
  opacity?: number;
}

export interface ProviderMappings {
  aws?: ProviderMapping;
  gcp?: ProviderMapping;
  azure?: ProviderMapping;
}

export interface ProviderMapping {
  serviceName: string;
  iconKey: string;
  config: Record<string, unknown>;
  terraformResourceType?: string;
}
