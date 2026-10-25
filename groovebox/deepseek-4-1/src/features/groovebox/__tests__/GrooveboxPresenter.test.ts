import { describe, expect, it } from 'vitest';
import { GrooveboxService } from '../domain/GrooveboxService';
import { GrooveboxPresenter } from '../presentation/GrooveboxPresenter';
import { FakeAudioGateway } from './fakes/FakeAudioGateway';
import { FakePatchGateway } from './fakes/FakePatchGateway';

async function makePresenter() {
  const audio = new FakeAudioGateway();
  const service = new GrooveboxService(new FakePatchGateway(), audio);
  await service.initialize();
  const presenter = new GrooveboxPresenter(service);
  return { presenter, service, audio };
}

describe('GrooveboxPresenter', () => {
  it('hydrates the whole interface from the opening patch', async () => {
    const { presenter } = await makePresenter();
    const vm = presenter.vm;

    expect(vm.patchName).toBe('NEON DISTRICT');
    expect(vm.patches).toHaveLength(3);
    expect(vm.units.map((unit) => unit.id)).toEqual(['drums', 'bass', 'pads', 'lead']);
    expect(vm.units[0].lanes).toHaveLength(4);
    expect(vm.units[1].steps).toHaveLength(16);
    expect(vm.units[1].steps[2]).toMatchObject({ on: true, noteLabel: 'A1' });
    expect(vm.units[1].controls.map((control) => control.label)).toEqual([
      'CUTOFF',
      'RESO',
      'DECAY',
      'DRIVE',
    ]);
  });

  it('swaps every unit, tempo and control when a patch is selected', async () => {
    const { presenter } = await makePresenter();

    presenter.selectPatchByIndex(1);

    expect(presenter.vm.patchName).toBe('GLASS RIVER');
    expect(presenter.vm.bpm).toBe(84);
    expect(presenter.vm.patchIndex).toBe(1);
    expect(presenter.vm.units[2].chord).toBe('min11');
    expect(presenter.vm.units[3].steps[2].noteLabel).toBe('D4');
    expect(presenter.vm.units[0].displayLine1).toBe('RHYTHM COMPOSER');
  });

  it('advances the playhead only while the transport runs', async () => {
    const { presenter, service } = await makePresenter();
    expect(presenter.pollStep()).toBe(-1);

    await service.togglePlay();
    expect(presenter.pollStep()).toBe(0);

    service.stop();
    expect(presenter.pollStep()).toBe(-1);
  });

  it('mirrors step edits and control moves into the view model', async () => {
    const { presenter } = await makePresenter();

    presenter.toggleStep('drums', 'kick', 1);
    expect(presenter.vm.units[0].lanes[0].steps[1].on).toBe(true);
    expect(presenter.vm.units[0].displayLine2).toContain('KICK');

    presenter.setControl('bass', 'cutoff', 1000);
    expect(presenter.vm.units[1].controls[0].value).toBe(1000);
    expect(presenter.vm.units[1].controls[0].valueLabel).toBe('1.00 kHz');
    expect(presenter.vm.units[1].displayLine1).toBe('CUTOFF');
  });

  it('toggles mute state on the matching unit', async () => {
    const { presenter } = await makePresenter();

    presenter.toggleMute('pads');
    expect(presenter.vm.units[2].muted).toBe(true);
    expect(presenter.vm.units[2].displayLine1).toBe('SIGNAL CUT');
  });
});
