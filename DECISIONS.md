# Decisions

- 2026-11-17 — TypeScript on Bun for the core, protocol, and tests.
  One implementation runs in the browser and headless, and `bun:test` keeps the TDD loop fast.
- 2026-11-17 — Seeded PRNG inside the core.
  Satisfies ARCH-3 determinism; no `Math.random`, no wall-clock access.
- 2026-11-17 — Single-package layout.
  One core implementation, no premature monorepo.
- 2026-11-17 — One-command check: `tsc --noEmit && biome check . && bun test`.
  Meets the TDD gate requirement for lint, types, and tests in a single command.

- 2026-11-17 — Core module boundaries: `src/core/{state,game,rng,commands,step,view,save,format}.ts`.
  One entry point per ARCH-1–7 concern, with `src/core/index.ts` as the package-facing surface.
- 2026-11-17 — `GameState` starts with the 01 §2 inventory and grows with each section batch.
  TDD scaffolds a batch's modules first, so 03–07 state is added when its tests are planned.
- 2026-11-17 — Core `tsconfig` has no DOM lib.
  Type-checking rejects browser globals in the core, enforcing ARCH-1; the UI milestone gets its own config.
- 2026-11-17 — The check script adds `--pass-with-no-tests` during the scaffold gate only.
  Bun exits 1 on an empty suite; the flag is removed when the first locked tests land in RED.
- 2026-11-17 — RNG saves as `{ algorithm, state }`; the concrete PRNG is chosen in its RED/GREEN batch.
  The algorithm name keeps save compatibility checkable (ARCH-3, ARCH-7).

UI framework, server framework, and container base are deferred until the milestone that needs them.

_Source: stack planning discussion and milestone 1 scaffold request, 2026-11-17._
