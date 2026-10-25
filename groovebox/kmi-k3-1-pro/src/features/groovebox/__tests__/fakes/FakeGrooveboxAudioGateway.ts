import { IGrooveboxAudioGateway, type AudioPatchModel } from "../../data/GrooveboxAudioGateway";

export class FakeGrooveboxAudioGateway extends IGrooveboxAudioGateway {
  patch: AudioPatchModel | null = null;
  playing = false;
  startCount = 0;
  stopCount = 0;
  private onStep: ((step: number) => void) | null = null;

  async start(patch: AudioPatchModel, onStep: (step: number) => void): Promise<void> {
    this.patch = structuredClone(patch);
    this.onStep = onStep;
    this.playing = true;
    this.startCount += 1;
  }

  updatePatch(patch: AudioPatchModel): void {
    this.patch = structuredClone(patch);
  }

  stop(): void {
    this.playing = false;
    this.stopCount += 1;
  }

  dispose(): void {
    this.stop();
  }

  emitStep(step: number): void {
    this.onStep?.(step);
  }
}
