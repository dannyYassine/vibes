# PARALLAX GB/04

A desktop browser groovebox built with React, TypeScript and the Web Audio API. Four synchronized hardware-style units: drums, mono bass, poly pads and lead. All sounds are synthesized live; no samples or audio assets.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Press **Play** or hit **Space**. Audio starts after a user gesture, as required by browser autoplay policies.

## Play

- Switch among **Neon District**, **Velvet Tide**, and **Chrome Jungle**, including during playback.
- Click any step to toggle it. **Shift-click** sets or removes an accent.
- On drums, select Kick, Snare, Hat or Clap to edit that lane.
- Turn knobs with the pointer or arrow keys. All sound controls are live.
- Use **Clear** to clear the displayed lane, and **Mute** to silence a unit.
- Tempo, swing and master level are shared across the current patch.

## Verify

```sh
npm test
npm run lint
npm run build
```

The feature follows a Model–View–Presenter structure with dependency injection. The audio engine uses a look-ahead scheduler for sample-accurate timing; React only mirrors the current step for the LEDs.
