# PARALLAX GB/04

## Commands

- `npm run dev` — Vite development server.
- `npm test` — Vitest service integration and React component tests.
- `npm run lint` — TypeScript/React lint plus architectural dependency boundaries.
- `npm run build` — strict TypeScript check and production bundle.

## Structure

Single `groovebox` feature using Model–View–Presenter:

- `data/GrooveboxGateway.ts` — patch DTOs and default-patch gateway.
- `data/defaultPatches.ts` — three original factory patches.
- `data/GrooveboxAudioGateway.ts` — Web Audio synthesis and look-ahead transport.
- `domain/Groovebox.ts` — pure immutable session/patch/unit/step model.
- `domain/GrooveboxService.ts` — use cases and DTO/audio mapping.
- `state/GrooveboxStore.ts` — shared session entity.
- `presentation/` — passive ViewModels, Presenter, React View.
- `infra/container/` — composition root and DI.

Dependency direction: View → Presenter → Service → Gateway. ViewModels import nothing. Domain entities have no external imports. Only the Service may know both DTO and domain shapes. Views resolve Presenters through `usePresenter`, never `new`.

## Audio rules

Keep AudioContext creation inside a user-initiated `start` call. Do not drive sound timing from React. The audio gateway owns the scheduler and reports step positions back for LEDs. Patch edits call `updatePatch` and must not restart a running transport. All generated sources need envelopes and cleanup.

## Tests

Service integration tests fake both gateways and use real domain/service code. Component tests substitute only the Presenter. No test should create a real AudioContext or make network requests.
