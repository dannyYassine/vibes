export interface DiagramEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  label?: string;
  properties: EdgeProperties;
}

export type EdgeType = 'Synchronous' | 'Asynchronous' | 'DataFlow' | 'Dependency';

export interface EdgeProperties {
  protocol?: string;
  port?: number;
  bidirectional: boolean;
  communicationPattern?: CommunicationPattern;
  style?: EdgeStyle;
}

export type CommunicationPattern = 'RequestResponse' | 'FireAndForget' | 'PublishSubscribe' | 'Streaming';

export interface EdgeStyle {
  color?: string;
  dashPattern?: number[];
  thickness?: number;
}
