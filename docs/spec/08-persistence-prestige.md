# 08 — Persistence, Reset, Prestige, Debug Functions

This section covers saving and loading, the startup save check, the post-load UI restore, save slots, full reset, prestige (the state that carries over between universes), and the developer cheat functions.

Cross-references: state variables are owned by sections 01–07 and are only referenced by name here. Projects 200/201 (prestige), 217 (Quantum Temporal Reversion) and the project framework (`projects`, `activeProjects`, `uses`, `flag`, `displayProjects`, `manageProjects`) are in sections 05/06 and 02. Strategy objects (`allStrats`, `strats`, strategy picker) are in section 03. `hypnoDroneEvent` is in sections 02/04.

---

## 1. Original storage model (for reference)

The original writes to a persistent string key-value store (browser local storage), JSON-encoding each value.

| Key | Contents |
|---|---|
| `saveGame` | one object holding 231 named state fields (§4) |
| `saveProjectsUses` | list: `projects[i].uses` for every project, by catalog index `i` |
| `saveProjectsFlags` | list: `projects[i].flag` for every project, by catalog index |
| `saveProjectsActive` | list of the `id` strings of the projects in `activeProjects` (offered and not yet bought), in `activeProjects` order |
| `saveStratsActive` | list: `allStrats[i].active` for every strategy, by index |
| `saveGame1`, `saveProjectsUses1`, … `saveStratsActive1` | slot 1, same five values |
| `saveGame2`, … `saveStratsActive2` | slot 2, same five values |
| `savePrestige` | `{ prestigeU, prestigeS }`, kept separately and never removed by a reset |

The recommended design (§10) replaces this with one versioned document per slot.

---

## 2. Startup

After all state has been initialized to its defaults (sections 01–07), and before the main loops start:

```
if a main save exists:  load()           // §5; may wipe and restart, see resetFlag
if a prestige record exists:
    loadPrestige()                       // prestigeU, prestigeS = stored values
    refresh()                            // §6
```

`refresh()` therefore runs twice on a normal start with both records present (once inside `load()`). That is harmless. On a brand-new game, or right after a reset or prestige with no prestige record, `refresh()` does not run at all, and the UI shows its initial defaults. See defect P13 for the stale combat result display this causes, cross-ref section 07 C3.

---

## 3. Autosave

- Autosave piggybacks on the **slow loop** (every 100 ms, section 01). `saveTimer` starts at 0 and is incremented each slow tick. When `saveTimer >= 250`, `save()` writes the main save and `saveTimer` resets to 0. The game therefore autosaves **every 25 s** of running time, first at 25 s after page load.
- Autosave writes only the main save, never a slot.
- The original does not save on page close, so up to 25 s of progress is lost on exit. **Required:** also save when the application closes or loses focus, if the platform allows (defect P17).
- `saveTimer` and `secTimer` are not persisted.
- Autosave keeps running through the ending sequence.

---

## 4. Persisted state

### 4.1 The `saveGame` field set

`save()`, `save1()` and `save2()` write the identical set of 231 fields, and `load()`, `load1()` and `load2()` read the identical set. Every field saved is loaded, and every field loaded is saved, under the same name. Lists are stored as shallow copies (`incomeTracker`, `qChips`, `stocks`, `battles`, `battleNumbers`). Grouped by owning section:

**Meta**
- `resetFlag` (save-format marker; always 2 in this version, see §5.3)

**Core economy / business / manufacturing (01)**
- `clips`, `unusedClips`, `clipRate`, `clipRateTemp`, `prevClips`, `clipRateTracker`, `clipmakerRate`, `clipmakerLevel`, `clipperCost`, `clipperBoost`, `megaClipperFlag`, `megaClipperCost`, `megaClipperLevel`, `megaClipperBoost`, `autoClipperFlag`
- `unsoldClips`, `funds`, `margin`, `demand`, `demandBoost`, `clipsSold`, `avgRev`, `transaction`, `incomeTracker` (list), `revPerSecFlag`, `marketing`, `marketingLvl`, `marketingEffectiveness`, `adCost`
- `wire`, `wireCost`, `wirePurchase`, `wireSupply`, `wireBasePrice`, `wirePriceCounter`, `wirePriceTimer`, `wireBuyerFlag`, `wireBuyerStatus`
- `ticks`, `blinkCounter`, `x` (unused), `clippperCost` (unused typo-named variable)

**Computation, trust, creativity, milestones (01/02)**
- `processors`, `memory`, `operations`, `standardOps`, `tempOps`, `opFade`, `trust`, `nextTrust`, `fib1`, `fib2`, `creativity`, `creativityOn`, `creativitySpeed`, `creativityCounter`, `safetyProjectOn`, `boostLvl`
- flags: `compFlag`, `projectsFlag`, `humanFlag`, `trustFlag`, `creationFlag`, `strategyEngineFlag`, `investmentEngineFlag`, `milestoneFlag`, `tothFlag`, `egoFlag` (unused), `testFlag` (unused)

**Quantum (03)**
- `qFlag`, `qClock`, `qChipCost`, `nextQchip`, `qFade`, `qChips` (list of `{waveSeed, value, active}`)

**Investments (03)**
- `bankroll`, `portfolioSize`, `stockID`, `secTotal`, `portTotal`, `sellDelay`, `riskiness`, `maxPort`, `m`, `investLevel`, `investUpgradeCost`, `stockGainThreshold`, `ledger`, `stockReportCounter`, `stocks` (list of `{id, symbol, price, amount, total, profit, age}`)

**Strategy / tournaments (03)**
- `tourneyCost`, `tourneyLvl`, `stratCounter`, `roundNum`, `hMove`, `vMove`, `hMovePrev`, `vMovePrev`, `aa`, `ab`, `ba`, `bb`, `rounds`, `currentRound`, `rCounter`, `tourneyInProg`, `winnerPtr`, `high`, `pick`, `yomi`, `yomiBoost`, `autoTourneyFlag`, `autoTourneyStatus`, `resultsTimer`, `resultsFlag`

**Human-phase projects (05)**
- `bribe`

**Phase 2 industry, matter, power, swarm (04)**
- `nanoWire` (dead; accept and ignore on import, 05-D5), `wireProductionFlag`, `spaceFlag`, `factoryFlag`, `harvesterFlag`, `wireDroneFlag`, `factoryLevel`, `factoryBoost`, `droneBoost`, `factoryCost`, `harvesterCost`, `wireDroneCost`, `factoryRate`, `harvesterRate`, `wireDroneRate`, `factoryBill`, `harvesterBill`, `wireDroneBill`, `harvesterLevel`, `wireDroneLevel`, `maxFactoryLevel`, `maxDroneLevel`
- `availableMatter`, `acquiredMatter`, `processedMatter`, `totalMatter`, `foundMatter`
- `farmRate`, `batterySize`, `factoryPowerRate`, `dronePowerRate`, `farmLevel`, `batteryLevel`, `farmCost`, `batteryCost`, `storedPower`, `powMod`, `farmBill`, `batteryBill`, `momentum`
- `swarmFlag`, `swarmStatus`, `swarmGifts`, `nextGift`, `giftPeriod`, `giftCountdown`, `elapsedTime` (unused), `sliderPos`, `entertainCost`, `boredomLevel`, `boredomFlag`, `boredomMsg`, `disorgCounter`, `disorgFlag`, `synchCost`, `disorgMsg`

**Probes (04)**
- `probeCount`, `probeLaunchLevel`, `probeCost`, `probeDescendents`, `probeTrust`, `probeUsedTrust` (derived, recomputed every tick), `probeTrustCost`, `maxTrust`, `maxTrustCost`
- design: `probeSpeed`, `probeNav`, `probeRep`, `probeHaz`, `probeFac`, `probeWire`, `probeCombat`. **Not `probeHarv`** (defect P1).
- `partialProbeSpawn`, `partialProbeHaz`, `probesLostHaz`, `probesLostDrift`, `probesLostCombat`, `drifterCount`, `driftKingMessageCost`

**Combat (07)**
- `battleFlag`, `battles` (list), `battleID`, `battleName`, `battleNameFlag`, `battleNumbers` (list), `unitSize`, `driftersKilled`, `battleClock`, `battleEndDelay`, `battleEndTimer`, `masterBattleClock`, `honor`, `honorCount`, `bonusHonor`, `honorReward`, `threnodyTitle`, `threnodyCost`, `attackSpeedFlag`
- constants or dead legacy values that are saved anyway: `warTrigger`, `drifterCombat`, `maxBattles`, `attackSpeed`, `battleSpeed`, `attackSpeedMod`, `battleAlarm`, `outcomeTimer`

**Ending (04)**
- `dismantle`, `endTimer1` … `endTimer6`, `finalClips`

### 4.2 Projects and strategies

- **Projects:** for each catalog entry `i`, both `uses` (remaining number of times it may still be offered) and `flag` (bought / completed) are stored. Storage is by **catalog position**, so the catalog order is part of the save format. Titles, price tags and descriptions are not stored (defect P6).
- **Active projects:** the `id` of each project currently offered (in `activeProjects`) is stored. On load, each project whose id is in the list is re-displayed and appended to `activeProjects`, **in catalog order** (the original display order is lost; acceptable, but the recommended serializer keeps the order).
- **Strategies:** `allStrats[i].active` for each strategy by index. On load, `strats` (the tournament pool, which always starts with RANDOM at index 0) gets every `allStrats[i]` with `i >= 1` and `active == 1` appended, in index order, and a strategy-picker option is added for each. Its label is the strategy name and its value is the index `i`. This is correct only because strategies unlock strictly in index order (projects 60→66 each require the previous one), so pool index equals catalog index.
- **Stocks** (`stocks`) are a plain data list and are restored as-is. The portfolio display is redrawn by the normal per-tick update (section 03).

### 4.3 Not persisted

Gameplay-relevant gaps (defects):
- `probeHarv`: probe Harvester Drone Production allocation (P1).
- `giftBits`: accumulated progress toward the next swarm gift. The obsolete `elapsedTime` is saved in its place (P2).
- Non-finite numbers. JSON encodes `Infinity` and `NaN` as `null`, so they load as `null`. The case that matters is `giftCountdown`, which is `Infinity` whenever the gift rate is 0; a loaded `null` passes the `giftCountdown <= 0` test and grants gifts (P15).
- `income`, `incomeThen`, `incomeNow`, `incomeLastSecond`, `trueAvgRev`, `avgSales`, `revTimer`: revenue-rate tracking, section 01. After a page-load `load()`, `incomeNow` is undefined, so the first sample pushes `NaN` into the restored `incomeTracker` and the average revenue/sales readouts show `NaN` for about 10 s whenever sales are inventory-limited (P10, same mechanism as 01-D5).
- The in-flight battle roster (`ships`, `grid`, `battleLEFTSHIPS`, `battleRIGHTSHIPS`, ship counts). The battle record itself is saved but discarded on load (§6), while its counters (`honorCount`, `battleClock`, `battleEndDelay`, `masterBattleClock`) are kept (P4).

Transient, correctly not persisted:
- `saveTimer`, `secTimer`, `opFadeTimer`
- tournament scratch: `results`, `payoffGrid`, `hStrat`, `vStrat`, `placeScore`, `showScore`. `refresh()` cancels any tournament in progress.
- message console contents
- audio state (re-created by `refresh()`'s hot fix when project 46 is done)
- prestige values (stored separately, §8)
- constants (base rates, names, colors, grid sizes)

Saved but useless:
- Dead: `x`, `clippperCost`, `egoFlag`, `testFlag`, `elapsedTime`, `attackSpeed`, `battleSpeed`, `attackSpeedMod`, `battleAlarm`, `outcomeTimer`.
- Derived: `probeUsedTrust`.
- Constants: `warTrigger`, `drifterCombat`, `maxBattles`. Persisting constants freezes balance values into old saves (P11).

---

## 5. Loading

### 5.1 Main `load()` (startup only)

```
load():
    read the five main-save values
    restore every field of §4.1 (lists replaced by the saved copies)
    // strategies
    for each i: allStrats[i].active = savedStratsActive[i]
    for i in 1 .. len(allStrats)-1: if allStrats[i].active == 1:
        append allStrats[i] to strats; add picker option (label allStrats[i].name, value i)
    // price tags that encode mutable costs
    project40b.priceTag = "($" + bribe formatted with thousands separators + ")"
    project51.priceTag  = "(" + qChipCost formatted with thousands separators + " ops)"   // P7
    // projects
    for each i: projects[i].uses = savedUses[i]; projects[i].flag = savedFlags[i]
    for each project in catalog order: if its id is in savedActive:
        display it (as a fresh offer) and append to activeProjects
    refresh()                                   // §6
    if resetFlag != 2: reset()                  // §5.3
```

Project effects are **not** replayed on load. Everything a project changed must therefore live either in persisted state or in a visibility rule that the per-tick UI update (section 02, `buttonUpdate`) evaluates from persisted flags. This is why `probeHarv` (P1) and the price tags/titles (P6) are a problem.

### 5.2 Slot loads `load1()` / `load2()`

These do the same field and project/strategy restore from the slot keys, with these differences:
- They run in the middle of a session, on top of the live state. They do **not** clear `activeProjects`, displayed project offers, `strats`, or the strategy-picker options before re-adding them, which creates duplicates (P8).
- The 40b/51 price tags are fixed **after** the active projects are displayed, so restored offers show stale prices (P7).
- They do not check `resetFlag`.
- Loading an empty slot fails in the original, because nothing is checked. The first read of the missing data throws before any state is changed, so the click silently does nothing (P9).
- They end with `refresh()`.

The next autosave then overwrites the main save with the loaded slot's state. That is intended: loading a slot makes it the current game.

### 5.3 `resetFlag` (save-format version)

`resetFlag` is a constant 2 in this version and is written into every save. A main save whose `resetFlag` is not 2 (including saves from older versions that lack the field) is loaded, then immediately wiped with `reset()` (§7), which restarts the game. This is a crude format-version gate. Replace it with a real version number and migrations (§10).

---

## 6. Post-load UI restore — `refresh()`

`refresh()` re-syncs displays that are otherwise only updated when their value changes. It runs at the end of every load and again at startup when a prestige record exists. Everything else (panel visibility, button enabled states, per-tick numbers) is restored by the normal per-tick UI update from the restored state.

1. Re-render text displays from state (formats as defined by their owning sections):
   - combat and probes: `driftersKilled`, `honor` (rounded, thousands separators), `probeDescendents`, `probeCount`, `probeLaunchLevel`, `probeCost`, every probe design value (`probeSpeed`, `probeNav`, `probeRep`, `probeHaz`, `probeFac`, `probeHarv`, `probeWire`, `probeCombat`), `probeTrust`, `probeTrustCost`, `maxTrust`
   - matter, wire and drones: `availableMatter`, `acquiredMatter`, `wire` (the nanowire display), `unusedClips`, `factoryCost`, `factoryLevel`, `wireDroneCost`, `wireDroneLevel`, `harvesterCost`, `harvesterLevel`, `farmCost`, `batteryCost`, `farmLevel`, `batteryLevel`
   - business: `clipmakerLevel`, `clipperCost`, `megaClipperCost`, `megaClipperLevel`, `margin`, `marketingLvl`, `adCost`
   - compute: `memory`, `processors`
   - investments and strategy: `bankroll`, `secTotal`, `portTotal`, `investUpgradeCost`, `yomi`, `investLevel`, `tourneyCost`
   - prestige: the "Universe" counter shows `prestigeU + 1` and the "Sim Level" counter shows `prestigeS + 1`
2. UI resets: `tourneyInProg = 0` (cancels a running tournament), hide the combat result display, hide the tournament results table.
3. Recompute derived prices and power: `updateDronePrices()`, then re-render harvester and wire-drone costs, `updateUpgrades()`, `updatePower()`, `updatePowPrices()` (sections 03/04).
4. Hot fixes:
   - if `project46.flag == 1`: re-initialize the threnody audio (audio isn't persisted). Keep this; it is a legitimate restore.
   - `project218.uses = 1` and `project219.uses = 1`, forced on every refresh. Do not reproduce (P5).
5. Discard the in-flight battle: if `battles` is non-empty, remove its first entry.

Not restored by the original, though it should be:
- the battle name and "Scale" displays (they keep their defaults until the next battle)
- the Work/Think slider position (`sliderPos`; section 04 defect D9)
- the titles and price tags of projects 133 and 216 (P6)

---

## 7. Reset — `reset()`

```
reset():
    delete the five main-save keys
    restart the application from scratch (page reload)
```

- Slots 1 and 2 are **not** deleted, and the prestige record is **not** deleted.
- After the restart, the startup check (§2) finds no main save. It does find the prestige record if one exists, so the new game starts with default state plus the prestige values.
- Callers: the "RESET ALL PROGRESS" button; projects 200 and 201 (prestige); project 217 "Quantum Temporal Reversion" (after the player confirms, section 06); and `load()` when `resetFlag != 2`.
- Recommended: implement reset as "replace in-memory state with a freshly initialized default state, apply prestige, delete the main save, rebuild the UI". A process restart is not required. It must produce exactly the state of a new game.

---

## 8. Prestige

### 8.1 State

| Name | Initial | Stored in |
|---|---|---|
| `prestigeU` | 0 | prestige record only |
| `prestigeS` | 0 | prestige record only |

Neither is in the main save or the slots, so slot loads and resets never touch them.

### 8.2 Gaining prestige

Both are offered after project 147 (sections 05/06):
- Project 200 "The Universe Next Door": `prestigeU += 1`, write the prestige record `{prestigeU, prestigeS}`, message `Entering New Universe.`, then `reset()`.
- Project 201 "The Universe Within": `prestigeS += 1`, write the prestige record, message `Entering Simulated Universe.`, then `reset()`.

### 8.3 What carries over

**Only `prestigeU` and `prestigeS`.** Everything else starts at its defaults in the new universe, including honor, battle numbering, strategies and projects. Saved slots survive too, since `reset()` leaves them alone, but that is a side channel, not prestige.

Canonical (original) slot/prestige interaction: a slot saved before a prestige can be loaded in the new universe. The loaded game keeps the *current* `prestigeU`/`prestigeS`, and projects 200/201 are restored with the slot (on offer again if they were on offer when it was saved). Buying one again adds another +1 and resets. Repeating save-slot → prestige → load-slot farms prestige without replaying. See defect P16 for the optional variant that closes this.

### 8.4 Effects on the new game

- `prestigeU`: demand bonus. In the main tick, while `humanFlag == 1`, after base demand is computed: `demand = demand + (demand / 10) * prestigeU`. That is ×(1 + 0.1·`prestigeU`). Formula context is in section 01.
- `prestigeS`: creativity speed bonus. In `calculateCreativity`, the effective speed is `creativitySpeed + creativitySpeed * (prestigeS / 10)`, that is ×(1 + 0.1·`prestigeS`). Context is in section 01.
- Display: a header line `Universe: ` + (`prestigeU`+1) + ` / Sim Level: ` + (`prestigeS`+1), visible when `prestigeU >= 1` or `prestigeS >= 1` (checked every tick).

There are no other prestige effects.

### 8.5 `loadPrestige()` / `resetPrestige()`

- `loadPrestige()`: `prestigeU` and `prestigeS` = the stored values.
- `resetPrestige()` (debug): `prestigeU = 0`, `prestigeS = 0`, delete the prestige record. It does not refresh the display.

---

## 9. Debug / cheat functions

The original shows these as an ungated column of buttons below the manufacturing panel, next to the save-slot and reset buttons. **Required** (00-overview §4.10, 02-D17): put all of §9 behind a developer/debug option that is off by default. The save-slot buttons and "RESET ALL PROGRESS" can be player-facing or debug-only, as the implementer prefers. If reset is player-facing, add a confirmation prompt.

| Button label | Function | Exact effect | Message (verbatim) |
|---|---|---|---|
| SAVE SLOT 1 / SAVE SLOT 2 | `save1` / `save2` | write the full save (same content as autosave) to slot 1 or 2 | — |
| LOAD SLOT 1 / LOAD SLOT 2 | `load1` / `load2` | §5.2 | — |
| RESET ALL PROGRESS | `reset` | §7 | — |
| Free Clips | `cheatClips` | `clips += 100,000,000`; `unusedClips += 100,000,000` | `you just cheated` |
| Free Money | `cheatMoney` | `funds += 10,000,000`; refresh the funds display (2 decimals) | `LIZA just cheated` |
| Free Trust | `cheatTrust` | `trust += 1` | `Hilary is nice. Also, Liza just cheated` |
| Free Ops | `cheatOps` | `standardOps += 10,000` | `you just cheated, Liza` |
| Free Creativity | `cheatCreat` | `creativityOn = 1`; `creativity += 1,000` | `Liza just cheated. Very creative!` |
| Free Yomi | `cheatYomi` | `yomi += 1,000,000`; refresh the yomi display | `you just cheated` |
| Reset Prestige | `resetPrestige` | §8.5 | — |
| Destroy all Humans | `cheatHypno` | runs `hypnoDroneEvent()` (the hypnodrone release animation and transition, sections 02/04) | — |
| Free Prestige U | `cheatPrestigeU` | `prestigeU += 1`; write the prestige record immediately (no reset) | — |
| Free Prestige S | `cheatPrestigeS` | `prestigeS += 1`; write the prestige record immediately | — |
| Set Battle Number 1 to 7 | `setB` | `battleNumbers[1] = 7`. Index 1 is "Abensberg", so the next Abensberg battle is "Abensberg 7". The label is misleading but it's a debug tool. | — |
| Set Avail Matter to 0 | `zeroMatter` | `availableMatter = 0` | `you just cheated` |

---

## 10. Recommended persistence design

Replace the five-key, triple-copied save code with a single serializer:

1. **One document per slot** (`main`, `slot1`, `slot2`) holding `{ formatVersion, savedAt, state }`. Keep prestige as its own tiny document (`{ formatVersion, prestigeU, prestigeS }`) so a reset cannot touch it.
2. **`state` = all non-constant game state** from sections 01–07, as one structure, including:
   - every §4.1 field except the dead and constant ones
   - `probeHarv`, `giftBits`, and the revenue-tracking accumulators
   - per-project `{ uses, flag }` keyed by **project id**, not catalog index, so the catalog can change without breaking saves
   - the active-project list as ordered ids
   - strategy `active` flags keyed by strategy name/id
   - stocks, qChips, `incomeTracker`, `battleNumbers` (keyed by battle name)
3. **Transient state is reset on load**, not saved: no battle in progress (`battles` empty, roster empty, `honorCount = battleClock = battleEndDelay = masterBattleClock = 0`); `tourneyInProg = 0` and tournament scratch cleared; timers `saveTimer`/`secTimer` = 0.
4. **Load = rebuild, not merge.** Construct a fresh default state, apply the document over it (missing fields keep their defaults; this is the migration hook), then rebuild every derived structure and view: `strats` and the strategy picker, displayed project offers (with titles and price tags computed from current state), all displays in §6, slider position, and recomputed derived values (`probeUsedTrust`, drone/power prices). Slot loads use the same path, so a slot load is identical to a fresh start with that save.
5. **Numbers:** store non-finite values (`Infinity`, `NaN`) explicitly or normalize them, and never load a numeric field as `null` (defect P15). JSON turns them into `null`; for example `giftCountdown` is infinite whenever the gift rate is 0. Values reach about 1e55 (clips in the late game), so double precision is enough.
6. **Validation:** a missing or corrupt slot leaves the current game unchanged and shows a message. It must not crash.
7. **Write atomically**, so a crash mid-save keeps the previous save.
8. **Version gate:** if `formatVersion` is older, run migrations in order. If it's newer than the build supports, refuse to load (and leave the current game unchanged) instead of wiping.

---


## 11. Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

#### 08-P1 — `probeHarv` not persisted
- **Location:** `save`/`save1`/`save2` field lists; `load`/`load1`/`load2`.
- **Original behavior:** `probeHarv` (probe Harvester Drone Production allocation) is never written. After a page-load `load()` it is 0 (its initial value); after a slot load it keeps the live session's value. `probeUsedTrust` is recomputed each tick from the design values, so the points come back as unallocated trust, and `spawnHarvesters` (`probeCount × 0.000002 × probeHarv` harvesters per tick) stops.
- **Fixed behavior:** persist `probeHarv` with the other probe design values.
- **Category:** Gameplay
- **Player impact:** with the fix the allocation survives reloads. In the original, every reload silently stops probe harvester production until the player notices and re-allocates. No net gain or exploit: the freed trust has to be spent again.
- **Recommendation:** Fix
- **Rationale:** a setting that silently resets on reload is plainly broken from the player's view, and the fix changes nothing for a player who never reloads.

#### 08-P2 — Swarm gift progress lost on load
- **Location:** save field list; `updateSwarm` (section 04).
- **Original behavior:** `giftBits` is not saved (the obsolete `elapsedTime` is saved in its place). After a page-load `load()`, `giftBits = 0` and progress toward the next gift restarts. After a slot load the live session's `giftBits` carries over.
- **Fixed behavior:** persist `giftBits`. Drop `elapsedTime`.
- **Category:** Gameplay
- **Player impact:** the fix saves on average half a gift interval per reload. Interval = 125,000 / (ln(d) × sliderPos/100) ticks of 10 ms: e.g. 362 s at d = 1e3 and slider 50, 90 s at d = 1e6 and slider 100, 23 s at d = 1e12 and slider 200. Gifts are 2–24 capacity. Players who reload rarely won't notice. (In the original the slider also snaps to Work on load, which stops gifts entirely; see P12 / 04-D9.)
- **Recommendation:** Fix
- **Rationale:** negligible impact, and progress silently lost on reload is a persistence bug.

#### 08-P3 — Three hand-copied save and load functions
- **Location:** `save`/`save1`/`save2`, `load`/`load1`/`load2`.
- **Original behavior:** six copies. The saved and loaded field sets are identical (231 fields each, checked by diff), but the loads differ in order and checks (P7, P8, P9, §5.3).
- **Fixed behavior:** one serializer and one load path (§10).
- **Category:** Code-only
- **Player impact:** none (behavioral differences are covered by P7–P9).
- **Recommendation:** Fix
- **Rationale:** maintenance hazard only.

#### 08-P4 — Discarded battle leaves stale counters
- **Location:** `refresh` drops `battles[0]`; `honorCount`, `battleClock`, `battleEndDelay`, `masterBattleClock` are restored (combat.js `checkForBattleEnd`, `endBattle`).
- **Original behavior:** the in-flight battle is discarded on load but its counters are kept. If the save happened during the result phase (`honorCount = 1`, at most `battleEndTimer` = 100 or 200 frames ≈ 1.6–3.2 s), the next battle awards or deducts no honor and gives no `bonusHonor` increment, then `endBattle` clears the counters. A restored `masterBattleClock` near 8000 or `battleClock` near 2000 ends the next battle early with no result. The default roster left running at load time is section 07 C1.
- **Fixed behavior:** on load no battle is active and all four counters are 0 (§10.3).
- **Category:** Gameplay
- **Player impact:** negligible. Only when a save lands in a ~2–3 s window, and then one battle's honor (≤ 200 + `bonusHonor`) is skipped once, as a win or a loss.
- **Recommendation:** Fix
- **Rationale:** rare, tiny, not controllable by the player, and the original outcome (a battle with no result) makes no sense.

#### 08-P5 — Project 218/219 `uses` hot fix
- **Location:** `refresh` "HOT FIXES".
- **Original behavior:** every refresh sets `project218.uses = 1` and `project219.uses = 1`. (a) A bought 218 "Limerick (cont.)" is offered again once `creativity >= 1,000,000` after every reload. (b) If 218 or 219 was on offer at save time, the load re-displays it and the next tick `manageProjects` displays it again, giving two buttons with the same id. `manageProjects` enables/disables only the first element with that id, so the second button stays enabled regardless of cost, and its effect deducts without checking. 219 is very commonly on offer in the human phase (its trigger is `creativity >= 100,000` and it re-arms itself), so most mid-game page reloads create the duplicate.
- **Fixed behavior:** restore `uses` exactly as saved. No hot fix. Never display a project already in `activeProjects`.
- **Category:** Gameplay
- **Player impact:** small. The duplicate 219 allows one free trust re-allocation per reload without having 100,000 creativity (creativity goes negative). Re-buying 218 just spends 1M creativity for a message.
- **Recommendation:** Fix
- **Rationale:** duplicate buttons that ignore cost are a minor exploit, and the fix matches 00-overview §4.9 and 06-D5.

#### 08-P6 — Mutable project titles and price tags not restored
- **Location:** `load`, `load1`, `load2`.
- **Original behavior:** only 40b's and 51's price tags are rebuilt. Project 133's title and price tag come from the catalog initializer (`"Durenstein 1"`, `"(50,000 creat, 5,000 yomi)"`) even though `threnodyTitle` and `threnodyCost` are restored, so the tag disagrees with the real cost. Project 216's tag is the literal `"null"` (it is set only by project 215's effect).
- **Fixed behavior:** derive every title and price tag from current state when shown (00-overview §4.4).
- **Category:** Display
- **Player impact:** none on play; the shown cost now matches the real cost.
- **Recommendation:** Fix
- **Rationale:** display-only.

#### 08-P7 — Price tag fix-ups wrong or in the wrong order
- **Location:** `load`, `load1`, `load2`.
- **Original behavior:** `load1`/`load2` set the 40b/51 tags after re-displaying active projects, so restored offers show the live session's prices. All loads format `qChipCost` without separators ("(15000 ops)"); the catalog uses them ("(10,000 ops)").
- **Fixed behavior:** per P6, with thousands separators.
- **Category:** Display
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** display-only.

#### 08-P8 — Slot loads merge into the live session
- **Location:** `load1`, `load2`.
- **Original behavior:** active projects and strategies from the slot are appended without clearing the live ones. Every project on offer in both gets a second button with the same id. As in P5, the second button is never disabled and its effect doesn't check cost. After the first purchase the other button stays and can be bought again. Each further load appends again. Strategies active in both are appended to `strats` again (the same objects), and picker labels come from `strats[i].name`, which is now the wrong entry. Projects on offer only in the live session stay on screen. Non-persisted values (`probeHarv`, `giftBits`, battle roster, revenue trackers) keep their live values.
- **Fixed behavior:** a slot load is a full rebuild (§10.4), identical to a fresh start with that save.
- **Category:** Gameplay
- **Player impact:** large exploit. Save slot → load slot lets the player buy any on-offer one-shot project twice (once without being able to afford it), repeatable without limit. Duplicated strategy objects accumulate score from both seats: a pool of 8 duplicated to 15 gives each duplicated strategy about 3.75× the score per tournament for 3.5× the rounds, i.e. ~3.75× yomi per tournament cost. The fix removes all of this.
- **Recommendation:** Fix
- **Rationale:** unlimited re-purchase and inflated counts are plainly broken, and the overview (§4.9) already rules slot loads replace the session.

#### 08-P9 — Missing-slot crash and no version check on slot loads
- **Location:** `load1`, `load2`; `load` at startup.
- **Original behavior:** an empty slot makes the first read (`loadProjectsUses[i]`) throw before any state changes, so the button silently does nothing. A main save with `saveGame` present but another key missing or corrupt throws inside the startup `load()`, which aborts the rest of the startup script, including the main and slow loops: the game never runs until storage is cleared. Slot loads skip the `resetFlag` check.
- **Fixed behavior:** validate the whole document first; on failure leave the game unchanged and show a message (§10.6). Same version handling for every slot.
- **Category:** Robustness
- **Player impact:** none in normal play; removes a startup softlock after storage corruption.
- **Recommendation:** Fix
- **Rationale:** robustness.

#### 08-P10 — Revenue trackers not saved
- **Location:** `calculateRev`; save field list.
- **Original behavior:** `income` restarts at 0 and `incomeNow` is undefined after a page load, so the first sample is `NaN`. It stays in the 10-entry `incomeTracker` for ~10 s, during which "Avg. Rev. per sec" and "Avg. Clips Sold per sec" show `NaN` whenever `demand > unsoldClips`. (Slot loads keep the live trackers.) These values feed only the displays.
- **Fixed behavior:** persist the trackers, or initialize `incomeNow = income` on load per 01-D5. Persisting is recommended.
- **Category:** Display
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** display-only.

#### 08-P11 — Constants, dead and derived values saved
- **Location:** save field list (`warTrigger`, `drifterCombat`, `maxBattles`, `attackSpeed`, `battleSpeed`, `attackSpeedMod`, `battleAlarm`, `outcomeTimer`, `x`, `clippperCost`, `egoFlag`, `testFlag`, `elapsedTime`, `probeUsedTrust`).
- **Original behavior:** saved and loaded. All hold their default values in this version, so there's no effect today. (`drifterCombat` is read by live combat and `clippperCost` by the 01-D1 typo, both at their constant values.)
- **Fixed behavior:** don't persist constants, dead fields or derived values.
- **Category:** Code-only
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** prevents saves from freezing old balance values.

#### 08-P12 — `refresh()` misses some displays
- **Location:** `refresh`.
- **Original behavior:** the battle name and "Scale" displays keep their HTML defaults ("Drifter Attack 1", "1") until the next battle. The Work/Think slider control is not set from `sliderPos`; the next tick reads the control's default 0 into `sliderPos` (04-D9), so after a load drones run at the full-Work factor 2.0 and the gift rate is 0 until the player moves the slider.
- **Fixed behavior:** restore all three on load.
- **Category:** Display (battle name, scale); the slider part is Gameplay and is owned by 04-D9.
- **Player impact:** none for the displays. For the slider: after each reload, matter/wire output jumps to 2× of the midpoint setting and gifts stop until the player re-sets it.
- **Recommendation:** Fix
- **Rationale:** a setting silently changed by reloading is broken from the player's view; displays are display-only.

#### 08-P13 — Fresh-game result display
- **Location:** startup (no `refresh()` without a save or prestige record); index2.html `victoryDiv`.
- **Original behavior:** the combat result block starts visible with placeholder text ("VICTORY +200 honor") until `refresh()` or the first `endBattle` hides it. Cross-ref 07 C3.
- **Fixed behavior:** the initial UI equals the post-refresh state.
- **Category:** Display
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** display-only.

#### 08-P14 — `resetFlag` wipes instead of migrating
- **Location:** `load`.
- **Original behavior:** a main save with `resetFlag != 2` is loaded and then deleted by `reset()`. Every save this version writes has `resetFlag = 2`, so only saves from older versions are hit.
- **Fixed behavior:** versioned migrations; refuse (without wiping) a newer format (§10.8).
- **Category:** Robustness
- **Player impact:** none in normal play.
- **Recommendation:** Fix
- **Rationale:** silent deletion of a save is data loss.

#### 08-P15 — Non-finite values load as `null` and grant swarm gifts (new)
- **Location:** JSON encoding in `save*`; `updateSwarm` gift test `giftCountdown <= 0`.
- **Original behavior:** with the swarm Active and `sliderPos = 0`, the gift rate is 0 and `giftCountdown = Infinity`. `giftCountdown` is recomputed only while the swarm is Active, so it stays `Infinity` if the status then changes (no power, bored, disorganized, space phase before project 130). It saves as `null`, and `null <= 0` is true. On the first tick after load a gift of 1 is granted (`nextGift` rounds to 0 at slider 0, floored to 1). If the swarm isn't Active at that point, `giftCountdown` stays `null` and +1 gift is granted every tick (100 per second) until it becomes Active. Since the slider resets to 0 on every load (P12), the precondition is very common.
- **Fixed behavior:** encode non-finite numbers explicitly (or normalize them) and never load a numeric field as `null` (§10.5). A restored `Infinity` countdown never passes the gift test.
- **Category:** Gameplay
- **Player impact:** the fix removes free capacity: +1 processor/memory per reload in the common case, and up to 360,000 per hour of non-Active swarm time in the worst case.
- **Recommendation:** Fix
- **Rationale:** an exploit with nonsensical counts. Related: 04-D6 (gift every tick while not Active) and 04-D7 (division by a zero rate).

#### 08-P16 — Prestige farming through save slots (new)
- **Location:** projects 200/201; `reset`; `load1`/`load2`; prestige record kept apart from slots.
- **Original behavior:** per §8.3. A slot saved before a prestige can be loaded afterwards; it keeps the current `prestigeU`/`prestigeS` and restores projects 200/201 as saved, so each save → prestige → load cycle adds +1 without replaying the game. Each cycle costs 300,000 ops or creativity from the slot's own state. Demand (×(1 + 0.1·U)) and creativity speed (×(1 + 0.1·S)) bonuses are unbounded: 20 cycles give ×3 in the next real run.
- **Fixed behavior (optional variant):** each save document records `prestigeAt = {prestigeU, prestigeS}` at the time of saving (a new game records the current prestige values). Buying 200 sets `prestigeU = max(prestigeU, prestigeAt.prestigeU + 1)` and buying 201 sets `prestigeS = max(prestigeS, prestigeAt.prestigeS + 1)`. A pre-prestige slot then grants nothing on re-purchase, and normal play is unchanged.
- **Category:** Gameplay
- **Player impact:** variant blocks an unbounded prestige exploit; no effect on players who don't use slots.
- **Recommendation:** Keep original, fix as optional variant
- **Rationale:** it's how the original plays and needs the save-slot buttons, which sit in the developer column. Enable the variant if slots are made player-facing (§9).

#### 08-P17 — No save on close (new)
- **Location:** autosave (slow loop); no unload handler.
- **Original behavior:** the game saves only every 25 s, so closing loses up to 25 s, and reloading reverts the last ≤ 25 s.
- **Fixed behavior:** also save when the application closes or loses focus, if the platform allows (§3).
- **Category:** Robustness
- **Player impact:** less lost progress. It also removes the incidental "reload to undo the last few seconds" (e.g. a stock loss).
- **Recommendation:** Fix
- **Rationale:** data loss on exit; the undo trick is not part of the design.

Intentional, keep: prestige survives "RESET ALL PROGRESS". Save slots survive reset (but see P16). Autosave writes only the main save. Loading a slot makes it the current game.
