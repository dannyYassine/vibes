import { Presenter } from "@/infra/presenter/Presenter";
import type { Groovebox, Unit } from "../domain/Groovebox";
import type { GrooveboxService } from "../domain/GrooveboxService";
import {
  ControlViewModel,
  GrooveboxViewModel,
  PatchSummaryViewModel,
  StepViewModel,
  UnitViewModel,
} from "./GrooveboxViewModel";

export class GrooveboxPresenter extends Presenter<GrooveboxViewModel> {
  vm: GrooveboxViewModel;

  constructor(private readonly service: GrooveboxService) {
    const vm = new GrooveboxViewModel();
    super(vm);
    this.vm = vm;
  }

  override onCreated(): void {
    this.sync(this.service.loadPatches());
  }

  override onDestroyed(): void {
    this.service.stopPlayback();
  }

  async togglePlayback(): Promise<void> {
    if (this.vm.isBusy) return;
    if (this.vm.isPlaying) {
      this.service.stopPlayback();
      const next = this.copySession();
      next.isPlaying = false;
      next.currentStep = -1;
      this.commit(next);
      return;
    }

    const pending = this.copySession();
    pending.isBusy = true;
    pending.errorMessage = null;
    this.commit(pending);
    try {
      await this.service.startPlayback((step) => this.showStep(step));
      const next = this.copySession();
      next.isBusy = false;
      next.isPlaying = true;
      this.commit(next);
    } catch (error) {
      const next = this.copySession();
      next.isBusy = false;
      next.isPlaying = false;
      next.errorMessage = error instanceof Error ? error.message : "Audio could not be started";
      this.commit(next);
    }
  }

  selectPatch(patchId: string): void {
    this.sync(this.service.selectPatch(patchId));
  }

  changeTempo(tempo: number): void {
    this.sync(this.service.changeTempo(tempo));
  }

  adjustTempo(amount: number): void {
    this.changeTempo(this.vm.tempo + amount);
  }

  changeSwing(swing: number): void {
    this.sync(this.service.changeSwing(swing));
  }

  changeMasterVolume(volume: number): void {
    this.sync(this.service.changeMasterVolume(volume));
  }

  changeControl(unitId: Unit["id"], key: string, value: number): void {
    this.sync(this.service.changeControl(unitId, key, value));
  }

  toggleMute(unitId: Unit["id"]): void {
    this.sync(this.service.toggleMute(unitId));
  }

  changeStep(unitId: Unit["id"], stepIndex: number, accent: boolean): void {
    const track = unitId === "drums" ? this.vm.drumTrack : 0;
    const session = accent
      ? this.service.accentStep(unitId, track, stepIndex)
      : this.service.toggleStep(unitId, track, stepIndex);
    this.sync(session);
  }

  clearPattern(unitId: Unit["id"]): void {
    const track = unitId === "drums" ? this.vm.drumTrack : 0;
    this.sync(this.service.clearPattern(unitId, track));
  }

  selectDrumTrack(track: number): void {
    const next = this.copySession();
    next.drumTrack = track;
    this.commit(next);
  }

  dismissError(): void {
    const next = this.copySession();
    next.errorMessage = null;
    this.commit(next);
  }

  private showStep(step: number): void {
    const next = this.copySession();
    next.currentStep = step;
    this.commit(next);
  }

  private sync(session: Groovebox): void {
    const next = this.project(session);
    this.commit(next);
  }

  private copySession(): GrooveboxViewModel {
    return this.project(this.service.getSession());
  }

  private project(session: Groovebox): GrooveboxViewModel {
    const previous = this.vm;
    const next = new GrooveboxViewModel();
    const patch = session.currentPatch;
    next.patchId = patch.id;
    next.patchName = patch.name;
    next.patchSubtitle = patch.subtitle;
    next.tempo = patch.tempo;
    next.swing = patch.swing;
    next.masterVolume = patch.masterVolume;
    next.isPlaying = previous.isPlaying;
    next.isBusy = previous.isBusy;
    next.currentStep = previous.currentStep;
    next.drumTrack = previous.drumTrack;
    next.errorMessage = previous.errorMessage;
    next.patches = session.patches.map((candidate, index) => {
      const summary = new PatchSummaryViewModel();
      summary.id = candidate.id;
      summary.name = candidate.name;
      summary.subtitle = candidate.subtitle;
      summary.index = index;
      summary.active = candidate.id === patch.id;
      return summary;
    });
    next.units = patch.units.map((unit) => this.projectUnit(unit, next.drumTrack));
    return next;
  }

  private projectUnit(unit: Unit, drumTrack: number): UnitViewModel {
    const next = new UnitViewModel();
    const selectedTrack = unit.id === "drums" ? drumTrack : 0;
    next.id = unit.id;
    next.name = unit.name;
    next.voice = unit.voice;
    next.muted = unit.muted;
    next.isDrum = unit.id === "drums";
    next.selectedTrack = selectedTrack;
    next.trackLabels = unit.id === "drums" ? ["KICK", "SNARE", "HAT", "CLAP"] : ["PATTERN"];
    next.trackActivity = unit.patterns.map((pattern) => pattern.some((step) => step.active));
    next.controls = unit.controls.map((control) => {
      const draft = new ControlViewModel();
      draft.key = control.key;
      draft.label = control.label;
      draft.value = control.value;
      draft.min = control.min;
      draft.max = control.max;
      draft.step = control.step;
      draft.unit = control.unit;
      return draft;
    });
    next.steps = unit.patterns[selectedTrack].map((step) => {
      const draft = new StepViewModel();
      draft.active = step.active;
      draft.velocity = step.velocity;
      return draft;
    });
    return next;
  }

  private commit(next: GrooveboxViewModel): void {
    this.vm = next;
    this.replaceState(next);
  }
}
