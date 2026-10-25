import { beforeEach, describe, expect, it } from "vitest";
import { createTestContainer, type TestContainerSetup } from "@/__tests__/shared/createTestContainer";
import { GrooveboxService } from "../domain/GrooveboxService";

describe("Groovebox feature", () => {
  let setup: TestContainerSetup;
  let service: GrooveboxService;

  beforeEach(() => {
    setup = createTestContainer();
    service = setup.container.resolve(GrooveboxService);
    service.loadPatches();
  });

  it("opens with three complete original patches and music ready on the first", () => {
    const session = service.getSession();

    expect(session.patches).toHaveLength(3);
    expect(session.currentPatch.name).toBe("NEON DISTRICT");
    expect(new Set(session.patches.map((patch) => patch.tempo)).size).toBe(3);
    for (const unit of session.currentPatch.units) {
      expect(unit.patterns.every((pattern) => pattern.length === 16)).toBe(true);
      expect(unit.patterns.some((pattern) => pattern.some((step) => step.active))).toBe(true);
    }
  });

  it("switches every patch setting during playback without restarting transport", async () => {
    await service.startPlayback(() => undefined);
    const originalTempo = service.getSession().currentPatch.tempo;

    const session = service.selectPatch("velvet-tide");

    expect(session.currentPatch.name).toBe("VELVET TIDE");
    expect(session.currentPatch.tempo).not.toBe(originalTempo);
    expect(setup.fakes.audio.patch?.tempo).toBe(session.currentPatch.tempo);
    expect(setup.fakes.audio.playing).toBe(true);
    expect(setup.fakes.audio.startCount).toBe(1);
  });

  it("keeps sound and pattern edits in patch memory when switching away and back", () => {
    const before = service.getSession().currentPatch.units[1].patterns[0][1].active;
    service.changeControl("bass", "cutoff", 1230);
    service.toggleStep("bass", 0, 1);
    service.selectPatch("chrome-jungle");

    const restored = service.selectPatch("neon-district");

    const bass = restored.currentPatch.units.find((unit) => unit.id === "bass")!;
    expect(bass.controls.find((control) => control.key === "cutoff")?.value).toBe(1230);
    expect(bass.patterns[0][1].active).toBe(!before);
  });

  it("edits accents and clears only the selected lane", () => {
    service.accentStep("drums", 1, 2);
    let session = service.getSession();
    expect(session.currentPatch.units[0].patterns[1][2]).toMatchObject({ active: true, velocity: 1 });

    service.accentStep("drums", 1, 2);
    service.clearPattern("drums", 1);
    session = service.getSession();

    expect(session.currentPatch.units[0].patterns[1].every((step) => !step.active)).toBe(true);
    expect(session.currentPatch.units[0].patterns[0].some((step) => step.active)).toBe(true);
  });

  it("clamps performance controls to their safe ranges", () => {
    service.changeTempo(999);
    service.changeSwing(2);
    const session = service.changeMasterVolume(-1);

    expect(session.currentPatch.tempo).toBe(180);
    expect(session.currentPatch.swing).toBe(0.65);
    expect(session.currentPatch.masterVolume).toBe(0);
  });

  it("applies mute live and stops the shared audio transport", async () => {
    await service.startPlayback(() => undefined);
    service.toggleMute("lead");

    expect(setup.fakes.audio.patch?.units.find((unit) => unit.id === "lead")?.muted).toBe(true);
    expect(setup.fakes.audio.playing).toBe(true);

    service.stopPlayback();
    expect(setup.fakes.audio.playing).toBe(false);
    expect(setup.fakes.audio.stopCount).toBe(1);
  });
});
