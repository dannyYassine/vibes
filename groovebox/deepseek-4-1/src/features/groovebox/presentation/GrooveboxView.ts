import type { GrooveboxPresenter } from './GrooveboxPresenter';
import type {
  ControlViewModel,
  GrooveboxViewModel,
  PatchSummaryViewModel,
  UnitViewModel,
} from './GrooveboxViewModel';
import { DialControl } from './ui/DialControl';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

class UnitView {
  readonly element: HTMLElement;
  private readonly pads: HTMLButtonElement[] = [];
  private readonly noteChips: HTMLButtonElement[] = [];
  private readonly leds: HTMLElement[] = [];
  private readonly laneButtons = new Map<string, HTMLButtonElement[]>();
  private readonly controls: DialControl[] = [];
  private readonly lcdLine1: HTMLElement;
  private readonly lcdLine2: HTMLElement;
  private readonly muteButton: HTMLButtonElement;
  private readonly headerLed: HTMLElement;
  private currentVm: UnitViewModel;

  constructor(
    unit: UnitViewModel,
    private readonly presenter: GrooveboxPresenter,
  ) {
    this.currentVm = unit;
    this.element = element('section', `unit unit--${unit.id}`);
    this.element.dataset.unit = unit.id;

    const header = element('header', 'unit-head');
    const index = element('span', 'unit-index', unit.index);
    const titleWrap = element('div', 'unit-title');
    const name = element('h2', 'unit-name', unit.name);
    const subtitle = element('span', 'unit-subtitle', unit.subtitle);
    titleWrap.append(name, subtitle);

    const headRight = element('div', 'unit-head-right');
    const audition = element('button', 'unit-action audition', 'AUDITION');
    audition.type = 'button';
    audition.title = `Audition the ${unit.name.toLowerCase()} voice`;
    audition.addEventListener('click', () => {
      void this.presenter.audition(unit.id);
    });

    this.muteButton = element('button', 'unit-action mute');
    this.muteButton.type = 'button';
    this.muteButton.append(element('span', 'mute-led'), element('span', undefined, 'MUTE'));
    this.muteButton.title = `Mute ${unit.name.toLowerCase()} (keyboard Q/W/E/R)`;
    this.muteButton.addEventListener('click', () => this.presenter.toggleMute(unit.id));

    this.headerLed = element('span', 'unit-led');
    headRight.append(audition, this.muteButton, this.headerLed);
    header.append(index, titleWrap, headRight);

    const body = element('div', 'unit-body');
    const pattern = element('div', 'pattern-area');
    pattern.append(unit.kind === 'drums' ? this.buildDrumBoard(unit) : this.buildMelodicBoard(unit));

    const side = element('aside', 'unit-side');
    const lcd = element('div', 'lcd');
    const lcdTop = element('div', 'lcd-top');
    lcdTop.append(
      element('span', undefined, unit.id.toUpperCase()),
      element('span', undefined, 'PARAM MONITOR'),
    );
    this.lcdLine1 = element('div', 'lcd-line1', unit.displayLine1);
    this.lcdLine2 = element('div', 'lcd-line2', unit.displayLine2);
    lcd.append(lcdTop, this.lcdLine1, this.lcdLine2);

    const controlGrid = element('div', 'control-grid');
    unit.controls.forEach((control, index_) => {
      const dial = this.buildControl(unit, control, index_ === 3 ? 'fader' : 'knob');
      this.controls.push(dial);
      controlGrid.append(dial.element);
    });
    side.append(lcd, controlGrid);

    body.append(pattern, side);
    this.element.append(header, body);
    this.update(unit);
  }

  update(unit: UnitViewModel): void {
    this.currentVm = unit;
    this.element.classList.toggle('is-muted', unit.muted);
    this.muteButton.classList.toggle('is-on', unit.muted);
    this.muteButton.setAttribute('aria-pressed', String(unit.muted));
    this.headerLed.classList.toggle('is-muted', unit.muted);
    this.lcdLine1.textContent = unit.displayLine1;
    this.lcdLine2.textContent = unit.displayLine2;

    unit.controls.forEach((control, index) => {
      this.controls[index]?.update(control.value, control.valueLabel);
    });

    if (unit.kind === 'drums') {
      for (const lane of unit.lanes) {
        const buttons = this.laneButtons.get(lane.id);
        if (!buttons) continue;
        lane.steps.forEach((step, index) => {
          const button = buttons[index];
          if (!button) return;
          button.classList.toggle('is-on', step.on);
          button.classList.toggle('is-accent', step.velocity >= 0.99);
        });
      }
    } else {
      unit.steps.forEach((step, index) => {
        const pad = this.pads[index];
        const chip = this.noteChips[index];
        if (pad) {
          pad.classList.toggle('is-on', step.on);
          pad.classList.toggle('is-accent', step.velocity >= 0.99);
          const note = pad.querySelector('.pad-note');
          if (note) note.textContent = step.on ? step.noteLabel : '';
        }
        if (chip) {
          chip.textContent = step.noteLabel;
          chip.classList.toggle('is-off', !step.on);
        }
      });
    }
  }

  setPlayhead(step: number): void {
    this.leds.forEach((led, index) => led.classList.toggle('is-current', index === step));
    this.pads.forEach((pad, index) => pad.classList.toggle('is-current', index === step));
    for (const buttons of this.laneButtons.values()) {
      buttons.forEach((button, index) => button.classList.toggle('is-current', index === step));
    }

    let triggered = false;
    if (step >= 0) {
      if (this.currentVm.kind === 'drums') {
        triggered = this.currentVm.lanes.some((lane) => lane.steps[step]?.on ?? false);
      } else {
        triggered = this.currentVm.steps[step]?.on ?? false;
      }
    }
    this.headerLed.classList.toggle('is-triggered', triggered);
  }

  private buildDrumBoard(unit: UnitViewModel): HTMLElement {
    const board = element('div', 'drum-board');

    const ledRow = element('div', 'drum-row drum-row--leds');
    ledRow.append(element('span', 'lane-spacer'));
    const leds = element('div', 'seq-leds');
    for (let index = 0; index < 16; index++) {
      const led = element('span', 'seq-led');
      leds.append(led);
      this.leds.push(led);
    }
    ledRow.append(leds);
    board.append(ledRow);

    for (const lane of unit.lanes) {
      const row = element('div', 'drum-row');
      const labelWrap = element('div', 'lane-label');
      labelWrap.append(
        element('span', 'lane-name', lane.label),
        element('span', 'lane-dot', lane.id.slice(0, 1).toUpperCase()),
      );

      const laneEl = element('div', 'drum-lane');
      const buttons: HTMLButtonElement[] = [];
      lane.steps.forEach((_step, index) => {
        const button = element('button', 'drum-step');
        button.type = 'button';
        if (index % 4 === 0) button.classList.add('is-downbeat');
        button.setAttribute('aria-label', `${lane.label} step ${index + 1}`);
        button.title = `${lane.label} · step ${index + 1} · shift-click for accent`;
        button.append(element('span', 'drum-led'), element('span', 'drum-step-num', pad2(index + 1)));
        button.addEventListener('click', (event) => {
          this.presenter.toggleStep(unit.id, lane.id, index, event.shiftKey);
        });
        button.addEventListener('contextmenu', (event) => event.preventDefault());
        laneEl.append(button);
        buttons.push(button);
      });
      this.laneButtons.set(lane.id, buttons);
      row.append(labelWrap, laneEl);
      board.append(row);
    }

    return board;
  }

  private buildMelodicBoard(unit: UnitViewModel): HTMLElement {
    const board = element('div', 'melodic-board');

    const ledRow = element('div', 'melodic-row melodic-row--leds');
    ledRow.append(element('span', 'lane-spacer'));
    const strip = element('div', 'led-strip');
    const leds = element('div', 'seq-leds');
    for (let index = 0; index < 16; index++) {
      const led = element('span', 'seq-led');
      leds.append(led);
      this.leds.push(led);
    }
    strip.append(leds);
    ledRow.append(strip);
    board.append(ledRow);

    const padRow = element('div', 'melodic-row melodic-row--pads');
    const padLabel = element('div', 'lane-label');
    padLabel.append(element('span', 'lane-name', 'STEPS'), element('span', 'lane-dot', '16'));
    const pads = element('div', 'step-pads');
    unit.steps.forEach((_step, index) => {
      const pad = element('button', 'step-pad');
      pad.type = 'button';
      if (index % 4 === 0) pad.classList.add('is-downbeat');
      pad.setAttribute('aria-label', `${unit.name} step ${index + 1}`);
      pad.title = 'Click to toggle · scroll to change pitch · shift-click for accent';
      pad.append(
        element('span', 'pad-led'),
        element('span', 'pad-note', '--'),
        element('span', 'pad-step', pad2(index + 1)),
      );
      pad.addEventListener('click', (event) => {
        this.presenter.toggleStep(unit.id, 'steps', index, event.shiftKey);
      });
      pad.addEventListener(
        'wheel',
        (event) => {
          event.preventDefault();
          this.presenter.transposeStep(unit.id, index, event.deltaY > 0 ? -1 : 1);
        },
        { passive: false },
      );
      pad.addEventListener('contextmenu', (event) => event.preventDefault());
      pads.append(pad);
      this.pads.push(pad);
    });
    padRow.append(padLabel, pads);
    board.append(padRow);

    const pitchRow = element('div', 'pitch-row');
    pitchRow.append(element('span', 'lane-label-text', 'PITCH'));
    const chips = element('div', 'note-chips');
    unit.steps.forEach((_step, index) => {
      const chip = element('button', 'note-chip', '--');
      chip.type = 'button';
      if (index % 4 === 0) chip.classList.add('is-downbeat');
      chip.title = 'Click to raise · right-click or shift-click to lower';
      chip.addEventListener('click', (event) => {
        this.presenter.transposeStep(unit.id, index, event.shiftKey ? -1 : 1);
      });
      chip.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        this.presenter.transposeStep(unit.id, index, -1);
      });
      chip.addEventListener(
        'wheel',
        (event) => {
          event.preventDefault();
          this.presenter.transposeStep(unit.id, index, event.deltaY > 0 ? -1 : 1);
        },
        { passive: false },
      );
      chips.append(chip);
      this.noteChips.push(chip);
    });
    pitchRow.append(chips);
    board.append(pitchRow);

    return board;
  }

  private buildControl(
    unit: UnitViewModel,
    control: ControlViewModel,
    kind: 'knob' | 'fader',
  ): DialControl {
    return new DialControl({
      kind,
      label: control.label,
      min: control.min,
      max: control.max,
      origin: control.origin,
      value: control.value,
      valueLabel: control.valueLabel,
      onChange: (value) => this.presenter.setControl(unit.id, control.id, value),
      onReset: () => this.presenter.resetControl(unit.id, control.id),
    });
  }
}

export class GrooveboxView {
  private readonly machine = element('div', 'machine');
  private readonly patchButtons = new Map<string, HTMLButtonElement>();
  private readonly patchMetas = new Map<string, HTMLElement>();
  private readonly unitViews: UnitView[] = [];
  private readonly presenter: GrooveboxPresenter;
  private readonly displayStep = element('span', 'display-step', '--');
  private readonly displayState = element('span', 'display-state', 'STANDBY');
  private readonly displayPatch = element('div', 'display-patch');
  private readonly displayBpm = element('span', 'display-bpm');
  private readonly displayPos = element('span', 'display-pos');
  private readonly footerStatus = element('span', 'footer-status');
  private readonly playButton = element('button', 'transport-btn play');
  private readonly tempoDial: DialControl;
  private readonly swingDial: DialControl;
  private readonly masterDial: DialControl;
  private readonly patchCounter = element('span', 'bank-count');
  private unsubscribe: (() => void) | null = null;
  private rafId = 0;
  private lastStep = -1;

  constructor(presenter: GrooveboxPresenter) {
    this.presenter = presenter;
    const vm = presenter.vm;

    const topbar = this.buildTopbar(vm);
    const deck = element('main', 'deck');
    deck.append(this.buildCables());

    for (const unit of vm.units) {
      const unitView = new UnitView(unit, presenter);
      this.unitViews.push(unitView);
      deck.append(unitView.element);
    }

    const footer = element('footer', 'footer');
    const footerLeft = element('div', 'footer-left');
    footerLeft.append(element('span', 'power-led'), this.footerStatus);
    const hints = element(
      'div',
      'footer-hints',
      'SPACE PLAY/STOP  ·  1–3 PATCH  ·  Q/W/E/R MUTE  ·  DRAG KNOBS  ·  SCROLL STEP FOR PITCH  ·  SHIFT+CLICK ACCENT',
    );
    const footerRight = element('div', 'footer-right', 'VOLTAGE INSTRUMENTS · FOUR VOICES, ONE CLOCK');
    footer.append(footerLeft, hints, footerRight);

    this.machine.append(topbar, deck, footer);

    // Built before the master display is appended so the dials come online first.
    this.tempoDial = new DialControl({
      kind: 'knob',
      label: 'TEMPO',
      min: presenter.tempoRange.min,
      max: presenter.tempoRange.max,
      origin: (presenter.tempoRange.min + presenter.tempoRange.max) / 2,
      value: vm.bpm,
      valueLabel: presenter.formatTempo(vm.bpm),
      onChange: (value) => presenter.setTempo(value),
      onReset: () => presenter.resetTempo(),
    });
    this.swingDial = new DialControl({
      kind: 'knob',
      label: 'SWING',
      min: presenter.swingRange.min,
      max: presenter.swingRange.max,
      origin: presenter.swingRange.min,
      value: vm.swing,
      valueLabel: presenter.formatSwing(vm.swing),
      onChange: (value) => presenter.setSwing(value),
      onReset: () => presenter.resetSwing(),
    });
    this.masterDial = new DialControl({
      kind: 'fader',
      label: 'MASTER',
      min: presenter.volumeRange.min,
      max: presenter.volumeRange.max,
      origin: presenter.volumeRange.min,
      value: vm.masterVolume,
      valueLabel: presenter.formatVolume(vm.masterVolume),
      onChange: (value) => presenter.setMasterVolume(value),
      onReset: () => presenter.resetMasterVolume(),
    });
    this.mountMasterControls();
  }

  mount(container: HTMLElement): void {
    this.unsubscribe = this.presenter.subscribe((vm) => this.update(vm));
    this.presenter._markMounted();
    void this.presenter.onMounted();
    this.update(this.presenter.vm);
    this.paintPlayhead(-1);
    container.replaceChildren(this.machine);
    window.addEventListener('keydown', this.handleKeyDown);
    this.rafId = requestAnimationFrame(this.loop);
  }

  unmount(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.handleKeyDown);
    void this.presenter.onDestroyed();
    this.presenter._markUnmounted();
    this.machine.remove();
  }

  private update(vm: GrooveboxViewModel): void {
    this.machine.classList.toggle('is-playing', vm.playing);
    this.displayPatch.textContent = vm.patchName;
    this.displayBpm.textContent = vm.tempoLabel;
    this.displayState.textContent = vm.transportLabel;
    this.displayState.classList.toggle('is-live', vm.playing);
    this.patchCounter.textContent = `${pad2(vm.patchIndex + 1)} / ${pad2(vm.patches.length)}`;
    this.playButton.classList.toggle('is-playing', vm.playing);
    this.playButton.setAttribute('aria-pressed', String(vm.playing));
    this.footerStatus.textContent = vm.message || (vm.playing ? 'CLOCK RUNNING' : 'CLOCK STANDBY');
    this.footerStatus.classList.toggle('is-warning', Boolean(vm.message));

    for (const summary of vm.patches) {
      const button = this.patchButtons.get(summary.id);
      if (button) {
        button.classList.toggle('is-active', summary.id === vm.patchId);
        button.setAttribute('aria-pressed', String(summary.id === vm.patchId));
      }
      const meta = this.patchMetas.get(summary.id);
      if (meta) meta.textContent = `${summary.bpm} BPM · ${summary.tagline}`;
    }

    this.tempoDial.update(vm.bpm, this.presenter.formatTempo(vm.bpm));
    this.swingDial.update(vm.swing, this.presenter.formatSwing(vm.swing));
    this.masterDial.update(vm.masterVolume, this.presenter.formatVolume(vm.masterVolume));

    for (const unitView of this.unitViews) {
      const unit = vm.units.find((item) => item.id === unitView.element.dataset.unit);
      if (unit) unitView.update(unit);
    }

    if (!vm.playing) this.paintPlayhead(-1);
  }

  private paintPlayhead(step: number): void {
    this.lastStep = step;
    this.displayStep.textContent = step >= 0 ? pad2(step + 1) : '--';
    this.displayPos.textContent =
      step >= 0 ? `BAR 1 · STEP ${pad2(step + 1)}` : 'BAR 1 · STEP --';
    for (const unitView of this.unitViews) unitView.setPlayhead(step);
  }

  private buildTopbar(vm: GrooveboxViewModel): HTMLElement {
    const topbar = element('header', 'topbar');
    topbar.append(element('span', 'screw screw--tl'), element('span', 'screw screw--tr'));

    const brand = element('div', 'brand');
    const logo = element('div', 'brand-logo');
    const badge = element('div', 'logo-badge');
    badge.append(element('span', 'logo-bolt', 'V'));
    const wordmark = element('div', 'wordmark');
    wordmark.append(
      element('span', 'wordmark-name', 'VOLTAGE'),
      element('span', 'wordmark-model', 'GB-04 · GROOVEBOX'),
    );
    logo.append(badge, wordmark);
    brand.append(logo, element('div', 'brand-tagline', 'FOUR VOICES / ONE CLOCK'));

    const bank = element('div', 'patch-bank');
    const bankHead = element('div', 'bank-head');
    const bankLabel = element('div', 'bank-label', 'PATCH BANK');
    bankHead.append(bankLabel, this.patchCounter);
    const buttons = element('div', 'patch-buttons');
    vm.patches.forEach((patch, index) => {
      const button = this.buildPatchButton(patch, index);
      this.patchButtons.set(patch.id, button);
      buttons.append(button);
    });
    bank.append(bankHead, buttons);

    const transport = element('div', 'transport');
    const display = element('div', 'master-display');
    const displayHead = element('div', 'display-head');
    displayHead.append(this.displayStep, this.displayState);
    const displayFoot = element('div', 'display-foot');
    displayFoot.append(
      this.displayBpm,
      element('span', 'display-unit', 'BPM'),
      this.displayPos,
    );
    display.append(displayHead, this.displayPatch, displayFoot);

    const controlStrip = element('div', 'transport-controls');
    controlStrip.dataset.mount = 'transport-controls';

    const buttonsWrap = element('div', 'transport-buttons');
    this.playButton.type = 'button';
    this.playButton.append(element('span', 'transport-icon', '▶'), element('span', 'transport-label', 'PLAY'));
    this.playButton.title = 'Play / stop (Space)';
    this.playButton.addEventListener('click', () => {
      void this.presenter.togglePlay();
    });

    const stopButton = element('button', 'transport-btn stop');
    stopButton.type = 'button';
    stopButton.append(element('span', 'transport-icon', '■'), element('span', 'transport-label', 'STOP'));
    stopButton.title = 'Stop the transport';
    stopButton.addEventListener('click', () => this.presenter.stop());
    buttonsWrap.append(this.playButton, stopButton);

    transport.append(display, controlStrip, buttonsWrap);
    topbar.append(brand, bank, transport);
    return topbar;
  }

  private mountMasterControls(): void {
    const mount = this.machine.querySelector<HTMLElement>('[data-mount="transport-controls"]');
    if (!mount) return;
    mount.append(this.tempoDial.element, this.swingDial.element, this.masterDial.element);
  }

  private buildPatchButton(patch: PatchSummaryViewModel, index: number): HTMLButtonElement {
    const button = element('button', 'patch-btn');
    button.type = 'button';
    button.dataset.patchId = patch.id;
    button.title = `Load ${patch.name}`;
    const led = element('span', 'patch-led');
    const number = element('span', 'patch-num', pad2(index + 1));
    const text = element('div', 'patch-text');
    const meta = element('span', 'patch-meta', `${patch.bpm} BPM · ${patch.tagline}`);
    this.patchMetas.set(patch.id, meta);
    text.append(element('span', 'patch-name', patch.name), meta);
    button.append(led, number, text);
    button.addEventListener('click', () => this.presenter.selectPatch(patch.id));
    return button;
  }

  private buildCables(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'cables');
    svg.setAttribute('viewBox', '0 0 1600 900');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <path class="cable cable--one" d="M 315 470 C 260 540 210 610 120 635" />
      <path class="cable cable--two" d="M 1285 465 C 1350 530 1400 610 1510 640" />
      <path class="cable cable--three" d="M 350 640 C 470 710 540 720 620 700" />
    `;
    return svg;
  }

  private readonly loop = (): void => {
    const vm = this.presenter.vm;
    if (vm.playing) {
      const step = this.presenter.pollStep();
      if (step !== this.lastStep) this.paintPlayhead(step);
    } else if (this.lastStep !== -1) {
      this.paintPlayhead(-1);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (event.code === 'Space') {
      event.preventDefault();
      void this.presenter.togglePlay();
      return;
    }

    if (event.key === '1' || event.key === '2' || event.key === '3') {
      event.preventDefault();
      this.presenter.selectPatchByIndex(Number(event.key) - 1);
      return;
    }

    const muteKeys: Record<string, number> = { q: 0, w: 1, e: 2, r: 3 };
    const unitIndex = muteKeys[event.key.toLowerCase()];
    if (unitIndex !== undefined) {
      const unit = this.presenter.vm.units[unitIndex];
      if (unit) {
        event.preventDefault();
        this.presenter.toggleMute(unit.id);
      }
    }
  };
}
