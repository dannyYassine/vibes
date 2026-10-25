export type UnitViewId = "drums" | "bass" | "pads" | "lead";

export class ControlViewModel {
  key = "";
  label = "";
  value = 0;
  min = 0;
  max = 1;
  step = 0.01;
  unit = "%";

  get displayValue(): string {
    if (this.unit === "%") return `${Math.round(this.value * 100)}%`;
    if (this.unit === "Hz") {
      return this.value >= 1000 ? `${(this.value / 1000).toFixed(1)}k` : `${Math.round(this.value)}`;
    }
    if (this.unit === "s") return `${this.value.toFixed(2)}s`;
    if (this.unit === "Q") return this.value.toFixed(1);
    return this.value.toFixed(2);
  }

  get angle(): number {
    const ratio = (this.value - this.min) / (this.max - this.min);
    return -135 + ratio * 270;
  }
}

export class StepViewModel {
  active = false;
  velocity = 0.8;

  get accented(): boolean {
    return this.active && this.velocity >= 0.99;
  }
}

export class UnitViewModel {
  id: UnitViewId = "drums";
  name = "";
  voice = "";
  muted = false;
  isDrum = false;
  selectedTrack = 0;
  trackLabels: string[] = [];
  trackActivity: boolean[] = [];
  controls: ControlViewModel[] = [];
  steps: StepViewModel[] = [];

  get trackName(): string {
    return this.trackLabels[this.selectedTrack] ?? "PATTERN";
  }
}

export class PatchSummaryViewModel {
  id = "";
  name = "";
  subtitle = "";
  index = 0;
  active = false;

  get numberLabel(): string {
    return String(this.index + 1).padStart(2, "0");
  }
}

export class GrooveboxViewModel {
  patchId = "";
  patchName = "";
  patchSubtitle = "";
  tempo = 120;
  swing = 0;
  masterVolume = 0.78;
  isPlaying = false;
  isBusy = false;
  currentStep = -1;
  drumTrack = 0;
  errorMessage: string | null = null;
  patches: PatchSummaryViewModel[] = [];
  units: UnitViewModel[] = [];
  waveform = [18, 32, 48, 72, 44, 84, 58, 94, 68, 38, 78, 54, 88, 42, 66, 98, 56, 76, 36, 64, 86, 46, 28, 62];

  get tempoLabel(): string {
    return String(this.tempo).padStart(3, "0");
  }

  get swingLabel(): string {
    return `${Math.round(this.swing * 100)}%`;
  }

  get masterLabel(): string {
    return `${Math.round(this.masterVolume * 100)}%`;
  }

  get transportLabel(): string {
    return this.isPlaying ? "RUNNING" : "STOPPED";
  }

  get stepLabel(): string {
    return this.currentStep < 0 ? "--" : String(this.currentStep + 1).padStart(2, "0");
  }
}
