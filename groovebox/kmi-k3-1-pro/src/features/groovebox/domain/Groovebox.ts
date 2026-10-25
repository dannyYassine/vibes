export const UNIT_IDS = ["drums", "bass", "pads", "lead"] as const;
export type UnitId = (typeof UNIT_IDS)[number];

export type Control = {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
};

export type Step = {
  active: boolean;
  note: number;
  velocity: number;
  length: number;
};

export type Unit = {
  id: UnitId;
  name: string;
  voice: string;
  muted: boolean;
  rootNote: number;
  controls: Control[];
  patterns: Step[][];
};

export type Patch = {
  id: string;
  name: string;
  subtitle: string;
  tempo: number;
  swing: number;
  masterVolume: number;
  units: Unit[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class Groovebox {
  constructor(
    public readonly patches: Patch[],
    public readonly currentPatchId: string,
  ) {
    if (patches.length === 0) throw new Error("Groovebox requires at least one patch");
    if (!patches.some((patch) => patch.id === currentPatchId)) {
      throw new Error("Groovebox current patch must exist");
    }
    for (const patch of patches) {
      if (patch.units.length !== UNIT_IDS.length) throw new Error(`${patch.name} requires four units`);
      for (const unit of patch.units) {
        if (unit.patterns.some((pattern) => pattern.length !== 16)) {
          throw new Error(`${unit.name} patterns must contain exactly 16 steps`);
        }
      }
    }
  }

  get currentPatch(): Patch {
    const patch = this.patches.find((candidate) => candidate.id === this.currentPatchId);
    if (!patch) throw new Error("Current patch not found");
    return patch;
  }

  selectPatch(patchId: string): Groovebox {
    if (!this.patches.some((patch) => patch.id === patchId)) throw new Error(`Unknown patch: ${patchId}`);
    return new Groovebox(this.patches, patchId);
  }

  changeTempo(tempo: number): Groovebox {
    return this.replaceCurrentPatch({ ...this.currentPatch, tempo: Math.round(clamp(tempo, 60, 180)) });
  }

  changeSwing(swing: number): Groovebox {
    return this.replaceCurrentPatch({ ...this.currentPatch, swing: clamp(swing, 0, 0.65) });
  }

  changeMasterVolume(masterVolume: number): Groovebox {
    return this.replaceCurrentPatch({ ...this.currentPatch, masterVolume: clamp(masterVolume, 0, 1) });
  }

  changeControl(unitId: UnitId, key: string, value: number): Groovebox {
    return this.replaceUnit(unitId, (unit) => ({
      ...unit,
      controls: unit.controls.map((control) =>
        control.key === key
          ? { ...control, value: clamp(value, control.min, control.max) }
          : control,
      ),
    }));
  }

  toggleMute(unitId: UnitId): Groovebox {
    return this.replaceUnit(unitId, (unit) => ({ ...unit, muted: !unit.muted }));
  }

  toggleStep(unitId: UnitId, trackIndex: number, stepIndex: number): Groovebox {
    return this.replaceStep(unitId, trackIndex, stepIndex, (step) => ({
      ...step,
      active: !step.active,
    }));
  }

  accentStep(unitId: UnitId, trackIndex: number, stepIndex: number): Groovebox {
    return this.replaceStep(unitId, trackIndex, stepIndex, (step) => ({
      ...step,
      active: true,
      velocity: step.velocity >= 0.99 && step.active ? 0.72 : 1,
    }));
  }

  clearPattern(unitId: UnitId, trackIndex: number): Groovebox {
    return this.replaceUnit(unitId, (unit) => {
      if (!unit.patterns[trackIndex]) throw new Error(`Unknown pattern track: ${trackIndex}`);
      return {
        ...unit,
        patterns: unit.patterns.map((pattern, index) =>
          index === trackIndex ? pattern.map((step) => ({ ...step, active: false })) : pattern,
        ),
      };
    });
  }

  private replaceStep(
    unitId: UnitId,
    trackIndex: number,
    stepIndex: number,
    update: (step: Step) => Step,
  ): Groovebox {
    return this.replaceUnit(unitId, (unit) => {
      if (!unit.patterns[trackIndex]?.[stepIndex]) throw new Error(`Unknown step: ${trackIndex}/${stepIndex}`);
      return {
        ...unit,
        patterns: unit.patterns.map((pattern, patternIndex) =>
          patternIndex === trackIndex
            ? pattern.map((step, index) => (index === stepIndex ? update(step) : step))
            : pattern,
        ),
      };
    });
  }

  private replaceUnit(unitId: UnitId, update: (unit: Unit) => Unit): Groovebox {
    return this.replaceCurrentPatch({
      ...this.currentPatch,
      units: this.currentPatch.units.map((unit) => (unit.id === unitId ? update(unit) : unit)),
    });
  }

  private replaceCurrentPatch(nextPatch: Patch): Groovebox {
    return new Groovebox(
      this.patches.map((patch) => (patch.id === this.currentPatchId ? nextPatch : patch)),
      this.currentPatchId,
    );
  }
}
