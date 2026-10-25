import type { AudioGateway, AudioNote, AudioPatch, AudioUnitId } from '../data/AudioGateway';
import type { PatchGateway } from '../data/PatchGateway';
import { UNIT_CONTROLS, TEMPO_RANGE, SWING_RANGE, VOLUME_RANGE } from './Controls';
import type { AudioDrumVoice } from '../data/AudioGateway';
import type { DrumVoice, Patch, UnitId } from './Patch';
import { clonePatch, DEFAULT_PATCHES } from './defaultPatches';
import { chordIntervals, clamp, transposeInScale } from './Music';

export interface GrooveboxSnapshot {
  patch: Patch;
  patches: readonly Patch[];
  muted: Record<UnitId, boolean>;
  playing: boolean;
  currentStep: number;
}

const UNIT_IDS: UnitId[] = ['drums', 'bass', 'pads', 'lead'];
const DRUM_VOICES: DrumVoice[] = ['kick', 'snare', 'hat', 'perc'];

export class GrooveboxService {
  private readonly patches: Patch[] = DEFAULT_PATCHES.map(clonePatch);
  private currentPatchId: string = DEFAULT_PATCHES[0].id;
  private readonly muted: Record<UnitId, boolean> = {
    drums: false,
    bass: false,
    pads: false,
    lead: false,
  };
  private playing = false;

  constructor(
    private readonly patchGateway: PatchGateway,
    private readonly audio: AudioGateway,
  ) {}

  async initialize(): Promise<void> {
    const selectedId = await this.patchGateway.loadSelectedPatchId();
    if (selectedId && this.patches.some((patch) => patch.id === selectedId)) {
      this.currentPatchId = selectedId;
    }
    this.pushPatchToAudio();
  }

  get patch(): Patch {
    return this.patches.find((patch) => patch.id === this.currentPatchId) ?? this.patches[0];
  }

  get allPatches(): readonly Patch[] {
    return this.patches;
  }

  getSnapshot(): GrooveboxSnapshot {
    return {
      patch: this.patch,
      patches: this.patches,
      muted: { ...this.muted },
      playing: this.playing,
      currentStep: this.currentStep(),
    };
  }

  selectPatch(patchId: string): void {
    if (!this.patches.some((patch) => patch.id === patchId)) return;
    this.currentPatchId = patchId;
    this.pushPatchToAudio();
    void this.patchGateway.saveSelectedPatchId(patchId);
  }

  async togglePlay(): Promise<boolean> {
    if (this.playing) {
      this.audio.stop();
      this.playing = false;
      return false;
    }

    // Always hand over the freshest patch before the transport starts.
    this.pushPatchToAudio();
    await this.audio.start();
    this.playing = true;
    return true;
  }

  stop(): void {
    if (!this.playing) return;
    this.audio.stop();
    this.playing = false;
  }

  setTempo(value: number): number {
    const next = Math.round(clamp(value, TEMPO_RANGE.min, TEMPO_RANGE.max));
    this.patch.bpm = next;
    this.pushPatchToAudio();
    return next;
  }

  setSwing(value: number): number {
    const next = Math.round(clamp(value, SWING_RANGE.min, SWING_RANGE.max) * 100) / 100;
    this.patch.swing = next;
    this.pushPatchToAudio();
    return next;
  }

  setMasterVolume(value: number): number {
    const next = Math.round(clamp(value, VOLUME_RANGE.min, VOLUME_RANGE.max) * 100) / 100;
    this.patch.masterVolume = next;
    this.pushPatchToAudio();
    return next;
  }

  resetTempo(): number {
    const original = DEFAULT_PATCHES.find((patch) => patch.id === this.currentPatchId);
    return this.setTempo(original?.bpm ?? 120);
  }

  resetSwing(): number {
    const original = DEFAULT_PATCHES.find((patch) => patch.id === this.currentPatchId);
    return this.setSwing(original?.swing ?? 0);
  }

  resetMasterVolume(): number {
    const original = DEFAULT_PATCHES.find((patch) => patch.id === this.currentPatchId);
    return this.setMasterVolume(original?.masterVolume ?? 0.8);
  }

  toggleMute(unit: UnitId): boolean {
    if (!UNIT_IDS.includes(unit)) return false;
    this.muted[unit] = !this.muted[unit];
    this.audio.setUnitMuted(unit, this.muted[unit]);
    return this.muted[unit];
  }

  toggleStep(unit: UnitId, lane: DrumVoice | 'steps', index: number, accent = false): void {
    if (index < 0 || index >= 16) return;

    if (unit === 'drums') {
      const voice = (DRUM_VOICES.includes(lane as DrumVoice) ? lane : 'kick') as DrumVoice;
      const step = this.patch.drums.pattern[voice][index];
      this.flipStep(step, accent);
      this.pushPatchToAudio();
      return;
    }

    const melodic = this.getMelodicPatch(unit);
    if (!melodic) return;
    this.flipStep(melodic.steps[index], accent);
    this.pushPatchToAudio();
  }

  transposeStep(unit: UnitId, index: number, direction: number): number {
    const melodic = this.getMelodicPatch(unit);
    if (!melodic || index < 0 || index >= melodic.steps.length) return 60;
    const step = melodic.steps[index];
    step.note = transposeInScale(step.note, direction, melodic.root, melodic.scale);
    this.pushPatchToAudio();
    return step.note;
  }

  setParam(unit: UnitId, paramId: string, value: number): number {
    const range = UNIT_CONTROLS[unit].find((control) => control.id === paramId);
    if (!range) return value;

    const next = clamp(value, range.min, range.max);
    const params = this.patch[unit].params as unknown as Record<string, number>;
    if (!(paramId in params)) return next;
    params[paramId] = next;
    this.pushPatchToAudio();
    return next;
  }

  resetParam(unit: UnitId, paramId: string): number {
    const original = DEFAULT_PATCHES.find((patch) => patch.id === this.currentPatchId);
    if (!original) return 0;
    const params = original[unit].params as unknown as Record<string, number>;
    const range = UNIT_CONTROLS[unit].find((control) => control.id === paramId);
    const value = params[paramId] ?? (range ? (range.min + range.max) / 2 : 0);
    return this.setParam(unit, paramId, value);
  }

  async audition(unit: UnitId): Promise<void> {
    this.pushPatchToAudio();
    await this.audio.audition(unit as AudioUnitId);
  }

  currentStep(): number {
    if (!this.playing) return -1;
    return this.audio.currentStep();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private flipStep(step: { on: boolean; velocity: number }, accent: boolean): void {
    if (accent) {
      if (!step.on) {
        step.on = true;
        step.velocity = 1;
      } else {
        step.velocity = step.velocity >= 0.99 ? 0.8 : 1;
      }
      return;
    }
    step.on = !step.on;
    step.velocity = step.on ? 0.8 : 0;
  }

  private getMelodicPatch(unit: UnitId): { steps: { on: boolean; note: number; velocity: number }[]; scale: number[]; root: number } | null {
    if (unit === 'bass') return this.patch.bass;
    if (unit === 'pads') return this.patch.pads;
    if (unit === 'lead') return this.patch.lead;
    return null;
  }

  private pushPatchToAudio(): void {
    this.audio.loadPatch(this.toAudioPatch(this.patch));
  }

  private toAudioPatch(patch: Patch): AudioPatch {
    const drumPattern = {} as Record<AudioDrumVoice, number[]>;
    for (const voice of DRUM_VOICES) {
      drumPattern[voice] = patch.drums.pattern[voice].map((step) => (step.on ? step.velocity : 0));
    }

    const notes = (steps: { on: boolean; note: number; velocity: number }[]): AudioNote[] =>
      steps.map((step) => ({ note: step.note, velocity: step.on ? step.velocity : 0 }));

    return {
      bpm: patch.bpm,
      swing: patch.swing,
      masterVolume: patch.masterVolume,
      drums: {
        tune: patch.drums.params.tune,
        decay: patch.drums.params.decay,
        tone: patch.drums.params.tone,
        drive: patch.drums.params.drive,
        volume: patch.drums.params.volume,
        reverb: patch.drums.params.reverb,
        pattern: drumPattern,
      },
      bass: {
        cutoff: patch.bass.params.cutoff,
        resonance: patch.bass.params.resonance,
        decay: patch.bass.params.decay,
        drive: patch.bass.params.drive,
        volume: patch.bass.params.volume,
        reverb: patch.bass.params.reverb,
        notes: notes(patch.bass.steps),
      },
      pads: {
        cutoff: patch.pads.params.cutoff,
        attack: patch.pads.params.attack,
        release: patch.pads.params.release,
        space: patch.pads.params.space,
        volume: patch.pads.params.volume,
        chordIntervals: chordIntervals(patch.pads.chord),
        notes: notes(patch.pads.steps),
      },
      lead: {
        cutoff: patch.lead.params.cutoff,
        resonance: patch.lead.params.resonance,
        decay: patch.lead.params.decay,
        delay: patch.lead.params.delay,
        volume: patch.lead.params.volume,
        reverb: patch.lead.params.reverb,
        notes: notes(patch.lead.steps),
      },
    };
  }
}
