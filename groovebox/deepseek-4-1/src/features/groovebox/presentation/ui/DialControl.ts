export interface DialControlOptions {
  kind: 'knob' | 'fader';
  label: string;
  min: number;
  max: number;
  origin: number;
  value: number;
  valueLabel: string;
  onChange: (value: number) => void;
  onReset: () => void;
}

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

/**
 * A hardware-style rotary knob or vertical fader. Pointer capture keeps drags
 * smooth; wheel, keyboard, shift-for-fine and double-click-to-reset round it out.
 */
export class DialControl {
  readonly element: HTMLElement;
  private readonly dial: HTMLElement;
  private readonly valueElement: HTMLElement;
  private readonly fill: HTMLElement | null;
  private readonly cap: HTMLElement | null;
  private value: number;
  private readonly min: number;
  private readonly max: number;
  private readonly origin: number;
  private readonly kind: 'knob' | 'fader';
  private dragStartY = 0;
  private dragStartValue = 0;
  private dragging = false;

  constructor(private readonly options: DialControlOptions) {
    this.kind = options.kind;
    this.value = options.value;
    this.min = options.min;
    this.max = options.max;
    this.origin = options.origin;

    this.element = element('div', `control control--${options.kind}`);
    this.element.dataset.control = options.label;

    const label = element('span', 'control-label', options.label);
    const value = element('span', 'control-value', options.valueLabel);

    if (options.kind === 'knob') {
      this.dial = element('div', 'knob');
      this.dial.tabIndex = 0;
      this.dial.setAttribute('role', 'slider');
      const ticks = element('span', 'knob-ticks');
      const face = element('span', 'knob-face');
      const indicator = element('span', 'knob-indicator');
      face.append(indicator);
      this.dial.append(ticks, face);
      this.fill = null;
      this.cap = null;
    } else {
      this.dial = element('div', 'fader');
      this.dial.tabIndex = 0;
      this.dial.setAttribute('role', 'slider');
      const track = element('span', 'fader-track');
      this.fill = element('span', 'fader-fill');
      this.cap = element('span', 'fader-cap');
      track.append(this.fill);
      this.dial.append(track, this.cap);
    }

    this.valueElement = value;
    this.element.append(label, this.dial, value);
    this.dial.title = options.kind === 'fader' ? 'Drag to set · double-click to reset' : 'Drag or scroll to adjust · double-click to reset';
    this.applyAria();
    this.paint();

    this.bind();
  }

  update(value: number, valueLabel: string): void {
    this.value = Math.min(this.max, Math.max(this.min, value));
    this.valueElement.textContent = valueLabel;
    this.applyAria();
    this.paint();
  }

  private paint(): void {
    const ratio = this.normalisedValue();
    if (this.kind === 'knob') {
      this.dial.style.setProperty('--angle', `${-135 + ratio * 270}deg`);
      this.dial.style.setProperty('--ratio', `${ratio}`);
    } else {
      this.dial.style.setProperty('--ratio', `${ratio}`);
      if (this.fill) this.fill.style.height = `${ratio * 100}%`;
      if (this.cap) this.cap.style.bottom = `${ratio * 100}%`;
    }
  }

  /** Asymmetric ranges rotate through their visual origin; symmetrical ones stay linear. */
  private normalisedValue(): number {
    const span = this.max - this.min;
    if (span === 0) return 0;
    if (this.origin <= this.min || this.origin >= this.max) {
      return (this.value - this.min) / span;
    }
    if (this.value >= this.origin) {
      return 0.5 + 0.5 * ((this.value - this.origin) / Math.max(0.0001, this.max - this.origin));
    }
    return 0.5 * ((this.value - this.min) / Math.max(0.0001, this.origin - this.min));
  }

  private applyAria(): void {
    this.dial.setAttribute('aria-label', this.options.label);
    this.dial.setAttribute('aria-valuemin', String(this.min));
    this.dial.setAttribute('aria-valuemax', String(this.max));
    this.dial.setAttribute('aria-valuenow', String(this.value));
    this.dial.setAttribute('aria-valuetext', this.valueElement.textContent ?? '');
    this.dial.setAttribute('aria-orientation', this.kind === 'fader' ? 'vertical' : 'horizontal');
  }

  private setValue(next: number): void {
    const clamped = Math.min(this.max, Math.max(this.min, next));
    if (clamped === this.value) return;
    this.value = clamped;
    this.options.onChange(clamped);
  }

  private bind(): void {
    this.dial.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.dial.setPointerCapture(event.pointerId);
      this.dragging = true;
      this.dial.classList.add('is-dragging');
      document.body.classList.add('dial-dragging');

      if (this.kind === 'fader') {
        this.setFromPointer(event.clientY);
      } else {
        this.dragStartY = event.clientY;
        this.dragStartValue = this.value;
      }
    });

    this.dial.addEventListener('pointermove', (event) => {
      if (!this.dragging) return;
      event.preventDefault();
      if (this.kind === 'fader') {
        this.setFromPointer(event.clientY);
        return;
      }
      const fine = event.shiftKey ? 0.2 : 1;
      const span = this.max - this.min;
      const delta = ((this.dragStartY - event.clientY) * span * fine) / 190;
      this.setValue(this.dragStartValue + delta);
    });

    const endDrag = (event: PointerEvent) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.dial.classList.remove('is-dragging');
      document.body.classList.remove('dial-dragging');
      if (this.dial.hasPointerCapture(event.pointerId)) {
        this.dial.releasePointerCapture(event.pointerId);
      }
    };
    this.dial.addEventListener('pointerup', endDrag);
    this.dial.addEventListener('pointercancel', endDrag);

    this.dial.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const step = (this.max - this.min) / 50;
        const direction = event.deltaY > 0 ? -1 : 1;
        this.setValue(this.value + direction * step);
      },
      { passive: false },
    );

    this.dial.addEventListener('dblclick', (event) => {
      event.preventDefault();
      this.options.onReset();
    });

    this.dial.addEventListener('keydown', (event) => {
      const span = this.max - this.min;
      const step = span * (event.shiftKey ? 0.1 : 0.02);
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.setValue(this.value + step);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        event.preventDefault();
        this.setValue(this.value - step);
      } else if (event.key === 'Home') {
        event.preventDefault();
        this.setValue(this.min);
      } else if (event.key === 'End') {
        event.preventDefault();
        this.setValue(this.max);
      }
    });

    this.dial.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private setFromPointer(clientY: number): void {
    const rect = this.dial.getBoundingClientRect();
    if (rect.height === 0) return;
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const clamped = Math.min(1, Math.max(0, ratio));
    this.setValue(this.min + clamped * (this.max - this.min));
  }
}
