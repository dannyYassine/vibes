import type { GrooveboxApiModel, IGrooveboxGateway } from "../data/GrooveboxGateway";
import type { AudioPatchModel, IGrooveboxAudioGateway } from "../data/GrooveboxAudioGateway";
import { Groovebox, type Patch, type UnitId } from "./Groovebox";
import type { GrooveboxStore } from "../state/GrooveboxStore";

export class GrooveboxService {
  constructor(
    private readonly gateway: IGrooveboxGateway,
    private readonly audioGateway: IGrooveboxAudioGateway,
    private readonly store: GrooveboxStore,
  ) {}

  loadPatches(): Groovebox {
    const models = this.gateway.loadPatches();
    const session = new Groovebox(models.map((model) => this.toPatch(model)), models[0].patch_id);
    this.store.set(session);
    this.audioGateway.updatePatch(this.toAudioPatch(session.currentPatch));
    return session;
  }

  getSession(): Groovebox {
    return this.store.get();
  }

  selectPatch(patchId: string): Groovebox {
    return this.commit(this.store.get().selectPatch(patchId));
  }

  changeTempo(tempo: number): Groovebox {
    return this.commit(this.store.get().changeTempo(tempo));
  }

  changeSwing(swing: number): Groovebox {
    return this.commit(this.store.get().changeSwing(swing));
  }

  changeMasterVolume(volume: number): Groovebox {
    return this.commit(this.store.get().changeMasterVolume(volume));
  }

  changeControl(unitId: UnitId, key: string, value: number): Groovebox {
    return this.commit(this.store.get().changeControl(unitId, key, value));
  }

  toggleMute(unitId: UnitId): Groovebox {
    return this.commit(this.store.get().toggleMute(unitId));
  }

  toggleStep(unitId: UnitId, trackIndex: number, stepIndex: number): Groovebox {
    return this.commit(this.store.get().toggleStep(unitId, trackIndex, stepIndex));
  }

  accentStep(unitId: UnitId, trackIndex: number, stepIndex: number): Groovebox {
    return this.commit(this.store.get().accentStep(unitId, trackIndex, stepIndex));
  }

  clearPattern(unitId: UnitId, trackIndex: number): Groovebox {
    return this.commit(this.store.get().clearPattern(unitId, trackIndex));
  }

  async startPlayback(onStep: (step: number) => void): Promise<void> {
    await this.audioGateway.start(this.toAudioPatch(this.store.get().currentPatch), onStep);
  }

  stopPlayback(): void {
    this.audioGateway.stop();
  }

  dispose(): void {
    this.audioGateway.dispose();
  }

  private commit(session: Groovebox): Groovebox {
    this.store.set(session);
    this.audioGateway.updatePatch(this.toAudioPatch(session.currentPatch));
    return session;
  }

  private toPatch(model: GrooveboxApiModel): Patch {
    return {
      id: model.patch_id,
      name: model.name,
      subtitle: model.subtitle,
      tempo: model.tempo,
      swing: model.swing,
      masterVolume: model.master_volume,
      units: model.units.map((unit) => {
        if (!["drums", "bass", "pads", "lead"].includes(unit.unit_id)) {
          throw new Error(`Unknown unit: ${unit.unit_id}`);
        }
        return {
          id: unit.unit_id as UnitId,
          name: unit.name,
          voice: unit.voice,
          muted: unit.muted,
          rootNote: unit.root_note,
          controls: unit.controls.map((control) => ({ ...control })),
          patterns: unit.patterns.map((pattern) => pattern.map((step) => ({ ...step }))),
        };
      }),
    };
  }

  private toAudioPatch(patch: Patch): AudioPatchModel {
    return {
      tempo: patch.tempo,
      swing: patch.swing,
      masterVolume: patch.masterVolume,
      units: patch.units.map((unit) => ({
        id: unit.id,
        muted: unit.muted,
        rootNote: unit.rootNote,
        controls: Object.fromEntries(unit.controls.map((control) => [control.key, control.value])),
        patterns: unit.patterns.map((pattern) => pattern.map((step) => ({ ...step }))),
      })),
    };
  }
}
