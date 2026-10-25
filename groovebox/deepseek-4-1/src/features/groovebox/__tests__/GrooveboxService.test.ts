import { describe, expect, it } from 'vitest';
import { FakeAudioGateway } from './fakes/FakeAudioGateway';
import { FakePatchGateway } from './fakes/FakePatchGateway';
import { GrooveboxService } from '../domain/GrooveboxService';
import { DEFAULT_PATCHES } from '../domain/defaultPatches';

function makeService(selectedId: string | null = null) {
  const patchGateway = new FakePatchGateway(selectedId);
  const audio = new FakeAudioGateway();
  const service = new GrooveboxService(patchGateway, audio);
  return { patchGateway, audio, service };
}

describe('GrooveboxService', () => {
  it('opens with the first patch loaded', async () => {
    const { service, audio, patchGateway } = makeService();
    await service.initialize();

    expect(service.patch.id).toBe(DEFAULT_PATCHES[0].id);
    expect(patchGateway.savedIds).toEqual([]);
    expect(audio.lastPatch?.bpm).toBe(DEFAULT_PATCHES[0].bpm);
    expect(audio.lastPatch?.drums.pattern.kick).toHaveLength(16);
  });

  it('restores the persisted patch on boot', async () => {
    const { service, audio } = makeService('rust-factory');
    await service.initialize();

    expect(service.patch.id).toBe('rust-factory');
    expect(audio.lastPatch?.bpm).toBe(138);
  });

  it('switches patches live and persists the selection', async () => {
    const { service, audio, patchGateway } = makeService();
    await service.initialize();

    service.selectPatch('glass-river');

    expect(service.patch.name).toBe('GLASS RIVER');
    expect(patchGateway.savedIds).toEqual(['glass-river']);
    expect(audio.lastPatch?.bpm).toBe(84);
    expect(audio.lastPatch?.pads.chordIntervals).toEqual([0, 3, 7, 10, 14, 17]);
  });

  it('keeps per-patch edits when switching away and back', async () => {
    const { service } = makeService();
    await service.initialize();

    service.toggleStep('bass', 'steps', 0);
    expect(service.patch.bass.steps[0].on).toBe(true);

    service.selectPatch('rust-factory');
    service.selectPatch('neon-district');
    expect(service.patch.bass.steps[0].on).toBe(true);
  });

  it('maps editable parameters into the audio patch and clamps them', async () => {
    const { service, audio } = makeService();
    await service.initialize();

    const value = service.setParam('bass', 'cutoff', 999_999);
    expect(value).toBe(5200);
    expect(audio.lastPatch?.bass.cutoff).toBe(5200);
    expect(service.setParam('bass', 'cutoff', -100)).toBe(90);
    expect('bogus' in (service.patch.bass.params as object)).toBe(false);
  });

  it('toggles steps and accents and mirrors them into the audio pattern', async () => {
    const { service, audio } = makeService();
    await service.initialize();

    service.toggleStep('drums', 'kick', 1, true);
    expect(service.patch.drums.pattern.kick[1]).toMatchObject({ on: true, velocity: 1 });
    expect(audio.lastPatch?.drums.pattern.kick[1]).toBe(1);

    service.toggleStep('drums', 'kick', 1);
    expect(service.patch.drums.pattern.kick[1].on).toBe(false);
    expect(audio.lastPatch?.drums.pattern.kick[1]).toBe(0);
  });

  it('transposes notes inside the patch scale', async () => {
    const { service } = makeService();
    await service.initialize();

    const before = service.patch.lead.steps[3].note;
    const up = service.transposeStep('lead', 3, 1);
    expect(up).toBeGreaterThan(before);
    const down = service.transposeStep('lead', 3, -1);
    expect(down).toBe(before);
  });

  it('starts and stops the transport', async () => {
    const { service, audio } = makeService();
    await service.initialize();

    await expect(service.togglePlay()).resolves.toBe(true);
    expect(service.isPlaying()).toBe(true);
    expect(audio.running).toBe(true);

    service.stop();
    expect(service.isPlaying()).toBe(false);
    expect(audio.running).toBe(false);
  });

  it('mutes units through the audio gateway', async () => {
    const { service, audio } = makeService();
    await service.initialize();

    expect(service.toggleMute('pads')).toBe(true);
    expect(audio.muted.pads).toBe(true);
    expect(service.getSnapshot().muted.pads).toBe(true);
  });

  it('clamps tempo and swing to musical limits', async () => {
    const { service } = makeService();
    await service.initialize();

    expect(service.setTempo(300)).toBe(170);
    expect(service.setTempo(10)).toBe(70);
    expect(service.setSwing(2)).toBe(0.45);
    expect(service.setMasterVolume(4)).toBe(1);
  });

  it('resets a parameter to the current patch default', async () => {
    const { service } = makeService();
    await service.initialize();

    service.setParam('lead', 'cutoff', 1000);
    const reset = service.resetParam('lead', 'cutoff');
    expect(reset).toBe(DEFAULT_PATCHES[0].lead.params.cutoff);
  });
});
