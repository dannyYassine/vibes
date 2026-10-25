import type { PatchGateway } from '../../data/PatchGateway';

export class FakePatchGateway implements PatchGateway {
  selectedId: string | null;
  readonly savedIds: string[] = [];

  constructor(selectedId: string | null = null) {
    this.selectedId = selectedId;
  }

  async loadSelectedPatchId(): Promise<string | null> {
    return this.selectedId;
  }

  async saveSelectedPatchId(patchId: string): Promise<void> {
    this.selectedId = patchId;
    this.savedIds.push(patchId);
  }
}
