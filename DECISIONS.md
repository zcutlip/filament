# Decisions

- 2026-11-17 — TypeScript on Bun for the core, protocol, and tests.
  One implementation runs in the browser and headless, and `bun:test` keeps the TDD loop fast.
- 2026-11-17 — Seeded PRNG inside the core.
  Satisfies ARCH-3 determinism; no `Math.random`, no wall-clock access.
- 2026-11-17 — Single-package layout.
  One core implementation, no premature monorepo.
- 2026-11-17 — One-command check: `tsc --noEmit && biome check . && bun test`.
  Meets the TDD gate requirement for lint, types, and tests in a single command.

UI framework, server framework, and container base are deferred until the milestone that needs them.

_Source: stack planning discussion, 2026-11-17._
