import {
  ControlViewModel,
  GrooveboxViewModel,
  PatchSummaryViewModel,
  StepViewModel,
  UnitViewModel,
  type UnitViewId,
} from "@/features/groovebox/presentation/GrooveboxViewModel";

export function makeGrooveboxViewModel(): GrooveboxViewModel {
  const vm = new GrooveboxViewModel();
  vm.patchId = "neon-district";
  vm.patchName = "NEON DISTRICT";
  vm.patchSubtitle = "MIDTOWN ELECTRO · C MINOR";
  vm.tempo = 112;
  vm.patches = ["NEON DISTRICT", "VELVET TIDE", "CHROME JUNGLE"].map((name, index) => {
    const patch = new PatchSummaryViewModel();
    patch.id = ["neon-district", "velvet-tide", "chrome-jungle"][index];
    patch.name = name;
    patch.subtitle = "ORIGINAL PATCH";
    patch.index = index;
    patch.active = index === 0;
    return patch;
  });
  vm.units = (["drums", "bass", "pads", "lead"] as UnitViewId[]).map((id) => {
    const unit = new UnitViewModel();
    unit.id = id;
    unit.name = id.toUpperCase();
    unit.voice = "SYNTH VOICE";
    unit.isDrum = id === "drums";
    unit.trackLabels = id === "drums" ? ["KICK", "SNARE", "HAT", "CLAP"] : ["PATTERN"];
    unit.trackActivity = id === "drums" ? [true, true, true, false] : [true];
    unit.controls = ["CUTOFF", "RESO", "DRIVE", "DECAY", "LEVEL"].map((label, index) => {
      const control = new ControlViewModel();
      control.key = label.toLowerCase();
      control.label = label;
      control.value = index === 0 ? 800 : 0.5;
      control.min = index === 0 ? 100 : 0;
      control.max = index === 0 ? 3200 : 1;
      return control;
    });
    unit.steps = Array.from({ length: 16 }, (_, index) => {
      const step = new StepViewModel();
      step.active = index % 4 === 0;
      step.velocity = index === 0 ? 1 : 0.8;
      return step;
    });
    return unit;
  });
  return vm;
}
