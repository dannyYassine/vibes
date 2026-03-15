import { DiagramNode } from '../../domain/models/node.model';

export class NodeMapper {
  static fromApi(dto: Record<string, unknown>): DiagramNode {
    return {
      id: dto['id'] as string,
      nodeType: dto['nodeType'] as DiagramNode['nodeType'],
      label: dto['label'] as string,
      position: dto['position'] as DiagramNode['position'],
      size: dto['size'] as DiagramNode['size'],
      properties: dto['properties'] as DiagramNode['properties'],
      parentId: dto['parentId'] as string | undefined,
      providerMappings: dto['providerMappings'] as DiagramNode['providerMappings'],
    };
  }

  static toApi(node: DiagramNode): Record<string, unknown> {
    return { ...node };
  }
}
