import { useEffect, type CSSProperties } from "react";
import { usePresenter } from "@/infra/presenter/react/usePresenter";
import { GrooveboxPresenter } from "./GrooveboxPresenter";
import type {
  ControlViewModel,
  PatchSummaryViewModel,
  UnitViewModel,
} from "./GrooveboxViewModel";

type MeterStyle = CSSProperties & { "--meter-height": string; "--meter-index": number };
type KnobStyle = CSSProperties & { "--knob-angle": string };

function PlayIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.5 16 10 5 16.5Z" fill="currentColor" /></svg>;
}

function StopIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.5" y="4.5" width="11" height="11" rx="1" fill="currentColor" /></svg>;
}

function Knob({ control, onChange }: { control: ControlViewModel; onChange: (value: number) => void }) {
  const style: KnobStyle = { "--knob-angle": `${control.angle}deg` };
  return (
    <label className="knob">
      <span className="knob-label">{control.label}</span>
      <span className="knob-control" style={style}>
        <span className="knob-dial"><span className="knob-marker" /></span>
        <input
          aria-label={control.label}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={control.value}
          onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        />
      </span>
      <span className="knob-value">{control.displayValue}</span>
    </label>
  );
}

function PatchButton({ patch, onSelect }: { patch: PatchSummaryViewModel; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={`patch-button ${patch.active ? "active" : ""}`}
      aria-pressed={patch.active}
      onClick={onSelect}
    >
      <span className="patch-number">{patch.numberLabel}</span>
      <span className="patch-copy">
        <strong>{patch.name}</strong>
        <small>{patch.subtitle}</small>
      </span>
      <span className="patch-led" />
    </button>
  );
}

type UnitPanelProps = {
  unit: UnitViewModel;
  currentStep: number;
  onMute: () => void;
  onClear: () => void;
  onTrack: (track: number) => void;
  onStep: (step: number, accent: boolean) => void;
  onControl: (key: string, value: number) => void;
};

function UnitPanel({ unit, currentStep, onMute, onClear, onTrack, onStep, onControl }: UnitPanelProps) {
  return (
    <section className={`unit-panel ${unit.muted ? "muted" : ""}`} data-unit={unit.id}>
      <span className="screw screw-tl" /><span className="screw screw-tr" />
      <span className="screw screw-bl" /><span className="screw screw-br" />
      <header className="unit-header">
        <div className="unit-title">
          <span className="unit-sigil"><i /><i /><i /></span>
          <div><h2>{unit.name}</h2><span>{unit.voice}</span></div>
        </div>
        <div className="unit-header-actions">
          <button type="button" className="clear-button" onClick={onClear}>CLEAR</button>
          <button
            type="button"
            className={`mute-button ${unit.muted ? "is-muted" : ""}`}
            aria-pressed={unit.muted}
            onClick={onMute}
          ><span />MUTE</button>
        </div>
      </header>

      <div className="unit-body">
        <div className="unit-controls">
          {unit.controls.map((control) => (
            <Knob key={control.key} control={control} onChange={(value) => onControl(control.key, value)} />
          ))}
        </div>

        <div className="sequence-section">
          <div className="sequence-toolbar">
            {unit.isDrum ? (
              <div className="track-selector" aria-label="Drum voice">
                {unit.trackLabels.map((label, index) => (
                  <button
                    type="button"
                    key={label}
                    className={unit.selectedTrack === index ? "selected" : ""}
                    aria-pressed={unit.selectedTrack === index}
                    onClick={() => onTrack(index)}
                  >
                    <span className={unit.trackActivity[index] ? "has-notes" : ""} />{label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="sequence-name"><span className="tiny-led" />{unit.trackName} · 1 BAR</div>
            )}
            <span className="sequence-resolution">16 STEPS</span>
          </div>
          <div className="step-grid">
            {unit.steps.map((step, index) => {
              const current = currentStep === index;
              return (
                <button
                  type="button"
                  key={index}
                  className={`step-button ${step.active ? "active" : ""} ${step.accented ? "accented" : ""} ${current ? "current" : ""} ${index % 4 === 0 ? "beat-start" : ""}`}
                  aria-label={`${unit.name} ${unit.trackName} step ${index + 1}`}
                  aria-pressed={step.active}
                  onClick={(event) => onStep(index, event.shiftKey)}
                >
                  <span className="step-led" />
                  <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="step-groove" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function GrooveboxView() {
  const { presenter, state: vm } = usePresenter(GrooveboxPresenter);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, button")) return;
      event.preventDefault();
      void presenter.togglePlayback();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [presenter]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></div>
          <div><h1>PARALLAX</h1><p>GB/04 <span>·</span> GROOVEBOX</p></div>
        </div>

        <div className="scope-block">
          <div className="scope-heading"><span>MASTER OUTPUT</span><span className={vm.isPlaying ? "running" : ""}><i />{vm.transportLabel}</span></div>
          <div className={`waveform ${vm.isPlaying ? "animated" : ""}`} aria-hidden="true">
            {vm.waveform.map((height, index) => (
              <i key={index} style={{ "--meter-height": `${height}%`, "--meter-index": index } as MeterStyle} />
            ))}
          </div>
        </div>

        <div className="tempo-module">
          <span className="module-label">TEMPO</span>
          <div className="tempo-readout"><strong>{vm.tempoLabel}</strong><span>BPM</span></div>
          <div className="tempo-buttons">
            <button type="button" aria-label="Decrease tempo" onClick={() => presenter.adjustTempo(-1)}>−</button>
            <button type="button" aria-label="Increase tempo" onClick={() => presenter.adjustTempo(1)}>+</button>
          </div>
        </div>

        <div className="global-controls">
          <label className="global-slider">
            <span><b>SWING</b><output>{vm.swingLabel}</output></span>
            <input aria-label="Swing" type="range" min="0" max="0.65" step="0.01" value={vm.swing} onChange={(event) => presenter.changeSwing(event.currentTarget.valueAsNumber)} />
          </label>
          <label className="global-slider">
            <span><b>MASTER</b><output>{vm.masterLabel}</output></span>
            <input aria-label="Master volume" type="range" min="0" max="1" step="0.01" value={vm.masterVolume} onChange={(event) => presenter.changeMasterVolume(event.currentTarget.valueAsNumber)} />
          </label>
        </div>

        <div className="transport-controls">
          <button
            type="button"
            className={`play-button ${vm.isPlaying ? "playing" : ""}`}
            disabled={vm.isBusy || vm.isPlaying}
            onClick={() => void presenter.togglePlayback()}
          ><PlayIcon /><span>{vm.isBusy ? "WAIT" : vm.isPlaying ? "RUN" : "PLAY"}</span></button>
          <button type="button" className="stop-button" aria-label="Stop" disabled={!vm.isPlaying} onClick={() => void presenter.togglePlayback()}><StopIcon /></button>
          <span className="transport-shortcut">SPACE</span>
        </div>
      </header>

      <section className="patchbay" aria-label="Patch memory">
        <div className="patchbay-label"><span>PATCH</span><strong>MEMORY</strong><small>A / B / C</small></div>
        <div className="patch-list">
          {vm.patches.map((patch) => <PatchButton key={patch.id} patch={patch} onSelect={() => presenter.selectPatch(patch.id)} />)}
        </div>
        <div className="position-display"><span>POSITION</span><div><strong>{vm.stepLabel}</strong><i>/</i><span>16</span></div></div>
      </section>

      <div className="units-grid">
        {vm.units.map((unit) => (
          <UnitPanel
            key={unit.id}
            unit={unit}
            currentStep={vm.currentStep}
            onMute={() => presenter.toggleMute(unit.id)}
            onClear={() => presenter.clearPattern(unit.id)}
            onTrack={(track) => presenter.selectDrumTrack(track)}
            onStep={(step, accent) => presenter.changeStep(unit.id, step, accent)}
            onControl={(key, value) => presenter.changeControl(unit.id, key, value)}
          />
        ))}
      </div>

      <footer className="desk-footer">
        <span><i className="status-dot" />WEB AUDIO ENGINE <b>·</b> 4 UNITS <b>·</b> 16 STEPS</span>
        <span className="edit-hint"><b>CLICK</b> TOGGLE STEP <i>/</i> <b>SHIFT + CLICK</b> ACCENT <i>/</i> <b>SPACE</b> TRANSPORT</span>
        <span>DESIGNED FOR EXPLORATION <b>↗</b></span>
      </footer>

      {vm.errorMessage && (
        <div className="error-toast" role="alert"><span>{vm.errorMessage}</span><button type="button" onClick={() => presenter.dismissError()}>DISMISS</button></div>
      )}
    </main>
  );
}
