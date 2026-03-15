export class SelectionState {
  private selectedNodeIds: Set<string> = new Set();
  private selectedEdgeIds: Set<string> = new Set();

  selectNodes(ids: string[]): void {
    this.selectedNodeIds = new Set(ids);
  }

  toggleNode(id: string): void {
    if (this.selectedNodeIds.has(id)) {
      this.selectedNodeIds.delete(id);
    } else {
      this.selectedNodeIds.add(id);
    }
  }

  clearSelection(): void {
    this.selectedNodeIds.clear();
    this.selectedEdgeIds.clear();
  }

  getSelectedNodeIds(): string[] {
    return Array.from(this.selectedNodeIds);
  }

  getSelectedEdgeIds(): string[] {
    return Array.from(this.selectedEdgeIds);
  }
}
