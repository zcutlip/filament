# AGENTS.md

You are building *Universal Paperclips* as a new product, working from two documents in this repository: `docs/spec/` (the rules of the game) and `docs/product/requirements.md` (what to build around it). This file says how to work. Read it fully before writing code.

## 1. Inputs and precedence

1. `docs/spec/00-overview.md` first, then `docs/spec/01` and `docs/spec/02`, then the rest as you reach each system.
2. `docs/product/requirements.md` defines architecture, appearance, links, agent API, hosting and milestones.
3. **Gameplay rules come from `docs/spec/`.** `docs/product/requirements.md` changes a gameplay rule only through its §8. Anything else that seems to conflict with the spec is a conflict to log (§4), not something to resolve on your own.
4. Defects: each section ends with a defect list. Follow the **Recommendation** on each entry. Where it says "Keep original", implement the original behavior as the default and treat the fix as an optional variant (`docs/spec/00-overview.md` §4 item 0). Don't pick differently because you think it's a bug.
5. `docs/spec/00-overview.md` §4 holds cross-section rulings. They override section text that disagrees.

## 2. Clean-room rules

- Work only from the documents in this repository.
- Do NOT look for, read, fetch, search for or reconstruct the original game's source code or any copy of it (including mirrors, archives, decompiled or minified code, and the original's save files or network traffic), in any form. If a copy is somehow in your working tree, say so and do not open it.
- Don't rely on memory of the original's source. If you "remember" a detail the spec lacks, treat it as a gap (§4) and ask.
- The spec's player-facing text is the only text taken from the original. Don't add other original text. Supply your own art, icons, sound and the title image.

## 3. Working method

- **Milestones, in order.** Follow `docs/product/requirements.md` §9. Don't begin a milestone until the previous one meets its acceptance criteria and its tests pass. The architecture constraints (ARCH-1 to ARCH-8) apply from the first line of code, because later features depend on them.
- **Test-driven, with gates.** Follow `docs/product/TDD.md`. The core, the protocol, saves and server-side logic are built strictly test-first: scaffold, RED, GREEN and optional REFACTOR, with a stop and a human commit at the end of each phase. Build the headless core (ARCH-1) and its tests before any UI. Derive tests from the spec: worked examples (e.g. formatters in spec 01 §1), seeded per-system tests, save round trips, and determinism (same seed plus the same command log gives the same state).
- **One batch at a time.** A batch is a spec section or a coherent part of one. Cite spec IDs in tests and comments (e.g. `01 §6.2`, `04-D5`). When you implement a defect-list item, name its ID in the code or test so reviewers can match behavior to recommendation. Don't commit; the human commits at each gate.
- **Implement exactly.** Constants, formulas, rounding, ordering of updates within a tick and verbatim text are part of the spec. Don't simplify, "improve" or tune them. Don't add features that aren't in the spec or the requirements.
- **Technology choices are yours** within the constraints (ARCH-2). Record each significant choice, with a short reason, in `DECISIONS.md`.
- **Keep the core free of presentation.** No markup, styling, pixel layout or wall-clock access in the core or the view model (ARCH-1, ARCH-5).
- **Make the checks easy to run.** Provide one command that runs lint, type checks and all tests, and document it in `README.md`.

## 4. Gaps, contradictions and decisions

The spec was written by reading the original and has not been implemented before. Expect gaps and mistakes.

- **Log every one** in `GAPS.md` the moment you meet it. Each entry has: an ID, the spec location(s), what is missing or contradictory, what you need to decide, the options you see, and your recommendation.
- **Stop and ask** the user when the answer would change observable game behavior, numbers, text, or the architecture: a contradiction between sections, a formula or condition that is ambiguous or missing, a "keep original" item you can't specify well enough to reproduce, an unreachable state, or a requirement you can't meet. Continue only on parts that don't depend on the answer.
- **Decide yourself** (and log it as resolved with your reasoning) when the matter is purely presentational, purely internal, or a typo-level fix with one obvious reading. If unsure which kind it is, ask.
- Never fill a gap by guessing at what the original did.
- When you find an error in the spec itself, don't edit the spec. Log it in `GAPS.md` with a proposed correction. The user maintains the spec.
- Answers from the user go back into `GAPS.md` as resolved entries.

## 5. Quality bar

- Each milestone's acceptance criteria are checked by running things, not by reading code. At the end of each milestone, report which criteria you verified, how, and which you could not verify.
- Don't report a milestone as done with failing or skipped tests. List them with the reason.
- Be explicit about what you did not implement. Anything deferred goes in `GAPS.md` or `DECISIONS.md`, never silently dropped.
- When the spec lists a formula and your implementation disagrees with the spec's worked example, the implementation is wrong until proven otherwise. Raise it (§4) if you believe the spec is wrong.

## 6. Security and privacy

- Capability tokens (observe, resume) are secrets. Store only hashes server-side, compare in constant time, and keep them out of logs and error messages.
- Treat all data received over links, the API and imported saves as untrusted: validate size, version and structure before use. Bound resource use (SRV-4).
- Debug and cheat commands are available only in sessions created with `debug: true` (API-8).
- No accounts, no third-party analytics or trackers (SRV-5).

## 7. Reporting

At every TDD gate (`docs/product/TDD.md`), at the end of each milestone, and whenever you stop to ask, give the user a short report: what is done and verified, what is open in `GAPS.md`, and what you need decided next.
