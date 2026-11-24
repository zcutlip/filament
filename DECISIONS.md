# Decisions

- 2026-11-17 — TypeScript on Bun for the core, protocol, and tests.
  One implementation runs in the browser and headless, and `bun:test` keeps the TDD loop fast.
- 2026-11-17 — Seeded PRNG inside the core.
  Satisfies ARCH-3 determinism; no `Math.random`, no wall-clock access.
- 2026-11-17 — Single-package layout.
  One core implementation, no premature monorepo.
- 2026-11-17 — One-command check: `tsc --noEmit && biome check . && bun test`.
  Meets the TDD gate requirement for lint, types, and tests in a single command.

- 2026-11-17 — Core module boundaries: `src/core/{state,game,rng,commands,step,view,save,format}.ts`, plus `src/core/systems/` for one module per spec section system.
  One entry point per ARCH-1–7 concern, with `src/core/index.ts` as the package-facing surface; section rules live in `systems/`, not in the state or entry-point modules.
- 2026-11-22 — `src/core/systems/manufacturing.ts` owns spec 01 §4 as `clipClick`, `makeClipper`, `makeMegaClipper`, `updateClipRate`, `updateUpgrades`.
  `updateUpgrades` is 01 §4.5's named function; it returns the threshold pair instead of writing display state, because 01 §2 lists no `nfup`/`ndup` fields and the core has no display. `updateClipRate` names 01 §4.4's tick step, which the spec leaves unnamed.
- 2026-11-24 — `src/core/systems/wire.ts` owns 01 §5.1–5.2 as `adjustWirePrice(state, rng)` and `buyWire(state)`.
  `adjustWirePrice` takes the injected `Rng` so price drift stays deterministic (ARCH-3); 01 §5.3's WireBuyer toggle stays with commands/view because it is a button state flip.
- 2026-11-17 — `GameState` starts with the 01 §2 inventory and grows with each section batch.
  TDD scaffolds a batch's modules first, so 03–07 fields not listed in that inventory are added when their tests are planned.
- 2026-11-17 — Core `tsconfig` has no DOM lib.
  Type-checking rejects browser globals in the core, enforcing ARCH-1; the UI milestone gets its own config.
- 2026-11-17 — RNG saves as `{ algorithm, state }`; the concrete PRNG is chosen in its RED/GREEN batch.
  The algorithm name keeps save compatibility checkable (ARCH-3, ARCH-7).
- 2026-11-17 — Formatters use `Intl.NumberFormat("en-US")` (spec 01 §1.1–1.2, 01-D11).
  Default half-expand rounding matches "half away from zero", and output never follows the host locale; a tiny negative that rounds to zero prints `0`, not `-0`.
- 2026-11-17 — Initial state lives in `src/core/state.ts` as `createInitialState()` (spec 01 §2).
  The factory sits beside the type it builds, returns fresh arrays per game, and leaves 03–07 fields not listed in the 01 §2 inventory for their batches; the four unspecified revenue trackers start at 0 (`GAPS.md` G-001).

UI framework, server framework, and container base are deferred until the milestone that needs them.

_Source: stack planning discussion and milestone 1 scaffold request, 2026-11-17; batch 01 §1 formatter tests and implementation, 2026-11-17; batch 01 §2 state tests and implementation, 2026-11-17; batch 01 §4 manufacturing scaffold, 2026-11-22; batch 01 §5 wire tests and implementation, 2026-11-24._
