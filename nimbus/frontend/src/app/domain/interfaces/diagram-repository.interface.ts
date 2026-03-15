import { Diagram, DiagramListItem } from '../models';

export interface DiagramRepository {
  list(): Promise<DiagramListItem[]>;
  get(id: string): Promise<Diagram>;
  create(name: string, description?: string): Promise<Diagram>;
  update(id: string, changes: Partial<Diagram>): Promise<Diagram>;
  delete(id: string): Promise<void>;
}
