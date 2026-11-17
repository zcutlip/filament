# Test-driven development workflow

Work in phases: SCAFFOLD, RED, GREEN, REFACTOR. The human commits at the end of each phase, which creates a gate. Do not start the next phase until the human says the previous one is committed and approved.

## Scope

- **Strict TDD (all phases, all gates):**
  - the headless core (milestone 1 and every later change to game rules)
  - the session protocol and command validation
  - save format, import and migration
  - server-side logic: tokens, validation, limits, relay
  - agent API behavior
- **Behavior tests, lighter gates (UI):** write tests for what the UI does: reveal rules, enabled and disabled states, input alternatives, keyboard operation, accessible names, rendering of view-model fields. These tests are locked like any others. Visual design (layout, theme, motion) has no failing test to write; the human reviews it by eye. For UI work, the SCAFFOLD gate may be skipped when no new module boundaries are introduced, and RED and GREEN may be reported together if the human agrees up front.
- **Smoke tests after the fact:** container images, deployment and packaging. Write the smoke test, run it, and report; no RED gate.

## Principles

- **Tests are a contract, locked before implementation.** Once committed, tests are read-only. That includes fixtures, helpers and test support code. A passing suite must mean the code is correct, never that a test was quietly bent to pass.
- **Tests come from the spec.** Every test cites the spec section or defect ID it comes from (for example `01 §6.2`, `04-D5`). The spec is the source of truth and the tests encode it. Do not derive expected values by running your own implementation.
- **Work in batches.** A batch is a spec section, or a coherent part of a large one (for example the first 12 projects), small enough for the human to review in one sitting. Write tests for all items in the batch first, then implement. Don't alternate test and code item by item.
- **Phases never mix.** In RED, change tests only. In GREEN, change implementation only. Don't slip docs or unrelated edits into either phase.
- **Stop at every gate.** After each phase, report and wait for approval. Do not commit yourself; the human commits.
- **Report faithfully.** If a check fails or was skipped, say so with the output. Don't describe something as done and verified when it was not.

## What the tests look like

- **Source material.** Worked examples and tables in the spec; formulas and constants evaluated by hand or by an independent calculation; tick and update ordering; verbatim player-facing text; every defect entry (the recommended behavior, and the variant where the entry offers one).
- **Determinism.** Inject a seeded or scripted RNG and an explicit clock (ARCH-1, ARCH-3). Tests never sleep, read wall-clock time or depend on real randomness. Where a formula involves randomness, test it two ways: with scripted draws for exact outcomes, and with a seeded run for distribution properties and invariants.
- **Keep-original defects.** The default behavior gets tests that pin the original. The optional variant gets its own tests, run with the variant enabled, in separate files. Mark each with the defect ID.
- **Invariants.** Where the spec gives them (for example, the ending's wire budget is exactly 100, a save round trip preserves all persisted state), write them as property-style tests over many seeds or states.
- **Coverage report.** At the RED gate, list the spec sections and IDs covered, and any spec content that cannot be tested (and why).

## Spec problems found while writing tests

Writing precise tests is when gaps and contradictions show up. They follow AGENTS.md §4: log each one in `GAPS.md`, and never fill a gap by guessing.

**Blocked items.** If an item can't be tested without resolving a gap, don't write a test that guesses, and don't implement the item. Write the tests for the rest of the batch. At the RED gate, list every blocked item with its `GAPS.md` entry. The human decides for each one: resolve it now (you write the test, and it goes through RED like the rest), or defer it to a later batch. A blocked item stays out of GREEN until its test is locked. Blocked items are never dropped silently; they appear in every gate report until resolved.

During GREEN, if a locked test seems to disagree with the spec, assume your implementation is wrong first. If you are convinced the test misreads the spec, that is a locked-test problem (below). If the spec itself is wrong, that is a gap.

## Phase 0: Scaffold (when the batch adds new code)

Create the new modules, types and function signatures with stubs that fail loudly with a "not implemented" error. Wire up entry points (for example commands, endpoints and message handlers) to the stubs. Nothing should behave differently yet.

- Gate: the lint, type and format checks and the existing test suite all pass.
- Commit contents: stubs only. The human commits.

The scaffold lets RED tests import real names and fail for the right reason (the not-implemented failure) instead of failing at collection.

## Phase 1: RED (write and lock the tests)

1. Write or update tests for every planned item that isn't blocked, including fixtures and shared helpers.
2. Run the lint, type and format checks. They must pass, on test files too.
3. Run the test suite. The new tests must fail, and for the right reasons. Check the failure messages: the not-implemented failure is expected, while collection errors, import errors and typos are not. Existing tests must still pass. A few new tests passing is fine if they only exercise data structures that already exist, but know which ones they are.
4. Stop. Report: what is covered (spec sections and IDs), what is not testable, the failure breakdown, which new tests pass and why, and the blocked items with their `GAPS.md` entries. Wait for the human to commit ("lock") the tests.

## Phase 2: GREEN (implement against frozen tests)

1. Write the minimal implementation that passes the locked tests. Do not edit any test, fixture or helper.
2. Run the lint, type and format checks, then the full test suite. Repeat until everything passes and nothing else broke.
3. If a locked test seems wrong, **stop**. Do not touch it. Assume your implementation is wrong first. If you are still convinced the test is flawed, report the specific flaw with evidence, citing the spec text, and wait. Reopening a locked test needs the human's explicit authorization and runs as its own isolated RED cycle, with new tests committed on their own.
4. Where tests leave a behavior open, make a choice and disclose it in your report as a decision the tests did not cover, and log it in `DECISIONS.md`. If the open behavior is a game rule rather than an internal detail, treat it as a gap instead: stop and ask.
5. Do any live or manual checks the milestone calls for (for example driving a real session end to end through the API, or running the built image).
6. Stop and report: files changed, gate results, decisions you made, any gaps you noticed, and the blocked items still open. Wait for the human to commit.

## Phase 3: REFACTOR (optional)

1. Clean up code or tests if worthwhile. Skip the phase if there is nothing to do.
2. Lint, type and format checks must pass, and the full suite must stay green. Changes to locked tests in this phase need the same explicit authorization as in GREEN.
3. Stop and wait for the human to commit.

## After each batch

- Update docs (README, `DECISIONS.md`, `GAPS.md`) as a separate pass, in its own commit.
- At each milestone boundary, give the milestone report required by AGENTS.md §7.

## Commit labeling

Label each commit by what its files contain, and verify it before naming the phase:

- **Scaffold:** stubs only.
- **RED:** tests only.
- **GREEN:** implementation only.
- Check whether the code under test still contains the not-implemented stub before calling a commit RED or GREEN.

## Checklist per gate

| Gate     | Must be true                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Scaffold | Lint and types clean; existing tests pass; new code is stubs only                                      |
| RED      | Lint clean on tests; new tests fail for the right reasons; only test files changed; blocked items listed |
| GREEN    | Lint and types clean; all tests pass; no test file changed; blocked items still open are not implemented |
| REFACTOR | Lint clean; suite green; behavior unchanged                                                            |
