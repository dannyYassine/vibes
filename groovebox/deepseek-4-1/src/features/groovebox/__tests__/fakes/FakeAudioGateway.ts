import type { AudioGateway, AudioPatch, AudioUnitId } from '../../data/AudioGateway';

export class FakeAudioGateway implements AudioGateway {
  readonly patches: AudioPatch[] = [];
  readonly muted: Record<string, boolean> = {};
  readonly auditions: AudioUnitId[] = [];
  readonly calls: string[] = [];
  running = false;

  loadPatch(patch: AudioPatch): void {
    this.patches.push(patch);
    this.calls.push('loadPatch');
  }

  async start(): Promise<void> {
    this.running = true;
    this.calls.push('start');
  }

  stop(): void {
    this.running = false;
    this.calls.push('stop');
  }

  setUnitMuted(unit: AudioUnitId, muted: boolean): void {
    this.muted[unit] = muted;
    this.calls.push(`mute:${unit}:${muted}`);
  }

  async audition(unit: AudioUnitId): Promise<void> {
    this.auditions.push(unit);
    this.calls.push('audition');
  }

  currentStep(): number {
    return this.running ? 0 : -1;
  }

  isRunning(): boolean {
    return this.running;
  }

  get lastPatch(): AudioPatch | undefined {
    return this.patches[this.patches.length - 1];
  }
}
