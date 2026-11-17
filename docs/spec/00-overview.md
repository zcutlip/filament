# Universal Paperclips: Clean-Room Reimplementation Spec

This spec describes the game *Universal Paperclips* (Frank Lantz, 2017) in enough detail to rebuild it without access to the original or any copy of it. The algorithms, constants, ordering of updates and player-facing text are normative. The implementer chooses the language, framework, rendering, storage and project structure, and should use whatever they can build and maintain best.

The product built around the game (architecture, appearance, shareable links, agent API, hosting) is defined in `docs/product/requirements.md`. That document may change presentation and add features freely. It changes gameplay rules only through its §8 (Gameplay-affecting decisions). Everything else here stays normative.

Every known bug in the original has an entry in its section's "Known defects in original: recommendations" list. Each entry gives the original behavior, the fixed behavior, a category, the player impact and a recommendation. The main text always matches the recommendation. Most defects are fixed. A few gameplay quirks that shape the game players know are kept as canonical, and their fixes are written up as optional variants (§4 item 0, §5).

## 1. The game in brief

The player is an AI that makes paperclips. Play moves through three phases:

1. **Business (phase 1, `humanFlag == 1`).** Make clips by hand, buy wire, set a price, sell to public demand, buy marketing and AutoClippers/MegaClippers. Earn trust and spend it on processors (ops per second) and memory (max ops). Spend ops and creativity on projects. Later unlocks: an investment engine (03), strategic modeling tournaments that earn yomi (03) and quantum computing (03). The phase ends with the release of the HypnoDrones (projects, 05/06).
2. **Earth consumption (phase 2, `humanFlag == 0 && spaceFlag == 0`).** Money and sales go away. Build clip factories, harvester drones and wire drones, power them with solar farms and batteries, and manage the drone swarm's work/think balance. This consumes Earth's matter (04).
3. **Space (phase 3, `spaceFlag == 1`).** Launch self-replicating von Neumann probes, allocate probe trust across 8 design attributes, explore the universe, and fight the Drifters in battles that award honor (04, 07).

The ending (04, 06) offers a choice. One option restarts in a new universe and earns a prestige bonus (08). The other dismantles everything step by step down to the final 100 hand-made clips and the credits.

## 2. Sections and reading order

| File                                 | Covers                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-core-economy.md`                 | Number/time formatters, **complete state inventory with initial values and owners**, the **tick schedule** (every loop, its period and ordered steps), wire, clips, clippers, demand, sales, revenue, marketing, trust, processors/memory, operations, creativity, milestones, stats display |
| `02-ui-and-progression.md`           | Title screen, every panel/field/button with verbatim labels and formats, visibility and enable rules, message console, blink and HypnoDrone effects, project list display, phase UI switches, **progression map**, visual style                                                              |
| `03-quantum-investments-strategy.md` | Quantum chips and Compute, investment engine (stocks, risk, deposits, upgrades), strategic modeling (payoff grid, 8 strategies, round-robin tournaments, yomi awards, auto-tourney)                                                                                                          |
| `04-industry-swarm-space-ending.md`  | Factories, drones, matter, power, swarm, probes and probe design, Earth→space transition, the full ending sequence                                                                                                                                                                           |
| `05-projects-part1.md`               | **The project data model and lifecycle**, then projects 1–60 in catalog order                                                                                                                                                                                                                |
| `06-projects-part2.md`               | Projects 61–219 in catalog order, including the 200-series ending projects                                                                                                                                                                                                                   |
| `07-combat.md`                       | Drifter battles: start conditions, sizing, per-frame ship simulation, casualties, honor, battle names, rendering                                                                                                                                                                             |
| `08-persistence-prestige.md`         | Startup, autosave, the full persisted state set, load/restore, slots, reset, prestige, debug/cheat functions, recommended save format                                                                                                                                                        |

Read 00 → 01 → 02 first, then the rest in any order. Section 01 §2 (state inventory) and §3 (tick schedule) are the backbone the other sections plug into.

## 3. Conventions used in every section

- **Canonical names.** Backticked identifiers (`clips`, `funds`, `standardOps`, `project46.flag`, …) are the state variables of the original. Sections refer to each other's state by these names. An implementation may rename and restructure freely, but must keep the semantics. Each variable has one owning section (01 §2), which defines the rules that write it.
- **Time.** The base step is 10 ms (100 ticks per second). All rates are per step, never scaled by real elapsed time. 01 §3 gives the order for loops that come due at the same time. The original's order is nondeterministic, so 01 §3 recommends one fixed order; `docs/product/requirements.md` ARCH-3 makes that fixed order mandatory so runs can be reproduced. The original has no offline progress and no catch-up; a throttled host just loses time. Matching that is acceptable; a bounded catch-up is also acceptable.
- **Randomness.** `random()` is uniform in [0, 1). The original's random sequence cannot be reproduced and is not a goal. Where a section gives a specific order of random draws (notably combat roster construction), keep that order so distributions stay comparable. The RNG MUST be a seedable PRNG injected into the core, with its state saved (`docs/product/requirements.md` ARCH-3), so a seed plus a command log reproduces a run.
- **Numbers.** All numeric state is double-precision floating point unless a section says otherwise. Formatting (`fmtGrouped`, `fmtMoney`, `numberCruncher`, `timeCruncher`) is defined once in 01 §1; output is en-US regardless of the user's locale.
- **Text.** Quoted messages, labels, project titles, descriptions and price tags are verbatim and part of the game. Exception: typo fixes listed in the defect tables (e.g. 05-D2, 06-D2) take precedence. The "Descendents" label stays as written (02-D15).
- **Defect IDs.** Defect numbers restart in each section, so refer to them as `<section>-<id>`, e.g. `04-D1`, `07-C2`, `08-P5`.

## 4. Cross-section decisions

These rulings override any section text that disagrees.

0. **Defect policy.** By default, preserve the gameplay players know. Display, Robustness (crash, softlock, save/load corruption) and Code-only defects are fixed. Gameplay defects are fixed when the original result is plainly broken from the player's view (negative production, nonsense counts, exploits, softlocks) or when the impact is negligible. Otherwise the original behavior is canonical and the fix is an **optional variant**. Implement the canonical behavior by default. Variants may be offered as individually toggleable options, off by default. A save records which variants are on. 03-S1 and 03-S2 must be toggled together.
1. **Operations can go negative.** Ops costs are checked against `operations` (which includes `tempOps`) and deducted from `standardOps`, so `standardOps` can dip below zero for a while (05-D4: intentional, not clamped). A Compute click while the quantum chips are negative subtracts ops with no floor (03-Q2: intentional). Project 217 "Quantum Temporal Reversion" requires `operations <= -10000` and can only be reached this way.
2. **Quantum overflow formula.** Use `tempOps += ceil((qq - buffer) / damper)` (03-Q1). This matches the original when memory is full.
3. **Every player action re-validates when it runs.** Clicking a button checks the same condition that enables it (project `cost()`, affordability, flags) at the moment of the click, even if the button looks enabled. This resolves 01-D1, 01-D9, 02-D13, 05-D1 and 06-D1.
4. **Displays derive from current state.** Every field, project title and price tag is computed from current state whenever it's shown, never cached from an earlier event. This covers the mutable titles and tags of projects 40b, 51, 133 and 216 and resolves 02-D5, 03-Q3, 05-D3, 06-D3, 06-D4 and 08-P6/P7. Project 133's title uses the current `threnodyTitle`.
5. **Drone reboot cost.** After a harvester or wire-drone Disassemble All, the next cost comes from the normal cost formula (1,000,000 at level 0), not a hard-coded 2,000,000 (04-D1).
6. **Processors/Memory after the humans are gone.** Use 01 §7.2: unspent trust capacity is used first, and `swarmGifts` is decremented only when it isn't there. `swarmGifts` never goes negative (01-D9, 02-D18).
7. **Battles don't touch matter.** The territory mechanic in the original is commented out. Battles change only probe/drifter counts and honor (07-C8).
8. **Simulation runs only when it's meaningful.** The combat frame loop runs only while a battle is active, on a fixed 16 ms game-time step (07, 07-C1). The tournament animation may be driven from the game clock. Gameplay depends on its duration only through yomi earned per unit of time (03).
9. **Saves.** Use one versioned serializer for all game state, with projects keyed by project number, not catalog index. Slot loads replace the session instead of merging into it. Don't port the original's load-time hot fixes, such as forcing `uses` on projects 218/219 (08 §10, 08-P3/P5/P8, 06-D5). Importing original saves is optional. If you do it, 05 §1 (the `projects` list) gives the catalog index order.
10. **Debug/cheat functions** (08) live behind a debug option that is off by default (02-D17). The original game had **no player-facing save slots**: the slot buttons were commented out alongside the cheats, and only the single autosave was live. Slots are therefore debug features too. If an implementation makes slots player-facing, it must enable the 08-P16 variant (no prestige farming through slots).
11. **Audio.** The original plays one music track, the threnody, used by project 133 and the credits. It is not part of this spec. Supply your own track or leave it silent; gameplay doesn't depend on it.
12. **Title image.** 02 §8 describes it. Create an original image in that spirit.

## 5. Defect index

Generated from the section files. The section entry is authoritative; this index is for coverage tracking. Totals: 107 entries (02-D18 is a pointer to 01-D9). 97 are Fix; 10 keep the original behavior, 8 of those with an optional variant.

### 5.1 Original behavior kept as canonical

These are the deliberate deviations from "fix every bug". The player-impact estimates are in each entry.

| ID     | Defect                                                              | Category | Recommendation                         |
| ------ | ------------------------------------------------------------------- | -------- | -------------------------------------- |
| 02-D6  | Drone upgrade line not gated on a drone flag                        | Display  | Keep original, fix as optional variant |
| 02-D15 | "Descendents" spelling                                              | Display  | Keep original, fix as optional variant |
| 03-Q2  | Negative operations from negative-q clicks                          | Gameplay | Keep original                          |
| 03-S1  | Move history carries over between matches                           | Gameplay | Keep original, fix as optional variant |
| 03-S2  | Seat clash in self-play                                             | Gameplay | Keep original, fix as optional variant |
| 04-D5  | Probe partial spawn counts fractional growth twice                  | Gameplay | Keep original, fix as optional variant |
| 05-D4  | Ops deducted from `standardOps` while checked against `operations`  | Gameplay | Keep original                          |
| 05-D8  | Phase-1 projects stay listed or appear after the HypnoDrone release | Gameplay | Keep original, fix as optional variant |
| 07-C5  | Casualty clamp shrinks `unitSize` for the rest of the battle        | Gameplay | Keep original, fix as optional variant |
| 08-P16 | Prestige farming through save slots                                 | Gameplay | Keep original, fix as optional variant |

Notable impacts: 03-S1 changes the tournament winner in about 17% of tournaments; 04-D5 roughly doubles early probe growth (the variant adds about 1–10 minutes at the start of space); 07-C5 makes late-battle probe losses nearly free (the variant leaves 19–33% fewer probes after an hour with replication on).

### 5.2 All entries

### 01 Core economy

| ID     | Defect                                           | Category  | Recommendation |
| ------ | ------------------------------------------------ | --------- | -------------- |
| 01-D1  | AutoClipper affordability typo                   | Gameplay  | Fix            |
| 01-D2  | Duplicate and unused globals                     | Code-only | Fix            |
| 01-D3  | `lowerPrice` guard allows $0.00                  | Gameplay  | Fix            |
| 01-D4  | Price buttons write a wrong-scale demand readout | Display   | Fix            |
| 01-D5  | Revenue tracker starts with NaN                  | Display   | Fix            |
| 01-D6  | `milestoneCheck` runs twice per tick             | Code-only | Fix            |
| 01-D7  | `numberCruncher` tier thresholds                 | Display   | Fix            |
| 01-D8  | `numberCruncher` trailing space                  | Display   | Fix            |
| 01-D9  | Processor/Memory actions unguarded; gift debt    | Gameplay  | Fix            |
| 01-D10 | `calculateCreativity` takes an unused parameter  | Code-only | Fix            |
| 01-D11 | Number formatting follows the host locale        | Display   | Fix            |

### 02 UI and progression

| ID     | Defect                                                     | Category  | Recommendation                         |
| ------ | ---------------------------------------------------------- | --------- | -------------------------------------- |
| 02-D1  | Project insertion call                                     | Code-only | Fix                                    |
| 02-D2  | Blink counter shared globally                              | Display   | Fix                                    |
| 02-D3  | HypnoDrone strobe counter shared and re-entrant            | Display   | Fix                                    |
| 02-D4  | Combat result block visible on a fresh game                | Display   | Fix                                    |
| 02-D5  | Displays only updated by events show wrong values at start | Display   | Fix                                    |
| 02-D6  | Drone upgrade line not gated on a drone flag               | Display   | Keep original, fix as optional variant |
| 02-D7  | Swarm action blocks                                        | Code-only | Fix                                    |
| 02-D8  | Public Demand shown at the wrong scale for one tick        | Display   | Fix                                    |
| 02-D9  | Inconsistent count formats                                 | Display   | Fix                                    |
| 02-D10 | Ending wire display lag                                    | Display   | Fix                                    |
| 02-D11 | qOps fade not clamped                                      | Code-only | Fix                                    |
| 02-D12 | Gift countdown "Infinity hours" and blank text             | Display   | Fix                                    |
| 02-D13 | Project click does not re-check its cost                   | Gameplay  | Fix                                    |
| 02-D14 | Active projects reorder on load                            | Display   | Fix                                    |
| 02-D15 | "Descendents" spelling                                     | Display   | Keep original, fix as optional variant |
| 02-D16 | Debug log line                                             | Code-only | Fix                                    |
| 02-D17 | Cheat buttons always visible                               | Gameplay  | Fix                                    |
| 02-D18 | Processor/Memory purchase after the humans are gone        | see 01-D9 | see 01-D9                              |
| 02-D19 | Project button text fixed at creation                      | Display   | Fix                                    |

### 03 Quantum, investments, strategy

| ID    | Defect                                     | Category   | Recommendation                         |
| ----- | ------------------------------------------ | ---------- | -------------------------------------- |
| 03-Q1 | Over-cap qOps formula                      | Gameplay   | Fix                                    |
| 03-Q2 | Negative operations from negative-q clicks | Gameplay   | Keep original                          |
| 03-Q3 | Chip price tag formatting                  | Display    | Fix                                    |
| 03-I1 | Upgrade message float noise                | Display    | Fix                                    |
| 03-I2 | P/L not updated on revival                 | Display    | Fix                                    |
| 03-I3 | Possible zero price                        | Robustness | Fix                                    |
| 03-I4 | Funds formatting on deposit/withdraw       | Display    | Fix                                    |
| 03-I5 | Risk and strategy selections not persisted | Robustness | Fix                                    |
| 03-S1 | Move history carries over between matches  | Gameplay   | Keep original, fix as optional variant |
| 03-S2 | Seat clash in self-play                    | Gameplay   | Keep original, fix as optional variant |
| 03-S3 | Roster change mid-tournament               | Gameplay   | Fix                                    |
| 03-S4 | Status-line text flips                     | Display    | Fix                                    |
| 03-S5 | Auto-tourney stalls after load             | Robustness | Fix                                    |
| 03-S6 | Zero payoff on rand() == 0                 | Gameplay   | Fix                                    |

### 04 Industry, swarm, space, ending

| ID     | Defect                                                           | Category   | Recommendation                         |
| ------ | ---------------------------------------------------------------- | ---------- | -------------------------------------- |
| 04-D1  | Drone reboot resets cost to 2,000,000                            | Gameplay   | Fix                                    |
| 04-D2  | Bulk prices are 0 until the first purchase in a fresh session    | Gameplay   | Fix                                    |
| 04-D3  | Farm/battery bulk prices ignore the cheap first unit             | Gameplay   | Fix                                    |
| 04-D4  | Partial battery coverage computes `powMod` wrongly               | Gameplay   | Fix                                    |
| 04-D5  | Probe partial spawn counts fractional growth twice               | Gameplay   | Keep original, fix as optional variant |
| 04-D6  | Gift spam when the swarm leaves Active on the delivery tick      | Gameplay   | Fix                                    |
| 04-D7  | "Next gift in Infinity hours" at slider 0                        | Display    | Fix                                    |
| 04-D8  | Credits never start if fractional wire is left                   | Robustness | Fix                                    |
| 04-D9  | Work/Think slider not restored on load                           | Robustness | Fix                                    |
| 04-D10 | Hazard partial path overcounts losses                            | Display    | Fix                                    |
| 04-D11 | `finalClips` counts no-op clicks                                 | Display    | Fix                                    |
| 04-D12 | Wire display not refreshed at `endTimer4 == 165`                 | Display    | Fix                                    |
| 04-D13 | Duplicate factory cost branches                                  | Code-only  | Fix                                    |
| 04-D14 | Factory boost uses the unfloored level                           | Gameplay   | Fix                                    |
| 04-D15 | Dead swarm statuses 1/2/4                                        | Code-only  | Fix                                    |
| 04-D16 | Drone upgrade hint has no "show" rule                            | Code-only  | Fix                                    |
| 04-D17 | Purchase actions don't check affordability                       | Robustness | Fix                                    |
| 04-D18 | Upgrade hints show 0 until the first purchase in a fresh session | Display    | Fix                                    |

### 05 Projects 1–60

| ID     | Defect                                                              | Category   | Recommendation                         |
| ------ | ------------------------------------------------------------------- | ---------- | -------------------------------------- |
| 05-D1  | Purchase does not re-check cost                                     | Gameplay   | Fix                                    |
| 05-D2  | Message typo "AutoClippper"                                         | Display    | Fix                                    |
| 05-D3  | Project 51 price tag loses thousands separators                     | Display    | Fix                                    |
| 05-D4  | Ops deducted from `standardOps` while checked against `operations`  | Gameplay   | Keep original                          |
| 05-D5  | Dead state `nanoWire`                                               | Code-only  | Fix                                    |
| 05-D6  | Stale demand display refresh (projects 37, 38)                      | Display    | Fix                                    |
| 05-D7  | Redundant power deduction (project 46)                              | Code-only  | Fix                                    |
| 05-D8  | Phase-1 projects stay listed or appear after the HypnoDrone release | Gameplay   | Keep original, fix as optional variant |
| 05-D9  | Begging floor at −100 trust can softlock                            | Robustness | Fix                                    |
| 05-D10 | Raw wire value written to the phase-2 wire display (project 35)     | Display    | Fix                                    |

### 06 Projects 61–219

| ID    | Defect                                                                   | Category   | Recommendation |
| ----- | ------------------------------------------------------------------------ | ---------- | -------------- |
| 06-D1 | Purchase does not re-check cost                                          | Robustness | Fix            |
| 06-D2 | Project 129 message typo                                                 | Display    | Fix            |
| 06-D3 | Project 133 title and price tag go stale                                 | Display    | Fix            |
| 06-D4 | Project 216 price tag is "null" after load and can be stale              | Display    | Fix            |
| 06-D5 | Load-time hot fix forces `project218.uses = 1` and `project219.uses = 1` | Robustness | Fix            |
| 06-D6 | Accept/Reject removal uses an unchecked index lookup                     | Code-only  | Fix            |
| 06-D7 | Project 102 refreshes the wrong display                                  | Code-only  | Fix            |
| 06-D8 | Dead "battle naming doubles combat effectiveness" path                   | Code-only  | Fix            |
| 06-D9 | Wire display not refreshed at chip shutdown tick 165                     | Display    | Fix            |

### 07 Combat

| ID     | Defect                                                       | Category  | Recommendation                         |
| ------ | ------------------------------------------------------------ | --------- | -------------------------------------- |
| 07-C1  | Phantom battles outside an active battle                     | Gameplay  | Fix                                    |
| 07-C2  | Simultaneous annihilation shows the wrong result             | Display   | Fix                                    |
| 07-C3  | Stale placeholder result on a fresh game                     | Display   | Fix                                    |
| 07-C4  | Duplicate battle name                                        | Display   | Fix                                    |
| 07-C5  | Casualty clamp shrinks `unitSize` for the rest of the battle | Gameplay  | Keep original, fix as optional variant |
| 07-C6  | `masterBattleClock` off by one after a battle ends           | Gameplay  | Fix                                    |
| 07-C7  | Centroid divide by zero                                      | Code-only | Fix                                    |
| 07-C8  | Dead legacy battle model                                     | Code-only | Fix                                    |
| 07-C9  | Zero-ship probe side                                         | Gameplay  | Fix                                    |
| 07-C10 | Battle frames on an independent wall-clock timer             | Gameplay  | Fix                                    |

### 08 Persistence and prestige

| ID     | Defect                                                 | Category   | Recommendation                         |
| ------ | ------------------------------------------------------ | ---------- | -------------------------------------- |
| 08-P1  | `probeHarv` not persisted                              | Gameplay   | Fix                                    |
| 08-P2  | Swarm gift progress lost on load                       | Gameplay   | Fix                                    |
| 08-P3  | Three hand-copied save and load functions              | Code-only  | Fix                                    |
| 08-P4  | Discarded battle leaves stale counters                 | Gameplay   | Fix                                    |
| 08-P5  | Project 218/219 `uses` hot fix                         | Gameplay   | Fix                                    |
| 08-P6  | Mutable project titles and price tags not restored     | Display    | Fix                                    |
| 08-P7  | Price tag fix-ups wrong or in the wrong order          | Display    | Fix                                    |
| 08-P8  | Slot loads merge into the live session                 | Gameplay   | Fix                                    |
| 08-P9  | Missing-slot crash and no version check on slot loads  | Robustness | Fix                                    |
| 08-P10 | Revenue trackers not saved                             | Display    | Fix                                    |
| 08-P11 | Constants, dead and derived values saved               | Code-only  | Fix                                    |
| 08-P12 | `refresh()` misses some displays                       | Display    | Fix                                    |
| 08-P13 | Fresh-game result display                              | Display    | Fix                                    |
| 08-P14 | `resetFlag` wipes instead of migrating                 | Robustness | Fix                                    |
| 08-P15 | Non-finite values load as `null` and grant swarm gifts | Gameplay   | Fix                                    |
| 08-P16 | Prestige farming through save slots                    | Gameplay   | Keep original, fix as optional variant |
| 08-P17 | No save on close                                       | Robustness | Fix                                    |

Each section also lists **intentional quirks to keep**: behavior that looks odd but is part of the design, such as the cheap first AutoClipper, project 2's begging escape (the −100 trust floor on it is a defect, 05-D9), 100% refunds on disassembly, and double scoring in self-play. Do not "fix" those.

## 6. Suggested verification

- Unit-test the formatters against the examples in 01 §1.
- With a seeded RNG, test each formula section in isolation: demand and sales, wire drift, stock movement, each tournament strategy's moves, power and `powMod`, probe growth and hazards, combat kill probability.
- Check that the progression map in 02 §7 can be played start to finish. A debug speed multiplier on the base step, behind the debug option, helps here.
- Round-trip test: save, load and compare the full state set in 08 at several points in each phase, including mid-battle and mid-tournament.
- Check the ending wire budget: exactly 100 wire is available for the 100 final clips (04, 06).
