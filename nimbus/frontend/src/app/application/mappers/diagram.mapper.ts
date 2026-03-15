import { Diagram } from '../../domain/models/diagram.model';
import { NodeMapper } from './node.mapper';

export class DiagramMapper {
  static fromApi(dto: Record<string, unknown>): Diagram {
    return {
      id: dto['id'] as string,
      name: dto['name'] as string,
      description: dto['description'] as string | undefined,
      nodes: ((dto['nodes'] as Record<string, unknown>[]) || []).map(NodeMapper.fromApi),
      edges: (dto['edges'] as Diagram['edges']) || [],
      viewport: (dto['viewport'] as Diagram['viewport']) || { x: 0, y: 0, zoom: 1 },
      activeProvider: dto['activeProvider'] as Diagram['activeProvider'],
      createdAt: dto['createdAt'] as string,
      updatedAt: dto['updatedAt'] as string,
    };
  }

  static toApi(diagram: Diagram): Record<string, unknown> {
    return { ...diagram };
  }
}
