import type { ControlApiModel, GrooveboxApiModel, StepApiModel, UnitApiModel } from "./GrooveboxGateway";

const CONTROL_PRESETS: Record<string, Omit<ControlApiModel, "value">[]> = {
  drums: [
    { key: "punch", label: "PUNCH", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "tone", label: "TONE", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "decay", label: "DECAY", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "drive", label: "DRIVE", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "level", label: "LEVEL", min: 0, max: 1, step: 0.01, unit: "%" },
  ],
  bass: [
    { key: "cutoff", label: "CUTOFF", min: 100, max: 3200, step: 10, unit: "Hz" },
    { key: "resonance", label: "RESO", min: 0.5, max: 16, step: 0.1, unit: "Q" },
    { key: "drive", label: "DRIVE", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "decay", label: "DECAY", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "level", label: "LEVEL", min: 0, max: 1, step: 0.01, unit: "%" },
  ],
  pads: [
    { key: "harmony", label: "HARMONY", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "cutoff", label: "CUTOFF", min: 200, max: 8000, step: 20, unit: "Hz" },
    { key: "attack", label: "ATTACK", min: 0.01, max: 1.5, step: 0.01, unit: "s" },
    { key: "space", label: "SPACE", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "level", label: "LEVEL", min: 0, max: 1, step: 0.01, unit: "%" },
  ],
  lead: [
    { key: "tone", label: "TONE", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "cutoff", label: "CUTOFF", min: 300, max: 9000, step: 20, unit: "Hz" },
    { key: "echo", label: "ECHO", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "decay", label: "DECAY", min: 0, max: 1, step: 0.01, unit: "%" },
    { key: "level", label: "LEVEL", min: 0, max: 1, step: 0.01, unit: "%" },
  ],
};

function controls(unitId: string, values: number[]): ControlApiModel[] {
  return CONTROL_PRESETS[unitId].map((control, index) => ({ ...control, value: values[index] }));
}

function lane(pattern: string, note = 60): StepApiModel[] {
  if (pattern.length !== 16) throw new Error(`Invalid 16-step lane: ${pattern}`);
  return [...pattern].map((token) => ({
    active: token !== "-",
    note,
    velocity: token === "X" ? 1 : token === "o" ? 0.58 : 0.8,
    length: 1,
  }));
}

function melody(pattern: string, notes: number[], lengths: number[] = []): StepApiModel[] {
  if (pattern.length !== 16) throw new Error(`Invalid 16-step melody: ${pattern}`);
  let noteIndex = 0;
  return [...pattern].map((token, index) => {
    const active = token !== "-";
    const currentNote = active ? notes[noteIndex % notes.length] : notes[0];
    if (active) noteIndex += 1;
    return {
      active,
      note: currentNote,
      velocity: token === "X" ? 1 : token === "o" ? 0.58 : 0.8,
      length: lengths[index] ?? 1,
    };
  });
}

function unit(
  unitId: "drums" | "bass" | "pads" | "lead",
  values: number[],
  patterns: StepApiModel[][],
  rootNote: number,
): UnitApiModel {
  const names = { drums: "DRUMS", bass: "BASS", pads: "PADS", lead: "LEAD" };
  const voices = {
    drums: "ANALOG PERCUSSION",
    bass: "MONO SYNTH",
    pads: "POLYPHONIC",
    lead: "SOLO SYNTH",
  };
  return {
    unit_id: unitId,
    name: names[unitId],
    voice: voices[unitId],
    muted: false,
    root_note: rootNote,
    controls: controls(unitId, values),
    patterns,
  };
}

function patch(
  id: string,
  name: string,
  subtitle: string,
  tempo: number,
  swing: number,
  units: UnitApiModel[],
): GrooveboxApiModel {
  return { patch_id: id, name, subtitle, tempo, swing, master_volume: 0.78, units };
}

export function createDefaultPatchApiModels(): GrooveboxApiModel[] {
  return [
    patch("neon-district", "NEON DISTRICT", "MIDTOWN ELECTRO · C MINOR", 112, 0.08, [
      unit("drums", [0.74, 0.58, 0.46, 0.18, 0.82], [
        lane("X---X---X---X-x-"),
        lane("----X-------X---"),
        lane("x-o-x-o-x-o-x-oX"),
        lane("------------X---"),
      ], 36),
      unit("bass", [880, 8.5, 0.28, 0.5, 0.76], [
        melody("X--x-X-x--X-x---", [36, 36, 39, 43, 34, 36, 31]),
      ], 36),
      unit("pads", [0.18, 3400, 0.18, 0.5, 0.65], [
        melody("X-------X-------", [48, 53], [8, 0, 0, 0, 0, 0, 0, 0, 8]),
      ], 48),
      unit("lead", [0.62, 5200, 0.38, 0.54, 0.64], [
        melody("------x-----x-X-", [67, 70, 72], [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 2, 1]),
      ], 60),
    ]),
    patch("velvet-tide", "VELVET TIDE", "SLOW MOTION SOUL · D MAJOR", 86, 0.28, [
      unit("drums", [0.42, 0.36, 0.64, 0.08, 0.74], [
        lane("X-----o-X-------"),
        lane("----o-------X---"),
        lane("x-oxx-o-x-oxx-o-"),
        lane("------------X---"),
      ], 38),
      unit("bass", [520, 3.2, 0.1, 0.72, 0.8], [
        melody("X-----x---X-----", [38, 42, 36], [4, 0, 0, 0, 0, 0, 2, 0, 0, 6]),
      ], 38),
      unit("pads", [0.52, 4600, 0.72, 0.78, 0.7], [
        melody("X-------X-------", [50, 46], [8, 0, 0, 0, 0, 0, 0, 0, 8]),
      ], 50),
      unit("lead", [0.26, 3800, 0.68, 0.74, 0.58], [
        melody("--X---------X---", [69, 74], [1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5]),
      ], 69),
    ]),
    patch("chrome-jungle", "CHROME JUNGLE", "FUTURE BREAKS · G DORIAN", 152, 0.04, [
      unit("drums", [0.88, 0.72, 0.32, 0.32, 0.86], [
        lane("X--X----X-X-----"),
        lane("----X--o----X--X"),
        lane("xXoxxXoxxXoxxXox"),
        lane("-------X-------X"),
      ], 31),
      unit("bass", [1420, 11.8, 0.44, 0.3, 0.78], [
        melody("X-xX--x-X-xX--x-", [31, 31, 34, 38, 31, 39, 36, 34, 31, 29]),
      ], 31),
      unit("pads", [0.84, 6200, 0.04, 0.36, 0.56], [
        melody("--X---X---X---X-", [55, 58, 53, 60], [1, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2]),
      ], 55),
      unit("lead", [0.8, 7200, 0.46, 0.3, 0.62], [
        melody("X-x-Xx-X-xX-x-Xx", [62, 65, 69, 72, 70, 67, 65, 63, 62, 65, 70, 74, 72, 69, 67, 65]),
      ], 62),
    ]),
  ];
}
