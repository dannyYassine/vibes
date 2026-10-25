# VOLTAGE GB-04

A four-unit, hardware-style groovebox built with TypeScript, Vite and the Web Audio API. No samples, no audio libraries: every kick, sub, chord and lead is synthesised in the browser.

![units: drums, bass, pads, lead](https://img.shields.io/badge/units-4-ff6b3d) ![steps: 16](https://img.shields.io/badge/steps-16-3ee0b2) ![patches: 3](https://img.shields.io/badge/patches-3-ffc857)

## Run it

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # type-check + production bundle
npm test         # service integration + music theory tests
```

The instrument opens with **NEON DISTRICT** loaded. Press **PLAY** (or <kbd>Space</kbd>).

## The instrument

| Unit | Voice | Controls |
| --- | --- | --- |
| **DRUMS** | 4-voice drum computer: kick, snare, hat, perc | tune, decay, tone, drive |
| **BASS** | dual-osc + sub bass with resonant filter envelope | cutoff, resonance, decay, drive |
| **PADS** | polyphonic detuned chord engine (min7 → min11 voicings) | cutoff, attack, release, space |
| **LEAD** | detuned saw/square lead into a tempo-synced delay | cutoff, resonance, decay, delay |

All four units share one 16-step clock, global tempo and swing. Each unit has a 16-step pattern, mute and audition. Pattern edits, sound edits and tempo are remembered per patch for the session.

### Playing

- **Space** — play / stop
- **1 / 2 / 3** — switch patch (works while playing)
- **Q / W / E / R** — mute drums / bass / pads / lead
- **Click a step** — toggle it
- **Shift + click** — accent a step
- **Scroll a melodic step or note chip** — transpose within the patch scale
- **Drag / scroll a knob** — edit (hold Shift for fine control)
- **Double-click a knob** — reset to the patch default
- **Audition** — hear the current unit voice

## Patches

1. **NEON DISTRICT** — 124 BPM, A minor. Four-on-the-floor, offbeat hats, rolling sub and a rain-slick minor-9 pad bed.
2. **GLASS RIVER** — 84 BPM, D minor. Sparse kick, brushed ghosts, long-attack minor-11 chords and a delay-soaked glass lead.
3. **RUST FACTORY** — 138 BPM, E Phrygian. Broken-machine kick, detuned hats, acid-filter bass and a metallic lead sequence.

Each patch stores all four patterns, every synth parameter, master volume, swing and tempo. Switching rewrites the whole instrument instantly, even mid-bar.

## Architecture

The code follows a strict Model-View-Presenter layering with a DI container:

```
src/
  infra/container/            composition root (Container, bootstrap)
  infra/presenter/            framework-free Presenter base
  features/groovebox/
    data/                     AudioGateway + WebAudioGateway, PatchGateway
    domain/                   Patch entities, Music theory, GrooveboxService,
                              default patches, control ranges
    presentation/             GrooveboxPresenter, GrooveboxViewModel,
                              GrooveboxView, DialControl
    __tests__/                service integration tests with fake gateways
```

- **Dependency direction:** View → Presenter → Service → Entity/Gateway. The View never touches entities or gateways; the Presenter only talks to the Service.
- **Audio is a gateway.** `WebAudioGateway` owns synthesis, the look-ahead scheduler and the effect buses. The Service maps and patches entity data into its wire format.
- **Transport.** A 25 ms look-ahead scheduler queues 16th notes on `AudioContext.currentTime`, with swing, per-unit mute and tempo changes while running. LEDs are driven by a `requestAnimationFrame` playhead poll, not by audio timers.
- **Synthesis.** Kick/snare/hat/perc are synthesised per hit; bass/lead are subtractive voices with filter envelopes; pads stack detuned saws into minor-7/9/11 voicings. A Convolver reverb, ping-pong tempo delay, drum/bass/lead saturation and a master compressor/soft-clipper glue the mix.
- **Tests.** Service integration tests run real Service + Entity + fake gateways; a music test verifies every default note belongs to its patch scale and that the three grooves are genuinely different.

## Notes

- Desktop, 16:9-first. The instrument scales as a single hardware panel using CSS container units.
- Audio starts on the first user gesture (browser autoplay policy). The first press of play is enough.
- The selected patch id is persisted to `localStorage`; sound and pattern edits are intentionally session-local so the three factory patches always remain intact.
