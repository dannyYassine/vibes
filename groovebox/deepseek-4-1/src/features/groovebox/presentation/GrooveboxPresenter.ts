import { Presenter } from '@/infra/presenter/Presenter';
import {
  SWING_RANGE,
  TEMPO_RANGE,
  UNIT_CONTROLS,
  UNIT_META,
  VOLUME_RANGE,
  type ParamRange,
} from '../domain/Controls';
import type { GrooveboxService, GrooveboxSnapshot } from '../domain/GrooveboxService';
import {
  formatHz,
  formatPercent,
  formatSeconds,
  formatSemitones,
  noteLabel,
} from '../domain/Music';
import type { DrumVoice, Patch, UnitId } from '../domain/Patch';
import {
  GrooveboxViewModel,
  type ControlViewModel,
  type MelodicStepViewModel,
  type UnitViewModel,
} from './GrooveboxViewModel';

const UNIT_ORDER: UnitId[] = ['drums', 'bass', 'pads', 'lead'];
const DRUM_VOICES: Array<{ id: DrumVoice; label: string }> = [
  { id: 'kick', label: 'KICK' },
  { id: 'snare', label: 'SNARE' },
  { id: 'hat', label: 'HAT' },
  { id: 'perc', label: 'PERC' },
];

export class GrooveboxPresenter extends Presenter<GrooveboxViewModel> {
  public readonly vm: GrooveboxViewModel;
  private initialized = false;

  constructor(private readonly service: GrooveboxService) {
    const vm = new GrooveboxViewModel();
    super(vm);
    this.vm = vm;
    this.buildUnits();
    this.sync(this.service.getSnapshot());
    this.setDefaultDisplays();
  }

  async onMounted(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await this.service.initialize();
      this.sync(this.service.getSnapshot());
      this.setDefaultDisplays();
    } catch {
      this.vm.message = 'STORAGE UNAVAILABLE — DEFAULTS LOADED';
    }
    this.notify();
  }

  async togglePlay(): Promise<void> {
    try {
      const playing = await this.service.togglePlay();
      this.vm.playing = playing;
      this.vm.currentStep = playing ? this.service.currentStep() : -1;
      this.vm.message = '';
    } catch {
      this.vm.message = 'AUDIO BLOCKED — CLICK PLAY AGAIN';
      this.vm.playing = false;
    }
    this.notify();
  }

  stop(): void {
    this.service.stop();
    this.vm.playing = false;
    this.vm.currentStep = -1;
    this.vm.message = '';
    this.notify();
  }

  selectPatch(patchId: string): void {
    this.service.selectPatch(patchId);
    this.sync(this.service.getSnapshot());
    this.setDefaultDisplays();
    this.notify();
  }

  selectPatchByIndex(index: number): void {
    const summary = this.vm.patches[index];
    if (summary) this.selectPatch(summary.id);
  }

  toggleMute(unitId: UnitId): void {
    const muted = this.service.toggleMute(unitId);
    const unit = this.findUnit(unitId);
    if (!unit) return;
    unit.muted = muted;
    unit.displayLine1 = muted ? 'SIGNAL CUT' : UNIT_META[unitId].subtitle;
    unit.displayLine2 = muted ? 'MUTED' : this.defaultSecondLine(unitId, this.service.patch);
    this.notify();
  }

  toggleStep(unitId: UnitId, lane: DrumVoice | 'steps', index: number, accent = false): void {
    this.service.toggleStep(unitId, lane, index, accent);
    const unit = this.findUnit(unitId);
    if (!unit) return;

    if (unitId === 'drums') {
      const voice = DRUM_VOICES.find((item) => item.id === lane)?.id ?? 'kick';
      const target = DRUM_VOICES.find((item) => item.id === voice);
      const step = this.service.patch.drums.pattern[voice][index];
      unit.displayLine1 = `STEP ${String(index + 1).padStart(2, '0')}`;
      unit.displayLine2 = `${target?.label ?? 'VOICE'} ${step?.on ? (step.velocity >= 0.99 ? 'ACCENT' : 'ON') : 'OFF'}`;
      this.updateDrumUnit(unitId);
    } else {
      const step = this.getMelodicStep(unitId, index);
      unit.displayLine1 = `STEP ${String(index + 1).padStart(2, '0')}`;
      unit.displayLine2 = step
        ? `${noteLabel(step.note)} · ${step.on ? (step.velocity >= 0.99 ? 'ACCENT' : 'ON') : 'OFF'}`
        : '';
      this.updateMelodicUnit(unitId);
    }
    this.notify();
  }

  transposeStep(unitId: UnitId, index: number, direction: number): void {
    if (unitId === 'drums') return;
    this.service.transposeStep(unitId, index, direction);
    const step = this.getMelodicStep(unitId, index);
    const unit = this.findUnit(unitId);
    if (!unit || !step) return;
    unit.displayLine1 = `STEP ${String(index + 1).padStart(2, '0')}`;
    unit.displayLine2 = `NOTE ${noteLabel(step.note)}`;
    this.updateMelodicUnit(unitId);
    this.notify();
  }

  setControl(unitId: UnitId, controlId: string, value: number): void {
    const next = this.service.setParam(unitId, controlId, value);
    this.applyControlValue(unitId, controlId, next);
  }

  resetControl(unitId: UnitId, controlId: string): void {
    const value = this.service.resetParam(unitId, controlId);
    this.applyControlValue(unitId, controlId, value);
  }

  private applyControlValue(unitId: UnitId, controlId: string, next: number): void {
    const range = UNIT_CONTROLS[unitId].find((control) => control.id === controlId);
    const control = this.findUnit(unitId)?.controls.find((item) => item.id === controlId);
    if (control && range) {
      control.value = next;
      control.valueLabel = this.formatControlValue(controlId, next);
    }
    const unit = this.findUnit(unitId);
    if (unit) {
      unit.displayLine1 = range?.label ?? controlId.toUpperCase();
      unit.displayLine2 = this.formatControlValue(controlId, next);
    }
    this.notify();
  }

  setTempo(value: number): void {
    this.vm.bpm = this.service.setTempo(value);
    const summary = this.vm.patches[this.vm.patchIndex];
    if (summary) summary.bpm = this.vm.bpm;
    this.notify();
  }

  setSwing(value: number): void {
    this.vm.swing = this.service.setSwing(value);
    this.notify();
  }

  setMasterVolume(value: number): void {
    this.vm.masterVolume = this.service.setMasterVolume(value);
    this.notify();
  }

  resetTempo(): void {
    this.vm.bpm = this.service.resetTempo();
    const summary = this.vm.patches[this.vm.patchIndex];
    if (summary) summary.bpm = this.vm.bpm;
    this.notify();
  }

  resetSwing(): void {
    this.vm.swing = this.service.resetSwing();
    this.notify();
  }

  resetMasterVolume(): void {
    this.vm.masterVolume = this.service.resetMasterVolume();
    this.notify();
  }

  async audition(unitId: UnitId): Promise<void> {
    const unit = this.findUnit(unitId);
    if (unit) {
      unit.displayLine1 = 'AUDITION';
      unit.displayLine2 = UNIT_META[unitId].name;
      this.notify();
    }
    try {
      await this.service.audition(unitId);
    } catch {
      this.vm.message = 'AUDIO UNAVAILABLE';
      this.notify();
    }
  }

  /** Called by the view's rAF loop — does not notify, only advances the playhead. */
  pollStep(): number {
    const step = this.service.currentStep();
    this.vm.currentStep = step;
    return step;
  }

  get tempoRange(): ParamRange {
    return TEMPO_RANGE;
  }

  get swingRange(): ParamRange {
    return SWING_RANGE;
  }

  get volumeRange(): ParamRange {
    return VOLUME_RANGE;
  }

  formatTempo(value: number): string {
    return `${Math.round(value)}`;
  }

  formatSwing(value: number): string {
    return formatPercent(value);
  }

  formatVolume(value: number): string {
    return formatPercent(value);
  }

  private buildUnits(): void {
    this.vm.units = UNIT_ORDER.map((unitId) => {
      const meta = UNIT_META[unitId];
      const controls: ControlViewModel[] = UNIT_CONTROLS[unitId].map((range) => ({
        id: range.id,
        label: range.label,
        value: range.min,
        min: range.min,
        max: range.max,
        origin: range.origin ?? (range.min + range.max) / 2,
        valueLabel: '',
      }));
      const unit: UnitViewModel = {
        id: unitId,
        index: meta.index,
        name: meta.name,
        subtitle: meta.subtitle,
        kind: unitId === 'drums' ? 'drums' : 'melodic',
        muted: false,
        steps: [],
        lanes: [],
        controls,
        displayLine1: meta.subtitle,
        displayLine2: '',
        chord: null,
      };
      if (unitId === 'drums') {
        unit.lanes = DRUM_VOICES.map((voice) => ({
          id: voice.id,
          label: voice.label,
          steps: Array.from({ length: 16 }, () => ({ on: false, velocity: 0 })),
        }));
      } else {
        unit.steps = Array.from({ length: 16 }, (): MelodicStepViewModel => ({
          on: false,
          velocity: 0,
          note: 60,
          noteLabel: 'C4',
        }));
      }
      return unit;
    });
  }

  private sync(snapshot: GrooveboxSnapshot): void {
    const patch = snapshot.patch;
    this.vm.patchId = patch.id;
    this.vm.patchName = patch.name;
    this.vm.patchTagline = patch.tagline;
    this.vm.patchIndex = snapshot.patches.findIndex((item) => item.id === patch.id);
    this.vm.patches = snapshot.patches.map((item: Patch) => ({
      id: item.id,
      name: item.name,
      tagline: item.tagline,
      bpm: item.bpm,
    }));
    this.vm.bpm = patch.bpm;
    this.vm.swing = patch.swing;
    this.vm.masterVolume = patch.masterVolume;
    this.vm.playing = snapshot.playing;
    this.vm.currentStep = snapshot.currentStep;

    for (const unitId of UNIT_ORDER) {
      const unit = this.findUnit(unitId);
      if (!unit) continue;
      unit.muted = snapshot.muted[unitId];
      if (unitId === 'drums') this.updateDrumUnit(unitId);
      else this.updateMelodicUnit(unitId);

      const params = patch[unitId].params as unknown as Record<string, number>;
      for (const control of unit.controls) {
        control.value = params[control.id] ?? control.value;
        control.valueLabel = this.formatControlValue(control.id, control.value);
      }
      if (unitId === 'pads') unit.chord = patch.pads.chord;
    }
  }

  private updateDrumUnit(unitId: UnitId): void {
    const unit = this.findUnit(unitId);
    if (!unit) return;
    const pattern = this.service.patch.drums.pattern;
    for (const lane of unit.lanes) {
      const source = pattern[lane.id as DrumVoice];
      lane.steps = source.map((step) => ({ on: step.on, velocity: step.velocity }));
    }
  }

  private updateMelodicUnit(unitId: UnitId): void {
    const unit = this.findUnit(unitId);
    if (!unit) return;
    const steps = this.getMelodicSteps(unitId);
    if (!steps) return;
    unit.steps = steps.map((step) => ({
      on: step.on,
      velocity: step.velocity,
      note: step.note,
      noteLabel: noteLabel(step.note),
    }));
  }

  private getMelodicSteps(unitId: UnitId): { on: boolean; note: number; velocity: number }[] | null {
    if (unitId === 'bass') return this.service.patch.bass.steps;
    if (unitId === 'pads') return this.service.patch.pads.steps;
    if (unitId === 'lead') return this.service.patch.lead.steps;
    return null;
  }

  private getMelodicStep(unitId: UnitId, index: number): { on: boolean; note: number; velocity: number } | null {
    return this.getMelodicSteps(unitId)?.[index] ?? null;
  }

  private findUnit(unitId: UnitId): UnitViewModel | undefined {
    return this.vm.units.find((unit) => unit.id === unitId);
  }

  private setDefaultDisplays(): void {
    const patch = this.service.patch;
    for (const unitId of UNIT_ORDER) {
      const unit = this.findUnit(unitId);
      if (!unit) continue;
      unit.displayLine1 = UNIT_META[unitId].subtitle;
      unit.displayLine2 = this.defaultSecondLine(unitId, patch);
    }
  }

  private defaultSecondLine(unitId: UnitId, patch: Patch): string {
    if (unitId === 'drums') {
      const hits = DRUM_VOICES.reduce(
        (total, voice) => total + patch.drums.pattern[voice.id].filter((step) => step.on).length,
        0,
      );
      return `${hits} HITS · 16 STEPS`;
    }
    if (unitId === 'bass') return `ROOT ${noteLabel(patch.bass.root)} · SUB`;
    if (unitId === 'pads') return `${patch.pads.chord.toUpperCase()} · ROOT ${noteLabel(patch.pads.root)}`;
    return `ROOT ${noteLabel(patch.lead.root)} · PHRASE`;
  }

  private formatControlValue(controlId: string, value: number): string {
    if (controlId === 'cutoff') return formatHz(value);
    if (controlId === 'tune') return formatSemitones(value);
    if (controlId === 'decay' || controlId === 'attack' || controlId === 'release') {
      return formatSeconds(value);
    }
    return formatPercent(value);
  }
}
