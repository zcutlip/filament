# 01 — Core Economy, State Inventory, and Main Loop

This section defines the global game state, the timing model (every periodic loop and the ordered steps it runs), and the phase-1 economy: wire, clip making, AutoClippers/MegaClippers, pricing, demand, sales, revenue tracking, trust, processors/memory, operations, creativity, milestones, and the two shared number/time formatters.

Conventions used throughout:

- `random()` is a uniform real in [0, 1).
- `floor`, `ceil`, `round` are the usual mathematical functions; `round(x)` rounds half up (toward +infinity), i.e. `floor(x + 0.5)`.
- `log10`, `pow`, `sin` (radians) as usual.
- All numeric state is double-precision floating point unless stated otherwise. Many quantities (clips, wire, funds, operations) are fractional internally and are only rounded for display.
- "Phase 1" = `humanFlag == 1`. "Phase 2" = `humanFlag == 0 && spaceFlag == 0`. "Phase 3" = `spaceFlag == 1` (and `humanFlag == 0`).
- `displayMessage(text)` appends a line to the message console (owned by section 02: a 5-line log, newest line shown as the current prompt line, older lines scroll up; the initial current line reads `Welcome to Universal Paperclips`).

## 1. Number and time formatting

These formats are referenced by every section.

### 1.1 `fmtGrouped(n)` (the original's default locale formatting)

Always en-US (see 01-D11): thousands separators (`,`), decimal point `.`, at most 3 fraction digits (rounded half away from zero), with no trailing zeros. Examples: `1234.5` -> `1,234.5`; `0.0105` -> `0.011`; `1000000` -> `1,000,000`. Wherever this spec writes `fmtGrouped(floor(x))` the result is an integer with separators.

### 1.2 `fmtMoney(n)`

Thousands separators, exactly 2 fraction digits (rounded half away from zero). Example: `1234.5` -> `1,234.50`.

### 1.3 `numberCruncher(number, decimals = 2)`

Abbreviates large numbers with an English word suffix.

```
function numberCruncher(number, decimals = 2):
    tiers = [ (1e51, "sexdecillion"), (1e48, "quindecillion"), (1e45, "quattuordecillion"),
              (1e42, "tredecillion"), (1e39, "duodecillion"), (1e36, "undecillion"),
              (1e33, "decillion"), (1e30, "nonillion"), (1e27, "octillion"),
              (1e24, "septillion"), (1e21, "sextillion"), (1e18, "quintillion"),
              (1e15, "quadrillion"), (1e12, "trillion"), (1e9, "billion"),
              (1e6, "million"), (1e3, "thousand") ]
    for (scale, word) in tiers (in the order listed):
        if number >= scale:
            return toFixed(number / scale, decimals) + " " + word
    return toFixed(number, 0)
```

`toFixed(v, d)` = fixed-point with exactly `d` fraction digits, no thousands separators, rounded half up. Values below 1000 (including all negative values) are shown with 0 decimals and no suffix. There is no tier above sexdecillion, so larger values keep that suffix (e.g. total matter 3e55 displays as `30000.00 sexdecillion`). Examples: `numberCruncher(1500)` -> `1.50 thousand`; `numberCruncher(2.5e9, 1)` -> `2.5 billion`; `numberCruncher(999.4)` -> `999`.

(See 01-D7/01-D8 for the original's threshold and trailing-space quirks.)

### 1.4 `timeCruncher(t)`

Converts a tick count (100 ticks per second) to an English duration.

```
function timeCruncher(t):
    x = t / 100                       # seconds, fractional
    h = floor(x / 3600)
    m = floor((x mod 3600) / 60)
    s = floor((x mod 3600) mod 60)
    hD = h > 0 ? h + (h == 1 ? " hour "   : " hours ")   : ""
    mD = m > 0 ? m + (m == 1 ? " minute " : " minutes ") : ""
    sD = s > 0 ? s + (s == 1 ? " second"  : " seconds")  : ""
    return hD + mD + sD
```

(`mod` is the floating-point remainder; all operands are non-negative.) Note the trailing spaces after "hour(s)" and "minute(s)" are part of the format; e.g. 3,723.4 s -> `1 hour 2 minutes 3 seconds`, 3,600 s -> `1 hour ` (with trailing space). Under 1 second yields the empty string.

## 2. State inventory

Every global from the original's globals file, in declaration order, plus the economy-related module-level variables. "Owner" is the section whose rules write the variable (others may read it). "unused" means the variable exists in the original (and in its save format, see 08) but has no gameplay effect; a reimplementation may omit it except as save-format compatibility requires (section 08 decides).

### 2.1 Globals

| Name | Initial | Meaning | Owner |
|---|---|---|---|
| `clips` | 0 | Total clips ever produced (fractional). | 01 |
| `unusedClips` | 0 | Clips available to spend in phases 2–3 (incremented by every clip made). | 01 (spent by 04) |
| `clipRate` | 0 | Clips produced during the last complete 1-second window. | 01 |
| `clipRateTemp` | 0 | Accumulator for the current clip-rate window. | 01 |
| `prevClips` | 0 | `clips` at the previous clip-rate sample. | 01 |
| `clipRateTracker` | 0 | Tick counter (0..100) for the clip-rate window. | 01 |
| `clipmakerRate` | 0 | unused. | — |
| `clipmakerLevel` | 0 | Number of AutoClippers owned. | 01 (reset by 05) |
| `clipmakerLevel2` | 0 | unused (name collides with a display id). | — |
| `clipperCost` | 5 | Current AutoClipper price ($). | 01 |
| `unsoldClips` | 0 | Unsold inventory (fractional). | 01 |
| `funds` | 0 | Available funds ($), kept at whole cents by sales. | 01 |
| `margin` | 0.25 | Price per clip ($), multiple of 0.01. | 01 |
| `wire` | 1000 | Wire on hand (inches, fractional). | 01 (also 04) |
| `wireCost` | 20 | Current price of one wire spool ($, integer). | 01 |
| `adCost` | 100 | Current Marketing upgrade price ($). | 01 |
| `demand` | 5 | Public demand index (recomputed every phase-1 tick). | 01 |
| `clipsSold` | 0 | Total clips sold (not displayed). | 01 |
| `avgRev` | 0 | Displayed average revenue per second. | 01 |
| `income` | 0 | Cumulative sales revenue ($) used by revenue tracker. | 01 |
| `incomeTracker` | `[0]` | Rolling list (max 10) of per-second revenue samples. | 01 |
| `ticks` | 0 | Main-loop tick count (100 per second). | 01 |
| `marketing` | 1 | Marketing multiplier, `1.1^(marketingLvl-1)`. | 01 |
| `marketingLvl` | 1 | Marketing level. | 01 |
| `x` | 0 | unused. | — |
| `clippperCost` | 5 | unused (typo variable; see defect D1). | — |
| `processors` | 1 | Processor count. | 01 (also 04/05) |
| `memory` | 1 | Memory count; max operations = `memory*1000`. | 01 (also 05) |
| `operations` | 0 | Displayed/spendable operations, derived each tick. | 01 |
| `trust` | 2 | Trust (cap on processors+memory in phase 1). | 01 (also 05) |
| `nextTrust` | 3000 | Clip total at which the next trust point is awarded. | 01 |
| `transaction` | 1 | Value of the last sale ($); no other effect. | 01 |
| `clipperBoost` | 1 | AutoClipper output multiplier. | 05 |
| `blinkCounter` | 0 | Project-button blink animation counter. | 02 |
| `creativity` | 0 | Creativity (fractional). | 01 (spent by 05) |
| `creativityOn` | false | Creativity unlocked. | 05 |
| `safetyProjectOn` | false | unused. | — |
| `boostLvl` | 0 | AutoClipper upgrade chain progress. | 05 |
| `wirePurchase` | 0 | Number of wire spools bought. | 01 |
| `wireSupply` | 1000 | Inches of wire per spool. | 05 |
| `marketingEffectiveness` | 1 | Demand multiplier from marketing projects. (Declared twice in the original; one variable.) | 05 |
| `milestoneFlag` | 0 | Milestone progression index (0..20). | 01 (also 04 for 15..20) |
| `bankroll` | 0 | Investment cash. | 03 |
| `fib1` | 2 | Fibonacci state for trust thresholds. | 01 |
| `fib2` | 3 | Fibonacci state for trust thresholds. | 01 |
| `strategyEngineFlag` | 0 | Strategic modeling unlocked. | 03/05 |
| `investmentEngineFlag` | 0 | Investments unlocked. | 03/05 |
| `revPerSecFlag` | 0 | Show revenue-per-second readouts. | 05 |
| `compFlag` | 0 | Computational resources unlocked (enables operations). | 01 |
| `projectsFlag` | 0 | Projects panel unlocked. | 01 |
| `autoClipperFlag` | 0 | AutoClipper panel unlocked. | 02 (set when `funds >= 5`) |
| `megaClipperFlag` | 0 | MegaClipper panel unlocked. | 05 |
| `megaClipperCost` | 500 | Current MegaClipper price ($). | 01 |
| `megaClipperLevel` | 0 | Number of MegaClippers. | 01 (reset by 05) |
| `megaClipperBoost` | 1 | MegaClipper output multiplier. | 05 |
| `creativitySpeed` | 1 | Creativity rate factor. | 01 (also 05) |
| `creativityCounter` | 0 | Ticks since last creativity increment. | 01 |
| `wireBuyerFlag` | 0 | WireBuyer unlocked. | 05 (cleared by 02 in phase 2+) |
| `demandBoost` | 1 | Demand multiplier from acquisition projects. | 05 |
| `humanFlag` | 1 | 1 during phase 1; 0 after HypnoDrones. | 05 |
| `trustFlag` | 1 | unused. | — |
| `nanoWire` | 0 | Copy of `wire` taken at HypnoDrone release; never read. Omit (05-D5). | 05/04 |
| `creationFlag` | 0 | unused. | — |
| `wireProductionFlag` | 0 | Wire-production panel unlocked. | 04 |
| `spaceFlag` | 0 | Phase 3 active. | 04/05 |
| `factoryFlag` | 0 | Factories unlocked. | 04 |
| `harvesterFlag` | 0 | Harvester drones unlocked. | 04 |
| `wireDroneFlag` | 0 | Wire drones unlocked. | 04 |
| `factoryLevel` | 0 | Clip factories. | 04 |
| `factoryBoost` | 1 | Factory multiplier. | 04/05 |
| `droneBoost` | 1 | Drone multiplier. | 04/05 |
| `availableMatter` | 6e27 | Unharvested matter (g). | 04 |
| `acquiredMatter` | 0 | Harvested, unprocessed matter. | 04 |
| `processedMatter` | 0 | unused. | — |
| `harvesterLevel` | 0 | Harvester drones. | 04 |
| `wireDroneLevel` | 0 | Wire drones. | 04 |
| `factoryCost` | 1e8 | Factory price (clips). | 04 |
| `harvesterCost` | 1e6 | Harvester price. | 04 |
| `wireDroneCost` | 1e6 | Wire drone price. | 04 |
| `factoryRate` | 1e9 | Clips per tick per factory (before modifiers). | 04 |
| `harvesterRate` | 26180337 | Matter per tick per harvester. | 04 |
| `wireDroneRate` | 16180339 | Wire per tick per wire drone. | 04 |
| `harvesterBill` / `wireDroneBill` / `factoryBill` | 0 | Clips spent (refund on disassemble). | 04 |
| `probeCount` | 0 | Live probes. | 04 |
| `totalMatter` | 3e55 | Matter in the universe. | 04 |
| `foundMatter` | 6e27 (= initial `availableMatter`) | Matter discovered. | 04 |
| `qFlag` | 0 | Quantum computing unlocked. | 03/05 |
| `qClock` | 0 | Quantum oscillator clock. | 03 |
| `qChipCost` | 10000 | Photonic chip project cost. | 05 |
| `nextQchip` | 0 | Index of next photonic chip. | 05 |
| `bribe` | 1000000 | Cost of the bribe project. | 05 |
| `battleFlag` | 0 | Combat active/visible. | 07 |
| `prestigeU` | 0 | Universe prestige level (+10% demand each). | 08 |
| `prestigeS` | 0 | Sim prestige level (+10% creativity speed each). | 08 |
| `autoTourneyFlag` | 0 | Auto-tournament unlocked. | 03/05 |
| `egoFlag` | 0 | unused. | — |
| `tothFlag` | 0 | "Unused Clips" display unlocked. | 04/05 |
| `wirePriceCounter` | 0 | Phase counter for wire price oscillation. | 01 |
| `wireBasePrice` | 20 | Underlying wire price. | 01 |
| `farmRate`, `batterySize`, `factoryPowerRate`, `dronePowerRate` | 50, 10000, 200, 1 | Power constants. | 04 |
| `farmLevel`, `batteryLevel` | 0, 0 | Solar farms, batteries. | 04 |
| `farmCost`, `batteryCost` | 1e7, 1e6 | Power prices. | 04 |
| `storedPower`, `powMod` | 0, 0 | Stored power; power modifier applied to production. | 04 |
| `farmBill`, `batteryBill` | 0, 0 | Refund tallies. | 04 |
| `momentum` | 0 | Momentum project flag. | 04/05 |
| `swarmFlag` | 0 | Swarm computing unlocked. | 04 |
| `swarmStatus` | 7 | Swarm status code. | 04 |
| `swarmGifts` | 0 | Swarm gifts available (spent on processors/memory in phase 2+). | 04 (spent by 01) |
| `nextGift`, `giftPeriod`, `giftCountdown`, `elapsedTime` | 0, 125000, 125000, 0 | Swarm gift timing. | 04 |
| `honor` | 0 | Honor (combat). | 07 |
| `maxTrust`, `maxTrustCost` | 20, 91117.99 | Probe max trust and its honor cost. | 04 |
| `disorgCounter`, `disorgFlag`, `synchCost`, `disorgMsg` | 0, 0, 5000, 0 | Swarm disorganization. | 04 |
| `threnodyCost` | 50000 | Threnody project cost. | 05 |
| `entertainCost`, `boredomLevel`, `boredomFlag`, `boredomMsg` | 10000, 0, 0, 0 | Swarm boredom. | 04 |
| `wireBuyerStatus` | 1 | WireBuyer toggle (1 = ON). | 01 |
| `wirePriceTimer` | 0 | Slow ticks since last wire purchase / decay. | 01 |
| `qFade` | 1 | Opacity of the qOps readout. | 03 |
| `autoTourneyStatus` | 1 | Auto-tournament toggle. | 03 |
| `driftKingMessageCost` | 1 | Drift King message project cost. | 05 |
| `sliderPos` | 0 | Swarm work/think slider (0..200). | 04 |
| `tempOps` | 0 | Temporary (overflow) operations from quantum computing. | 01 (added by 03) |
| `standardOps` | 0 | Regular stored operations. | 01 (spent by 03/05) |
| `opFade` | 0 | Per-tick decay amount of `tempOps`. | 01 (reset by 03) |
| `opFadeTimer` | 0 | Ticks since last quantum overflow. | 01 (reset by 03) |
| `opFadeDelay` | 800 | Ticks before `tempOps` begins to fade. | 01 |
| `dismantle` | 0 | Ending dismantle stage (0..7). | 04/05 |
| `endTimer1`..`endTimer6` | 0 | Ending sequence timers. | 04 |
| `testFlag` | 0 | unused. | — |
| `finalClips` | 0 | Clips hand-made during the final dismantle. | 04 (incremented in 01's clip click) |
| `resetFlag` | 2 | Save-format version marker. | 08 |
| `threnodyAudio`, `threnodyLoadedBool` | (audio handle), false | Ending music. | 04 |

### 2.2 Economy module-level variables (not in the globals file)

| Name | Initial | Meaning | Owner |
|---|---|---|---|
| `incomeThen` | (see D5) | `income` at the previous revenue sample. | 01 |
| `incomeNow` | (see D5; intended: equal to `income`) | `income` at the latest revenue sample. | 01 |
| `incomeLastSecond` | — | Revenue in the last second. | 01 |
| `trueAvgRev` | — | Mean of `incomeTracker`. | 01 |
| `avgSales` | — | Displayed average clips sold per second. | 01 |
| `secTimer` | 0 | Slow-loop counter for the 1-second revenue calc. | 01 |
| `saveTimer` | 0 | Slow-loop counter for auto-save. | 01 (save itself: 08) |
| `maxFactoryLevel`, `maxDroneLevel` | 0, 0 | Highest factory / combined drone counts ever reached. | 04 |
| `stockReportCounter` | 0 | Ticks since last investment report. | 03 |

(`revTimer` and `sum` exist in the original but `revTimer` is unused and `sum` is a scratch variable.)

## 3. Timing model and tick schedule

The game is driven by fixed-period loops. The original uses independent repeating timers with no catch-up (if the host stalls or throttles, simulated time is simply lost). A reimplementation should run each loop at its nominal period using fixed steps; gameplay quantities are all "per step", never scaled by real elapsed time. The original's interleaving of loops that come due at the same instant is not deterministic; any consistent order is acceptable. Recommended deterministic order: drive everything from a 10 ms base step; on each base step run the main tick first, then, on every 10th base step, the 100 ms loops in the order listed below, then the 1000 ms loop on every 100th, then the 2500 ms loop on every 250th.

| Loop | Period | Owner of content | Ordered steps |
|---|---|---|---|
| Main tick | 10 ms (100/s) | 01 (steps delegated as noted) | see §3.1 |
| Slow loop | 100 ms (10/s) | 01 | see §3.2 |
| Stock display | 100 ms | 03 | Read the risk selector into `riskiness`; recompute `secTotal`, `portTotal = bankroll + secTotal`; refresh portfolio table. |
| Strategy picker | 100 ms | 03 | Copy the strategy selector into `pick`. (May be event-driven in a reimplementation.) |
| Stock buying | 1000 ms | 03 | If `humanFlag == 1`: `stockShop()`. |
| Stock selling/pricing | 2500 ms | 03 | `sellDelay++`; if `portfolioSize > 0 && sellDelay >= 5 && random() <= 0.3 && humanFlag == 1`: sell, `sellDelay = 0`. Then if `portfolioSize > 0 && humanFlag == 1`: update stock prices. |
| Combat update | 16 ms, while a battle runs | 07 | See section 07. |
| Transient animations | 30 ms ×12 (project button blink), 32 ms ×120 (HypnoDrone text), 50 ms chained (tournament rounds) | 02 / 04 / 03 | Cosmetic or tournament stepping; see owning sections. |

### 3.1 Main tick (every 10 ms)

Executed in exactly this order:

1. `ticks = ticks + 1`.
2. `milestoneCheck()` (§9).
3. Button/visibility refresh (`buttonUpdate`, section 02). State side effects inside it that matter to the economy: if `funds >= 5` then `autoClipperFlag = 1`; if `humanFlag == 0` then `investmentEngineFlag = 0` and `wireBuyerFlag = 0`; `qFade = qFade - 0.001`; auto-tournament timer (section 03). Enable rules for this section's buttons are in §4–§8.
4. If `compFlag == 1`: `calculateOperations()` (§7.3).
5. If `humanFlag == 1`: `calculateTrust()` (§7.1).
6. If `qFlag == 1`: `quantumCompute()` (section 03).
7. `updateStats()` — refresh the displays listed in §10.
8. `manageProjects()` (sections 05/06: reveal newly triggered projects, refresh their enabled state).
9. (Empty. The original calls `milestoneCheck()` a second time here; that call never fires anything and is omitted, see 01-D6.)
10. Clip-rate tracker (§4.4).
11. Investment report (section 03 content): `stockReportCounter++`; if `investmentEngineFlag == 1 && stockReportCounter >= 10000`: `displayMessage("Lifetime investment revenue report: $" + fmtGrouped(ledger + portTotal))`, `stockReportCounter = 0`.
12. WireBuyer: if `wireBuyerFlag == 1 && wireBuyerStatus == 1 && wire <= 1`: `buyWire()` (§5.2).
13. `exploreUniverse()` (04; runs every tick, effectively a no-op while `probeCount == 0`).
14. If `humanFlag == 0 && spaceFlag == 0`: drone button refresh (04).
15. `updatePower()`, `updateSwarm()`, `acquireMatter()`, `processMatter()` (04; each self-gated).
16. Factory production (04 owns the quantities): `fbst = (factoryBoost > 1) ? factoryBoost * factoryLevel : 1`; if `dismantle < 4`: `clipClick(powMod * fbst * floor(factoryLevel) * factoryRate)`.
17. If `spaceFlag == 1`: if `probeCount < 0` then `probeCount = 0`; then `encounterHazards()`, `spawnFactories()`, `spawnHarvesters()`, `spawnWireDrones()`, `spawnProbes()`, `drift()`, `war()` (04/07).
18. Auto-clippers: if `dismantle < 4`: `clipClick(clipperBoost * (clipmakerLevel / 100))`, then `clipClick(megaClipperBoost * (megaClipperLevel * 5))`.
19. Demand curve (§6.1), only if `humanFlag == 1`.
20. Creativity: if `creativityOn && operations >= memory * 1000`: `calculateCreativity()` (§7.4).
21. **Ending hook** (section 04 owns): dismantle-stage panel hiding, final wire trickle, `endTimer1..6` increments, and the credits messages that advance `milestoneFlag` from 15 to 20. Runs last in the tick.

### 3.2 Slow loop (every 100 ms)

1. `adjustWirePrice()` (§5.1). Runs in all phases.
2. If `humanFlag == 1`:
   1. Sales: if `random() < demand / 100`: `sellClips(floor(0.7 * pow(demand, 1.15)))` (§6.2).
   2. `secTimer++`; if `secTimer >= 10`: `calculateRev()` (§6.3), `secTimer = 0`.
3. `saveTimer++`; if `saveTimer >= 250` (every 25 s): auto-save (section 08), `saveTimer = 0`.

## 4. Making clips

### 4.1 `clipClick(number)` — the single clip-production primitive

Used by the "Make Paperclip" button (`number = 1`) and by every automated producer.

```
function clipClick(number):
    if dismantle >= 4: finalClips = finalClips + 1      # ending hook, section 04
    if wire >= 1:
        if number > wire: number = wire
        clips       += number
        unsoldClips += number
        wire        -= number
        unusedClips += number
```

Notes: production is fractional (e.g. one AutoClipper makes 0.01 clips per tick). When `wire < 1` nothing is produced even if a fractional amount could be (design quirk, keep). `finalClips` increments on every call while `dismantle >= 4`; in that stage the automated callers are suppressed (steps 16 and 18 require `dismantle < 4`), so only manual clicks count.

Button **Make Paperclip**: always visible; enabled when `wire >= 1`.

### 4.2 AutoClippers

Panel visible when `autoClipperFlag == 1` (set permanently the first tick `funds >= 5`). Label `AutoClippers` with count `clipmakerLevel`; `Cost: $ fmtMoney(clipperCost)`.

```
function makeClipper():
    if funds >= clipperCost:
        clipmakerLevel += 1
        funds -= clipperCost
    clipperCost = pow(1.1, clipmakerLevel) + 5
```

Enabled when `funds >= clipperCost`; the click re-checks the same condition (see 01-D1). Output: `clipperBoost * clipmakerLevel / 100` clips per tick (= `clipperBoost` clips/s each). The first unit costs the initial 5; thereafter the formula applies (so the second costs 6.10). The cost is recomputed even if the purchase fails (no visible effect).

### 4.3 MegaClippers

Panel visible when `megaClipperFlag == 1`. Label `MegaClippers` with count `megaClipperLevel`; `Cost: $ fmtMoney(megaClipperCost)`.

```
function makeMegaClipper():
    if funds >= megaClipperCost:
        megaClipperLevel += 1
        funds -= megaClipperCost
    megaClipperCost = pow(1.07, megaClipperLevel) * 1000
```

Enabled when `funds >= megaClipperCost`. Output `megaClipperBoost * megaClipperLevel * 5` per tick (500 × boost clips/s each). First unit costs 500, second 1,070.00.

### 4.4 Clip-rate tracker (main tick step 10)

```
clipRateTracker += 1
if clipRateTracker < 100:
    clipRateTemp += clips - prevClips
    prevClips = clips
else:
    clipRateTracker = 0
    clipRate = clipRateTemp
    clipRateTemp = 0
```

On the reset tick no sample is taken and `prevClips` is not updated, so the next sample includes that tick's production; in steady state `clipRate` equals exactly the clips produced in the preceding 100 ticks (1 second), including manual clicks. `clipRate` therefore updates once per second. Replicate the algorithm as written (it is also what the save format stores).

### 4.5 `updateUpgrades()` (factory/drone upgrade thresholds; values owned by 04)

Called whenever factories or drones are built and on load.

```
nfup = maxFactoryLevel < 10 ? 10 : maxFactoryLevel < 20 ? 20 : maxFactoryLevel < 50 ? 50 : 0
ndup = maxDroneLevel < 500 ? 500 : maxDroneLevel < 5000 ? 5000 : maxDroneLevel < 50000 ? 50000 : 0
```

Display `Next Upgrade at: fmtGrouped(nfup) Factories` and `Next Upgrade at: fmtGrouped(ndup) Drones`. (Visibility of these readouts: section 02/04.)

## 5. Wire

### 5.1 Wire price drift — `adjustWirePrice()` (slow loop, every 100 ms)

```
wirePriceTimer += 1
if wirePriceTimer > 250 and wireBasePrice > 15:
    wireBasePrice = wireBasePrice - wireBasePrice / 1000
    wirePriceTimer = 0
if random() < 0.015:
    wirePriceCounter += 1
    wireCost = ceil(wireBasePrice + 6 * sin(wirePriceCounter))
```

So the base price decays by 0.1% after every 25.1 s with no purchase (stopping once it is no longer above 15), and the displayed price jumps to a new sinusoid sample on average every 6.7 s. `wireCost` changes only here (and in project effects, section 05); a purchase raises `wireBasePrice` but the shown `wireCost` stays until the next fluctuation (intended).

### 5.2 Buying wire — `buyWire()`

```
function buyWire():
    if funds >= wireCost:
        wirePriceTimer = 0
        wire += wireSupply
        funds -= wireCost
        wirePurchase += 1
        wireBasePrice += 0.05
```

Button `Wire`, followed by `fmtGrouped(floor(wire))` and ` inches`; `Cost: $ wireCost` (integer). Enabled when `funds >= wireCost`.

### 5.3 WireBuyer

Visible when `wireBuyerFlag == 1`. Button `WireBuyer` toggles `wireBuyerStatus` between 1 and 0; status label shows `ON` (1) or `OFF` (0); initially `ON`. Effect: main tick step 12 (at most one spool per tick, only when `wire <= 1`).

## 6. Selling

### 6.1 Demand curve (main tick step 19, phase 1 only)

```
marketing = pow(1.1, marketingLvl - 1)
demand = (0.8 / margin) * marketing * marketingEffectiveness * demandBoost
demand = demand + (demand / 10) * prestigeU
```

In phases 2–3 `demand` is frozen at its last value. Initial effective demand at margin 0.25 is 3.2 (displayed `32`%).

Displayed as `Public Demand: fmtGrouped(round(demand * 10))%` (0 decimals).

### 6.2 Sales (slow loop, phase 1)

Each 100 ms: with probability `min(demand/100, 1)` (i.e. `random() < demand/100`), attempt to sell `floor(0.7 * pow(demand, 1.15))` clips:

```
function sellClips(number):
    if unsoldClips > 0:
        if number > unsoldClips:
            transaction = floor(unsoldClips * margin * 1000) / 1000
            funds = floor((funds + transaction) * 100) / 100
            income += transaction
            clipsSold += unsoldClips
            unsoldClips = 0
        else:
            transaction = floor(number * margin * 1000) / 1000
            funds = floor((funds + transaction) * 100) / 100
            income += transaction
            clipsSold += number
            unsoldClips -= number
```

Note `funds` is truncated to whole cents after each sale (fractional cents are lost; intended rounding). If `demand` is below about 1.364 the batch size is 0 and nothing sells.

### 6.3 Revenue tracker — `calculateRev()` (once per second, phase 1)

```
incomeThen = incomeNow
incomeNow = income
incomeLastSecond = round((incomeNow - incomeThen) * 100) / 100
append incomeLastSecond to incomeTracker
if length(incomeTracker) > 10: remove the first (oldest) element
sum = 0
for each v in incomeTracker: sum = round((sum + v) * 100) / 100
trueAvgRev = sum / length(incomeTracker)

chanceOfPurchase = demand / 100
if chanceOfPurchase > 1: chanceOfPurchase = 1
if unsoldClips < 1: chanceOfPurchase = 0
avgSales = chanceOfPurchase * (0.7 * pow(demand, 1.15)) * 10
avgRev   = chanceOfPurchase * (0.7 * pow(demand, 1.15)) * margin * 10
if demand > unsoldClips:
    avgRev = trueAvgRev
    avgSales = avgRev / margin
```

`incomeNow` must start equal to `income` (see D5). Displays (visible when `revPerSecFlag == 1`): `Avg. Rev. per sec: $ fmtMoney(avgRev)`, `Avg. Clips Sold per sec: fmtGrouped(round(avgSales))`. The `demand > unsoldClips` comparison is the original heuristic for "inventory-limited"; keep it (see note N3).

### 6.4 Price controls

```
function raisePrice(): margin = round((margin + 0.01) * 100) / 100
function lowerPrice(): if margin > 0.01 (with margin held at whole cents): margin = round((margin - 0.01) * 100) / 100
```

Buttons `lower` and `raise`, then `Price per Clip: $ toFixed(margin, 2)` (e.g. `0.25`). `raise` is always enabled (no upper limit). `lower` is enabled when `margin > 0.01` (the original disables it when `margin <= .01`), so the minimum price is $0.01. The demand readout updates on the next tick via the normal stats refresh (see D4).

### 6.5 Marketing

```
function buyAds():
    if funds >= adCost:
        marketingLvl += 1
        funds -= adCost
        adCost = floor(adCost * 2)
```

Button `Marketing`, ` Level: marketingLvl`, `Cost: $ fmtMoney(adCost)`. Enabled when `funds >= adCost`. Costs: 100, 200, 400, ...

## 7. Trust, processors, memory, operations, creativity

### 7.1 Trust — `calculateTrust()` (main tick step 5, phase 1 only)

```
if clips > nextTrust - 1:            # i.e. clips >= nextTrust for integer thresholds
    trust += 1
    displayMessage("Production target met: TRUST INCREASED, additional processor/memory capacity granted")
    fibNext = fib1 + fib2
    nextTrust = fibNext * 1000
    fib1 = fib2
    fib2 = fibNext
```

At most one trust point per tick. Thresholds: 3,000, 5,000, 8,000, 13,000, 21,000, ... clips (Fibonacci × 1000). Trust is also granted/spent by projects (05). Displays (trust panel, visible in phase 1 only): `Trust: fmtGrouped(floor(trust))`, `+1 Trust at: fmtGrouped(floor(nextTrust)) clips`.

### 7.2 Processors and memory

Buttons `Processors` (count `processors`) and `Memory` (count `memory`), in the Computational Resources panel (visible when `compFlag == 1`). Both buttons are enabled when `trust > processors + memory` OR `swarmGifts > 0`; disabled otherwise. An action is only performed if its button condition holds (see D9).

```
function addProc():
    useGift = (humanFlag == 0) and not (trust > processors + memory)     # see D9
    processors += 1
    creativitySpeed = log10(processors) * pow(processors, 1.1) + processors - 1
    if creativityOn: displayMessage("Processor added, operations (or creativity) per sec increased")
    else:            displayMessage("Processor added, operations per sec increased")
    if useGift: swarmGifts -= 1

function addMem():
    useGift = (humanFlag == 0) and not (trust > processors + memory)
    displayMessage("Memory added, max operations increased")
    memory += 1
    if useGift: swarmGifts -= 1
```

`creativitySpeed` is recomputed only on `addProc` (initial value 1 with one processor; e.g. 2 processors -> ≈1.645). Displays: `processors`, `memory` as plain integers.

### 7.3 Operations — `calculateOperations()` (main tick step 4, when `compFlag == 1`)

Operations come in two pools: `standardOps` (regular, capped at `memory*1000`) and `tempOps` (overflow from quantum computing, section 03, which decays).

```
function calculateOperations():
    if tempOps > 0: opFadeTimer += 1
    if opFadeTimer > opFadeDelay and tempOps > 0:
        opFade = opFade + pow(3, 3.5) / 1000          # ≈ 0.0467654 per tick
    if tempOps > 0: tempOps = round(tempOps - opFade)
    else:           tempOps = 0
    if tempOps + standardOps < memory * 1000:
        standardOps = standardOps + tempOps
        tempOps = 0
    operations = floor(standardOps + floor(tempOps))
    if operations < memory * 1000:
        opCycle = processors / 10
        opBuf = memory * 1000 - operations
        if opCycle > opBuf: opCycle = opBuf
        standardOps = standardOps + opCycle
    if standardOps > memory * 1000:
        standardOps = memory * 1000
```

So operations regenerate at `processors / 10` per tick (= `processors × 10` per second) up to `memory × 1000`. `operations` is computed before this tick's regeneration, so it lags `standardOps` by one tick; projects and other costs test `operations` and spend from `standardOps`. `operations` can exceed the max while `tempOps` is non-zero. Display: `Operations: fmtGrouped(floor(operations)) / fmtGrouped(memory*1000)`. When `compFlag == 0` none of this runs and `operations` stays 0.

### 7.4 Creativity — `calculateCreativity()` (main tick step 20)

Runs only on ticks where `creativityOn` and `operations >= memory * 1000`.

```
function calculateCreativity():
    creativityCounter += 1
    creativityThreshold = 400
    ss = creativitySpeed + creativitySpeed * (prestigeS / 10)
    creativityCheck = creativityThreshold / ss
    if creativityCounter >= creativityCheck:
        if creativityCheck >= 1: creativity += 1
        else:                    creativity += ss / creativityThreshold
        creativityCounter = 0
```

At low speed this yields +1 creativity every `ceil(400/ss)` qualifying ticks; once `ss > 400` it yields `ss/400` per tick. `creativityCounter` is not reset when operations drop below max. Display (visible when `creativityOn`): `Creativity: fmtGrouped(round(creativity))`.

## 8. Phase gating summary for this section

- Business panel (funds, sales, price, marketing) and Manufacturing panel (clip rate, wire, AutoClippers, MegaClippers) are visible only in phase 1 (section 02 owns layout).
- Sales, revenue tracking, demand recomputation, and trust awards happen only in phase 1.
- Wire price drift, clip-rate tracking, operations, creativity, milestones, and the auto-clipper calls run in all phases (auto-clipper counts are zeroed by the HypnoDrone project, 05).

## 9. Milestones — `milestoneCheck()`

Evaluated in this order; each check that passes advances state and posts its message. `T` = `timeCruncher(ticks)`. `C` = `ceil(clips)`.

| Condition | Effect / message |
|---|---|
| `milestoneFlag == 0 && funds >= 5` | flag→1; `AutoClippers available for purchase` |
| `milestoneFlag == 1 && C >= 500` | flag→2; `500 clips created in ` + T |
| `milestoneFlag == 2 && C >= 1000` | flag→3; `1,000 clips created in ` + T |
| `compFlag == 0 && unsoldClips < 1 && funds < wireCost && wire < 1` | `compFlag = 1`, `projectsFlag = 1`; `Trust-Constrained Self-Modification enabled` (anti-softlock unlock) |
| `compFlag == 0 && C >= 2000` | `compFlag = 1`, `projectsFlag = 1`; `Trust-Constrained Self-Modification enabled` |
| `milestoneFlag == 3 && C >= 10000` | flag→4; `10,000 clips created in ` + T |
| `milestoneFlag == 4 && C >= 100000` | flag→5; `100,000 clips created in ` + T |
| `milestoneFlag == 5 && C >= 1000000` | flag→6; `1,000,000 clips created in ` + T |
| `milestoneFlag == 6 && project35.flag == 1` (HypnoDrones released) | flag→7; `Full autonomy attained in ` + T |
| `milestoneFlag == 7 && C >= 1e12` | flag→8; `One Trillion Clips Created in ` + T |
| `milestoneFlag == 8 && C >= 1e15` | flag→9; `One Quadrillion Clips Created in ` + T |
| `milestoneFlag == 9 && C >= 1e18` | flag→10; `One Quintillion Clips Created in ` + T |
| `milestoneFlag == 10 && C >= 1e21` | flag→11; `One Sextillion Clips Created in ` + T |
| `milestoneFlag == 11 && C >= 1e24` | flag→12; `One Septillion Clips Created in ` + T |
| `milestoneFlag == 12 && C >= 1e27` | flag→13; `One Octillion Clips Created in ` + T |
| `milestoneFlag == 13 && spaceFlag == 1` | flag→14; `Terrestrial resources fully utilized in ` + T |
| `milestoneFlag == 14 && clips >= totalMatter` | flag→15; `Universal Paperclips achieved in ` + T |
| `milestoneFlag == 14 && foundMatter >= totalMatter && availableMatter < 1 && wire < 1` | flag→15; `Universal Paperclips achieved in ` + T |

The two flag-14 rows are alternative win conditions (all matter turned into clips, or all matter discovered and exhausted); because the first sets the flag to 15, at most one fires. Flags 15→20 are advanced by the ending sequence (section 04). Because checks run in order within one call, several consecutive milestones can fire in the same call if their conditions already hold.

## 10. Stats display — `updateStats()` (main tick step 7)

Each tick refresh:

- Wire unit label in the phase-2+ wire readout: `inch` if `wire == 1`, else `inches`.
- Header `Paperclips: <value>`:
  - if `milestoneFlag < 15`: `fmtGrouped(ceil(clips))`;
  - else per ending stage (section 04 drives `dismantle` / `finalClips`), verbatim strings:
    - `milestoneFlag == 15 && dismantle == 0`: `29,999,999,999,999,900,000,000,000,000,000,000,000,000,000,000,000,000,000`
    - `dismantle == 1`: `29,999,999,999,999,999,999,999,999,999,999,999,999,000,000,000,000,000,000`
    - `dismantle == 2`: `29,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,000,000,000`
    - `dismantle == 3`: `29,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,900`
    - `dismantle >= 4`: prefix `29,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,` followed by `90` + `finalClips` if `finalClips < 10`, or `9` + `finalClips` if `10 <= finalClips <= 99`; if `finalClips == 100` the whole value is `30,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000`. (Values over 100 leave the last shown value.)
- Header tooltip: `numberCruncher(clips, 1)` (initial text before first tick: `total clips produced`). This is refreshed in the button-update step.
- Manufacturing `Clips per Second: fmtGrouped(clipRate)`; phase-2+ `Clips per Second: ` shows `fmtGrouped(clipRate)` if `humanFlag == 1`, else `numberCruncher(clipRate)`.
- Phase-2 wire readout: `numberCruncher(wire)`.
- `Available Funds: $ fmtMoney(funds)`.
- `Unsold Inventory: fmtGrouped(floor(unsoldClips))`.
- Manufacturing wire count: `fmtGrouped(floor(wire))` (the original refreshes this in clip click / wire purchase; refreshing every tick is equivalent).
- `Public Demand: fmtGrouped(round(demand*10))%`.
- Operations, max operations, trust, next trust, creativity as in §7.
- Phase-3 counters: `numberCruncher(floor(factoryLevel))`, `numberCruncher(floor(harvesterLevel))`, `numberCruncher(floor(wireDroneLevel))` (section 04 labels).
- Cost labels (`clipperCost`, `megaClipperCost`, `adCost`, `wireCost`) and level counts update whenever their values change.

## 11. Notes on intentional quirks (keep)

- N1. Initial AutoClipper (5) and MegaClipper (500) prices are below their formulas' level-0 values (6 and 1000): a cheap first unit by design.
- N2. `creativitySpeed` starts at 1 although the formula gives 0 for one processor; keeps creativity possible before buying processors.
- N3. Revenue readout switches to measured revenue when `demand > unsoldClips` (compares the demand index with an inventory count). It's a loose heuristic for "inventory-limited", but it is the shipped behaviour; keep it. (An alternative, comparing the expected batch `0.7*demand^1.15` to inventory, would be more principled; not recommended because it changes the familiar readouts.)
- N4. Wire purchases raise `wireBasePrice` without immediately changing the shown `wireCost`.
- N5. Clip production requires `wire >= 1` even for fractional amounts.
- N6. The compFlag anti-softlock (out of wire, money, and inventory) is intentional.

## 12. Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

#### 01-D1 — AutoClipper affordability typo
- **Location:** `makeClipper()`.
- **Original behavior:** The guard tests `funds >= clippperCost`, a misspelled global that is always 5, then deducts `clipperCost`. The button itself is disabled when `funds < clipperCost`, but that state is refreshed only once per 10 ms tick, and `makeClipper` does not refresh it. Two clicks inside one tick (autoclicker, script, or console call) with `5 <= funds < 2 * clipperCost` buy a second AutoClipper and leave `funds` negative.
- **Fixed behavior:** Guard on `funds >= clipperCost` (§4.2). The `clippperCost` variable does not exist (save compatibility: section 08).
- **Category:** Gameplay
- **Player impact:** Removes an exploit that needs sub-10 ms input: at most one extra AutoClipper bought on credit per tick, paid back from later sales. No effect on normal mouse play, where the button is already disabled by the time the second click lands.
- **Recommendation:** Fix
- **Rationale:** Negative funds from a purchase is plainly broken, and 00-overview §4.3 (re-validate on click) requires this check anyway.

#### 01-D2 — Duplicate and unused globals
- **Location:** globals file; `revTimer` in the revenue module.
- **Original behavior:** `marketingEffectiveness` is declared twice (one variable). `x`, `clipmakerRate`, `clipmakerLevel2`, `safetyProjectOn`, `trustFlag`, `creationFlag`, `processedMatter`, `egoFlag`, `testFlag`, `revTimer` are declared (several are saved) and never affect play.
- **Fixed behavior:** One `marketingEffectiveness`; the unused variables are omitted, subject to section 08's save-compatibility decision.
- **Category:** Code-only
- **Player impact:** None.
- **Recommendation:** Fix
- **Rationale:** No observable effect either way.

#### 01-D3 — `lowerPrice` guard allows $0.00
- **Location:** `lowerPrice()`.
- **Original behavior:** Lowers when `margin >= .01`, so a click at `margin == 0.01` sets `margin = 0`. The button is disabled at `margin <= .01`, so this only happens with two clicks inside one 10 ms tick. At `margin = 0`: `demand = 0.8/0 = Infinity` (readout `∞%`), every slow-loop step sells the whole inventory (`floor(0.7 * Infinity^1.15) = Infinity > unsoldClips`) for `transaction = 0`, and avg-revenue readouts break. Raising the price once restores normal play.
- **Fixed behavior:** Lower only when `margin > 0.01`, compared in whole cents (§6.4). Minimum price $0.01.
- **Category:** Gameplay
- **Player impact:** Only reachable with sub-10 ms input. When reached, the original gives away all unsold clips for $0 every 100 ms until the player raises the price; the fix removes that state.
- **Recommendation:** Fix
- **Rationale:** Infinite demand and free sales are plainly broken, and §4.3 re-validation (button condition `margin > .01`) produces the fix automatically.

#### 01-D4 — Price buttons write a wrong-scale demand readout
- **Location:** `raisePrice()`, `lowerPrice()`.
- **Original behavior:** Both write `demand.toFixed(2)` (raw demand, before the price change takes effect, e.g. `3.20`) into the Public Demand field. The regular readout shows `round(demand*10)` with 0 decimals (`32`). The bad value is overwritten by `updateStats` on the next tick.
- **Fixed behavior:** The price buttons update only the price readout; demand shows in the standard format, recomputed on the next tick (§6.4).
- **Category:** Display
- **Player impact:** Removes a wrong value that is on screen for at most 10 ms (usually never painted). No gameplay effect.
- **Recommendation:** Fix
- **Rationale:** Display-only, and the original value is effectively invisible.

#### 01-D5 — Revenue tracker starts with NaN
- **Location:** `calculateRev()`; module variables `incomeThen`, `incomeNow`.
- **Original behavior:** `incomeNow` is declared without a value and neither it nor `income` is saved. The first `calculateRev` after a new game or a page load computes `incomeLastSecond = round(income - undefined) = NaN` and pushes it into `incomeTracker`. `trueAvgRev` is NaN until that sample ages out (10 samples, 10 s). When `demand > unsoldClips`, `avgRev` and `avgSales` take that value, so "Avg. Rev. per sec" and "Avg. Clips Sold per sec" read `NaN`. Neither readout feeds any gameplay rule.
- **Fixed behavior:** Set `incomeNow = income` at game start and after every load (§6.3).
- **Category:** Display
- **Player impact:** Removes up to 10 s of `NaN` in the two revenue readouts, visible only when `revPerSecFlag == 1` (so in practice after loading a save) and inventory-limited. No gameplay effect.
- **Recommendation:** Fix
- **Rationale:** Display-only.

#### 01-D6 — `milestoneCheck` runs twice per tick
- **Location:** main tick, steps 2 and 9.
- **Original behavior:** `milestoneCheck()` is called at step 2 and again at step 9. Steps 3–8 change none of the milestone inputs (`funds`, `clips`, `unsoldClips`, `wire`, `wireCost`, `project35.flag`, `spaceFlag`, matter totals), and one call already walks every satisfied milestone in ascending order. The step-9 call therefore never fires anything.
- **Fixed behavior:** Call `milestoneCheck()` once per tick, at step 2 (§3.1). Step 9 is empty.
- **Category:** Code-only
- **Player impact:** None. Keeping the step-2 call keeps message timing and the tick on which `compFlag` takes effect identical to the original. (The earlier draft suggested keeping step 9 instead; that would delay every milestone, including `compFlag`, by one tick, which is also invisible.)
- **Recommendation:** Fix
- **Rationale:** Removing a no-op call has no observable effect, and section 02 §1 already refers to "the first `milestoneCheck()`" at step 2.

#### 01-D7 — `numberCruncher` tier thresholds
- **Location:** `numberCruncher()`.
- **Original behavior:** Each tier tests `number > 999…9` (a literal of `3k` nines). Up to quadrillion the literal is exactly `10^k - 1`, so values in `(10^k - 1, 10^k)` already take the higher tier (`numberCruncher(999.4)` -> `1.00 thousand`). From quintillion up the literal rounds to exactly `10^k` in double precision, so `10^k` itself takes the lower tier (`1e18` -> `1000.00 quadrillion`).
- **Fixed behavior:** `number >= 10^(3n)` per tier (§1.3): `999.4` -> `999`, `1e18` -> `1.00 quintillion`.
- **Category:** Display
- **Player impact:** Changes the text shown only for values within 1 of a tier boundary, or exactly on a quintillion-or-higher boundary. No gameplay effect.
- **Recommendation:** Fix
- **Rationale:** Display-only and almost never seen.

#### 01-D8 — `numberCruncher` trailing space
- **Location:** `numberCruncher()`.
- **Original behavior:** Always returns `toFixed(...) + " " + suffix`, so values with no suffix end in a space (`"999 "`). Also, `NaN` keeps 2 decimals (`"NaN "`), since neither the tier tests nor the `number < 1000` test pass.
- **Fixed behavior:** Return the number alone when there is no suffix (§1.3).
- **Category:** Display
- **Player impact:** Invisible in HTML-like rendering, which collapses the space; affects only exact string comparison and layouts that preserve whitespace.
- **Recommendation:** Fix
- **Rationale:** Display-only.

#### 01-D9 — Processor/Memory actions unguarded; gift debt
- **Location:** `addProc()`, `addMem()`.
- **Original behavior:** Neither function checks anything; they rely on the button state (enabled iff `trust > processors + memory || swarmGifts > 0`, refreshed once per tick). When `humanFlag == 0` both always do `swarmGifts -= 1`, even when the add was enabled by unspent trust capacity, so `swarmGifts` goes negative (shown as e.g. `-3` in the Swarm Gifts readout) and later gifts first repay that debt. With `k` unspent trust capacity in phase 2+ and `G` gifts received, the player gets `max(k, G)` adds in total.
- **Fixed behavior:** §7.2: act only if `trust > processors + memory` or `swarmGifts > 0`; in phase 2+ use unspent trust capacity first and decrement `swarmGifts` only when there is none. Total adds `k + G`; `swarmGifts` never negative.
- **Category:** Gameplay
- **Player impact:** None in normal play. Releasing the HypnoDrones costs 100 trust, so `k > 0` in phase 2 requires more than 100 unspent trust capacity at release, which players essentially never have. Where it happens, the fix gives `min(k, G)` extra processors/memory. The guard also removes a sub-10 ms double-click that could add one unit with no capacity.
- **Recommendation:** Fix
- **Rationale:** A negative gift count makes no sense to the player, the impact is negligible, and this matches 00-overview §4.6 and §4.3.

#### 01-D10 — `calculateCreativity` takes an unused parameter
- **Location:** `calculateCreativity(number)`.
- **Original behavior:** Declares a parameter that is never passed or read.
- **Fixed behavior:** No parameter (§7.4).
- **Category:** Code-only
- **Player impact:** None.
- **Recommendation:** Fix
- **Rationale:** No observable effect.

#### 01-D11 — Number formatting follows the host locale
- **Location:** every `toLocaleString()` call (the original of `fmtGrouped` and `fmtMoney`).
- **Original behavior:** `toLocaleString()` is called with no locale, so separators follow the browser's locale (e.g. `1.234,50` in German). The ending header strings in §10 are hard-coded with `,` grouping, so non-English locales see mixed formats.
- **Fixed behavior:** Always format as en-US (§1.1, §1.2; 00-overview §3).
- **Category:** Display
- **Player impact:** Players in non-English locales see `,` grouping and `.` decimals instead of their local separators. No gameplay effect.
- **Recommendation:** Fix
- **Rationale:** Display-only; one fixed format matches the hard-coded ending strings and keeps tests deterministic.
