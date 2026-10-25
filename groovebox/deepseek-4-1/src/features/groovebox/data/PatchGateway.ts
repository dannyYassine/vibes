/**
 * Layer 1 gateway. Owns the wire/API shape for patch persistence.
 * Only the selected patch id is persisted; sound edits are session-local.
 */
export interface PatchGateway {
  loadSelectedPatchId(): Promise<string | null>;
  saveSelectedPatchId(patchId: string): Promise<void>;
}

export class LocalStoragePatchGateway implements PatchGateway {
  private static readonly KEY = 'voltage-gb04.selected-patch';

  async loadSelectedPatchId(): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(LocalStoragePatchGateway.KEY) ?? null;
    } catch {
      return null;
    }
  }

  async saveSelectedPatchId(patchId: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(LocalStoragePatchGateway.KEY, patchId);
    } catch {
      // Private browsing or blocked storage — the instrument still works.
    }
  }
}
