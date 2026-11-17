# 03 — Quantum Computing, Investment Engine, Strategic Modeling

This section specifies three "side engines" that convert one resource into another:

- **Quantum Computing**: a timing mini-game that adds bonus (or subtracts) operations.
- **Investment Engine**: an automated stock-trading simulation that grows (or shrinks) money the player deposits.
- **Strategic Modeling**: round-robin game-theory tournaments between strategies that award **yomi**.

Conventions:

- `rand()` means one fresh uniform draw in [0, 1). Each `rand()` in the pseudocode is a separate draw, made in the order written.
- "Main tick" is the 10 ms core game tick owned by section 01. Other cadences are listed per engine. Every cadence here runs on its own independent repeating timer, started at game load. None of them are phase-locked to the main tick.
- `fmtInt(x)` means an integer with thousands separators in en-US style (e.g. `12,345`), with no decimals. For a non-integer, show up to 3 fractional digits (this is how the original's default number formatting behaves).
- State owned by other sections, used here: `operations`, `standardOps`, `tempOps`, `opFade`, `opFadeTimer`, `memory`, `processors`, `trust`, `creativity`, `funds`, `wireCost`, `humanFlag`, `spaceFlag`, `milestoneFlag`, `dismantle`, `endTimer4`, `probeTrustCost`, `compFlag`, plus the project objects and their `flag`s. `displayMessage(text)` is the message-log function owned by section 01/02.

---

## 1. Quantum Computing

### 1.1 State

| Name | Initial | Notes |
|---|---|---|
| `qFlag` | 0 | 1 once project 50 "Quantum Computing" is bought. Controls panel visibility and the per-tick chip update. |
| `qClock` | 0 | Phase accumulator. Saved. |
| `qChips` | 10 chip records, indices 0..9 | Each record has `waveSeed`, `value`, `active`. Saved. |
| `qChipCost` | 10000 | Ops cost of the next Photonic Chip (project 51). Saved. |
| `nextQchip` | 0 | Index of the next chip to activate. Saved. |
| `qFade` | 1 | Opacity of the qOps readout. Saved. |

Chip records (all start with `value = 0`, `active = 0`):

| index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| `waveSeed` | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 |

### 1.2 Per-tick waveform update (`quantumCompute`)

This runs every main tick while `qFlag == 1`. It runs after `calculateOperations` and `calculateTrust` and before `updateStats`/`manageProjects` (section 01 owns the full tick order).

```
qClock = qClock + 0.01
for i in 0..9:
    qChips[i].value = sin(qClock * qChips[i].waveSeed * qChips[i].active)
    chip display i: opacity = qChips[i].value   (negative values render as fully transparent; clamp to [0,1] for display)
```

- Inactive chips (`active = 0`) always have `value = sin(0) = 0`, so they're invisible.
- `qClock` advances by 1.0 per second of game time (100 ticks × 0.01). Chip *i* oscillates with period `2π / waveSeed` seconds: about 62.8 s for chip 0 and about 6.28 s for chip 9. Each value is in [-1, 1].
- Before `qFlag` is set, the chips aren't updated. That doesn't matter because the panel is hidden.

### 1.3 The Compute action (`qComp`)

A player action on the **Compute** button. The button is always enabled while the panel is visible.

```
qFade = 1
if qChips[0].active == 0:
    qOps readout text = "Need Photonic Chips"
    return
q = sum over i of qChips[i].value          // inactive chips contribute 0
qq = ceil(q * 360)
buffer = memory*1000 - standardOps          // room left before memory cap
damper = tempOps/100 + 5
if qq > buffer:
    tempOps = tempOps + ceil((qq - buffer) / damper)     // see defect Q1
    qq = buffer
    opFade = 0.01
    opFadeTimer = 0
standardOps = standardOps + qq                            // may go below 0; see Q2
qOps readout text = "qOps: " + fmtInt(ceil(q * 360))      // shows the un-clamped amount, may be negative
```

How ops are gained or lost:

- Positive `q` adds `qq` ops directly to `standardOps`, up to the memory cap (`memory*1000`).
- Any excess above the cap goes into `tempOps` (the over-cap temporary ops pool), damped by `damper`. `damper` grows as `tempOps` grows, so repeated over-cap clicks give diminishing returns. Section 01 owns the decay of `tempOps` (`opFade`, `opFadeTimer`, `opFadeDelay`): this action restarts that decay by setting `opFade = 0.01` and `opFadeTimer = 0`.
- Negative `q` (most active chips in their negative half-cycle) **subtracts** ops. This is intentional: the skill is clicking when the chips are bright. Maximum magnitude is ±3600 with all 10 chips.

The qOps readout fades. Every main tick, in the button/visibility update pass (section 01's `buttonUpdate`), the readout's opacity is set to `qFade` and then `qFade = qFade - 0.001`. A click resets it to 1, so it fades out over about 10 s (1000 ticks). `qFade` keeps decreasing below 0 with no clamp. Display opacity clamps at 0, so this is harmless. An implementation may clamp `qFade` at 0.

### 1.4 Display

- Panel title: **Quantum Computing**. It shows a row of 10 chip squares (black squares whose opacity is the chip value), a **Compute** button, and the qOps readout (initially blank).
- The panel is visible iff `qFlag == 1`. The end-game overrides it (see 1.5).

### 1.5 Related projects (full details in sections 05/06)

- **Project 50 "Quantum Computing"**: trigger `processors >= 5`. Cost 10,000 ops. Sets `qFlag = 1`. Message "Quantum computing online".
- **Project 51 "Photonic Chip"**: trigger `project50.flag == 1`. Cost `qChipCost` ops. Effect: `standardOps -= qChipCost`, `qChipCost += 5000`, `qChips[nextQchip].active = 1`, `nextQchip += 1`, message "Photonic chip added". It is re-offered (uses += 1) while `nextQchip < 10`. Chip costs are 10,000; 15,000; 20,000; … 55,000 ops. Price tag is `"(" + fmtInt(qChipCost) + " ops)"` (defect Q3).
- **Project 214 "Disassemble Quantum Computing"** (end-game): sets `dismantle = 5`. While `dismantle >= 5`, every main tick: hide the Compute button, set every chip's `value = 0.5` and opacity 0.5 (this runs after `quantumCompute` in the same tick, so it overrides it), and hide chips one by one on `endTimer4` thresholds, then the whole panel at `endTimer4 >= 250`. Section 04/end-game owns the exact schedule and the wire trickle tied to it.

---

## 2. Investment Engine

### 2.1 State

| Name | Initial | Notes |
|---|---|---|
| `investmentEngineFlag` | 0 | 1 after project 21. Forced to 0 every main tick while `humanFlag == 0`. |
| `bankroll` | 0 | Uninvested cash inside the engine ("Cash"). Integer dollars. |
| `stocks` | [] | Ordered list of holdings, oldest first. |
| `portfolioSize` | 0 | Always kept equal to `len(stocks)`. |
| `maxPort` | 5 | Maximum number of simultaneous holdings. Never changes. |
| `stockID` | 0 | Incrementing id counter. |
| `secTotal` | 0 | Sum of holdings' `total` ("Stocks"). |
| `portTotal` | 0 | `bankroll + secTotal` ("Total"). |
| `sellDelay` | 0 | Counter for the sell cadence. |
| `riskiness` | 5 | Risk divisor, derived from the risk selector (see 2.3). |
| `investLevel` | 0 | Engine upgrade level. |
| `investUpgradeCost` | 100 | Yomi cost of the next upgrade. |
| `stockGainThreshold` | 0.5 | Probability that a price move is upward. |
| `ledger` | 0 | Net cash flow: withdrawals minus deposits. |
| `stockReportCounter` | 0 | Main-tick counter for the periodic revenue report. |

A stock record has: `id`, `symbol` (string), `price` (integer ≥ 0), `amount` (integer shares), `total` (= `price*amount`), `profit` (cumulative P/L in dollars), `age` (incremented on every price update and otherwise unused).

All of the above are saved (section 08), including the full `stocks` list.

### 2.2 Player actions

**Deposit** (always enabled while the panel is visible):
```
ledger   = ledger - floor(funds)
bankroll = floor(bankroll + funds)
funds    = 0
```
The fractional cents of `funds` are discarded. Refresh the Cash, Total, and funds displays.

**Withdraw** (always enabled). Only cash is withdrawn. Holdings stay invested:
```
ledger   = ledger + bankroll
funds    = funds + bankroll
bankroll = 0
```
Refresh the Cash, Total, and funds displays. Funds use the standard funds format from section 01 (defect I4).

**Risk selector**: three choices, **Low Risk** (default), **Med Risk**, **High Risk**. The selection maps to `riskiness` = 7 / 5 / 1 respectively (see 2.3).

**Upgrade Investment Engine** (enabled iff `yomi >= investUpgradeCost`):
```
yomi = yomi - investUpgradeCost
investLevel = investLevel + 1
stockGainThreshold = stockGainThreshold + 0.01
investUpgradeCost = floor((investLevel + 1) ^ e * 100)     // e = Euler's number 2.718281828...
displayMessage("Investment engine upgraded, expected profit/loss ratio now " + format2(stockGainThreshold))
```
`format2` = the value rounded to 2 decimal places, e.g. `0.51` (defect I1). Refresh the Level, Cost, and yomi displays.

Upgrade costs by level reached: 100 (to reach 1), 658, 1,981, 4,330, 7,943, 13,038, 19,825, 28,500, 39,255, 52,273, 67,732, 85,806, 106,662, …

### 2.3 Display/valuation loop (every 100 ms, always running)

This loop runs regardless of `humanFlag` or `investmentEngineFlag`.

```
riskiness = 7 if selector == Low Risk
          = 5 if selector == Med Risk
          = 1 otherwise (High Risk)
secTotal  = sum of stocks[i].total over current holdings
portTotal = bankroll + secTotal
display Stocks = fmtInt(secTotal); Total = fmtInt(portTotal)
portfolioSize = len(stocks)
for row k = 1..portfolioSize (stock = stocks[k-1]):
    Stock = symbol; Amt. = ceil(amount); Price = ceil(price); Total = ceil(total); P/L = ceil(profit)
for rows portfolioSize+1 .. 5: blank all five cells
```

Notes:
- `riskiness` starts at 5 but becomes 7 within 100 ms, because the selector defaults to Low Risk.
- `portTotal` and `secTotal` are only recomputed here. Other code (the buy rule, the project triggers using `portTotal`, the revenue report) sees values up to 100 ms stale. Reproducing this staleness isn't required, but the buy rule must use a `portTotal` that is current as of its last recompute.
- The Cash display (`fmtInt(bankroll)`) is refreshed on deposit, withdraw, buy, sell, and load.

### 2.4 Buy rule (`stockShop`, every 1000 ms, only while `humanFlag == 1`)

```
budget   = ceil(portTotal / riskiness)
r        = 11 - riskiness
reserves = ceil(portTotal / r)
if riskiness == 1: reserves = 0

if (bankroll - budget) < reserves:
    if riskiness == 1 and bankroll > portTotal/10:  budget = bankroll
    elif riskiness == 1:                            budget = 0
    else:                                           budget = bankroll - reserves

if portfolioSize < maxPort and bankroll >= 5 and budget >= 1 and (bankroll - budget) >= reserves:
    if rand() < 0.25:
        createStock(budget)
```

Here is how riskiness changes behaviour:

| Setting | `riskiness` | Target buy size | Cash kept in reserve | Max price move per update |
|---|---|---|---|---|
| Low | 7 | ceil(portTotal/7) (≈14%) | ceil(portTotal/4) (25%) | price/28 |
| Med | 5 | ceil(portTotal/5) (20%) | ceil(portTotal/6) (≈17%) | price/20 |
| High | 1 | the whole portfolio, in practice the whole cash balance | none | price/4 |

With High Risk, `budget` starts at `portTotal`. That exceeds cash whenever anything is invested, so the rule falls back to "spend all cash" if cash is more than 10% of the portfolio, and to "buy nothing" otherwise. When nothing is invested, `bankroll - budget = 0 >= 0` and the full bankroll is spent.

### 2.5 Buying (`createStock(dollars)`)

```
stockID = stockID + 1
sym  = generateSymbol()
roll = rand()
if    roll > 0.99: pri = ceil(rand() * 3000)
elif  roll > 0.85: pri = ceil(rand() * 500)
elif  roll > 0.60: pri = ceil(rand() * 150)
elif  roll > 0.20: pri = ceil(rand() * 50)
else:              pri = ceil(rand() * 15)
if pri > dollars: pri = ceil(dollars * roll)      // reuses the same roll
pri = max(pri, 1)                                  // guard; see defect I3
amt = floor(dollars / pri)
if amt > 1000000: amt = 1000000
append stock {id: stockID, symbol: sym, price: pri, amount: amt, total: pri*amt, profit: 0, age: 0}
portfolioSize = len(stocks)
bankroll = bankroll - pri*amt
refresh Cash/Stocks/Total displays
```

Price tier probabilities: 1% up to 3000, 14% up to 500, 25% up to 150, 40% up to 50, 20% up to 15. In each tier the price is uniform over 1..max. Any remainder `dollars - pri*amt` stays in `bankroll`.

**Symbol (`generateSymbol`)**:
```
x = rand()
length = 1 if x <= 0.01; 2 if x <= 0.1; 3 if x <= 0.4; else 4
name = alphabet[floor(rand()*26)] repeated `length` times with independent draws   // A..Z uniform
```
That gives length probabilities of 1%, 9%, 30%, and 60%. Duplicate symbols are allowed.

### 2.6 Sell and price-update cadence (every 2500 ms)

```
sellDelay = sellDelay + 1          // increments on every firing, whatever the conditions
if portfolioSize > 0 and sellDelay >= 5 and rand() <= 0.3 and humanFlag == 1:
    sellStock()
    sellDelay = 0
if portfolioSize > 0 and humanFlag == 1:
    updateStocks()
```
The sell check happens **before** the price update in the same firing. Short-circuit evaluation applies: `rand()` is drawn only if the first two conditions pass.

**`sellStock`**: always sells the **oldest** holding (`stocks[0]`) at its current `total`. `bankroll += stocks[0].total`. Remove it and set `portfolioSize = len(stocks)`. Refresh the displays.

So at least 12.5 s must pass between sales, followed by a 30% chance on each 2.5 s firing.

**`updateStocks`**: for each holding, in list order:
```
age = age + 1
if rand() < 0.6:                                     // 60% chance this holding moves
    gain = true
    if rand() > stockGainThreshold: gain = false     // P(up) = stockGainThreshold
    delta = ceil(rand() * price / (4 * riskiness))
    price = price + delta if gain else price - delta
    revived = false
    if price == 0 and rand() > 0.24: price = 1; revived = true   // 76% chance a zero price revives to 1
    total = price * amount
    profit = profit + delta*amount if gain else profit - delta*amount
    if revived: profit = profit + amount                         // defect I2
```
- `delta <= ceil(price/4) <= price` for any `price >= 1`, so the price never goes negative. A price of 1 that falls becomes 0. A holding at 0 has `delta = 0`. Each later time it "moves", it gets the 76% revival check.
- When a 0 price is revived to 1, `profit` rises by `amount`, so P/L tracks the change in `total` (defect I2; the original doesn't adjust it).
- `riskiness` is read live, so changing the selector immediately changes the volatility of every existing holding.

Gain/loss rule summary: each update of each holding has a 60% chance to move. A move goes up with probability `stockGainThreshold`. Its size is uniform-ish on 1..ceil(price/(4·riskiness)). At the base threshold of 0.5 the expected drift is zero (ignoring rounding), and each +0.01 adds positive drift.

Sources of `stockGainThreshold` increases (+0.01 each): every engine upgrade, and projects 28 "Cure for Cancer", 29 "World Peace", 30 "Global Warming", 31 "Male Pattern Baldness" (sections 05/06).

### 2.7 Revenue report (main tick)

Every main tick (after the clip-rate tracker, before the wire buyer; see section 01):
```
stockReportCounter = stockReportCounter + 1
if investmentEngineFlag == 1 and stockReportCounter >= 10000:
    displayMessage("Lifetime investment revenue report: $" + fmtInt(ledger + portTotal))
    stockReportCounter = 0
```
`ledger + portTotal` = current value + total withdrawn − total deposited. That is lifetime profit (which can be negative). The counter runs from game start even before the engine exists, so the first report usually appears right after project 21 completes. That's a harmless quirk, so keep it. Reports then repeat every 100 s.

### 2.8 Panel and visibility

- **Investments** panel: visible iff `investmentEngineFlag == 1`. Contents: the risk selector, **Deposit** and **Withdraw** buttons, readouts `Cash: $<bankroll>`, `Stocks: $<secTotal>`, **`Total: $<portTotal>`** (bold), and a 5-row holdings table with headers `Stock | Amt. | Price | Total | P/L`.
- **Upgrade** sub-panel (same visibility): button **Upgrade Investment Engine**, `Level: <investLevel>`, `Cost: <fmtInt(investUpgradeCost)> Yomi`.
- While `humanFlag == 0` (phase 2+), `investmentEngineFlag` is forced to 0 every main tick, so the panel disappears. The buy, sell, and update loops stop because they require `humanFlag == 1`. Any cash or holdings are frozen and effectively abandoned. That's intended.

### 2.9 Related projects

- **Project 21 "Algorithmic Trading"**: trigger `trust >= 8`. Cost 10,000 ops. Sets `investmentEngineFlag = 1`. Message "Investment engine unlocked".
- `portTotal` is read by project 2 "Beg for More Wire" (trigger includes `portTotal < wireCost`) and project 37 "Hostile Takeover" (trigger `portTotal >= 10000`).

---

## 3. Strategic Modeling

### 3.1 State

| Name | Initial | Notes |
|---|---|---|
| `strategyEngineFlag` | 0 | 1 after project 20. |
| `yomi` | 0 | Resource earned here. Spent by many other systems. |
| `yomiBoost` | 1 | Multiplier on tournament score → yomi. Set to 2 by project 119. |
| `tourneyCost` | 1000 | Ops cost of New Tournament. |
| `tourneyLvl` | 1 | Incremented per tournament and otherwise unused (vestigial, saved). |
| `allStrats` | 8 strategies, indices 0..7 (below) | Each has `active` (saved). |
| `strats` | [RANDOM] | Active strategy roster, in unlock order. |
| `payoffGrid` / `aa`,`ab`,`ba`,`bb` | 0 | The current game's payoffs. |
| `hMove`,`vMove`,`hMovePrev`,`vMovePrev` | 1 | Moves: 1 = A, 2 = B. Global; never reset between matches (defect S1). |
| `stratCounter` | 0 | Pairing helper. |
| `rounds` | 0 | Matches in the current tournament (= n²). |
| `currentRound` | 0 | Index of the current match. |
| `rCounter` | 0 | Iteration counter within a match. |
| `tourneyInProg` | 0 | 1 from New Tournament until results are computed. |
| `winnerPtr`,`high`,`placeScore`,`showScore` | 0 | Result bookkeeping. |
| `results` | [] | Strategies sorted by score (not saved). |
| `resultsFlag` | 0 | 1 while a finished tournament's results are on display. |
| `resultsTimer` | 0 | Auto-tourney delay counter. |
| `pick` | 10 | Index into `strats` of the player's selection. 10 = none. |
| `autoTourneyFlag` | 0 | 1 after project 118. |
| `autoTourneyStatus` | 1 | Player toggle, 1 = ON. |

Each strategy record has `name`, `active`, `currentScore`, `currentPos` (1 = horizontal/row player, 2 = vertical/column player), and a move rule.

### 3.2 The game and the payoff grid

Each tournament uses one randomly generated symmetric 2×2 game. Its four payoffs:

- `aa` = my payoff when I play A and the opponent plays A
- `ab` = my payoff when I play A and the opponent plays B
- `ba` = my payoff when I play B and the opponent plays A
- `bb` = my payoff when I play B and the opponent plays B

**`generateGrid`** (called once per tournament from New Tournament):
```
valueAA = ceil(rand()*10); valueAB = ceil(rand()*10); valueBA = ceil(rand()*10); valueBB = ceil(rand()*10)
aa, ab, ba, bb = those values           // each an integer 1..10 (treat a 0 from rand()==0 as 1; defect S6)
x = floor(rand() * 17)
move label A = choiceANames[x]; move label B = choiceBNames[x]
```

Label pairs (index: A / B). Index 14 and 15 both use "accept" for A, and that's intentional:

| # | A | B | # | A | B |
|---|---|---|---|---|---|
| 0 | cooperate | defect | 9 | particle | wave |
| 1 | swerve | straight | 10 | discrete | continuous |
| 2 | macro | micro | 11 | peace | war |
| 3 | fight | back_down | 12 | search | evaluate |
| 4 | bet | fold | 13 | lead | follow |
| 5 | raise_price | lower_price | 14 | accept | reject |
| 6 | opera | football | 15 | accept | deny |
| 7 | go | stay | 16 | attack | decay |
| 8 | heads | tails | | | |

**Grid display**: a 2×2 table. The column headers are the vertical player's moves (label A, label B), and the row headers are the horizontal player's moves (label A, label B). Each cell shows `H-payoff,V-payoff`:

| | V plays A | V plays B |
|---|---|---|
| **H plays A** | `aa,aa` | `ab,ba` |
| **H plays B** | `ba,ab` | `bb,bb` |

Before any tournament, the labels read "Move A"/"Move B" and every value is 0. The current vertical strategy's name is shown above the columns and the horizontal strategy's name beside the rows. Both are blank between matches and outside tournaments.

**Scoring one iteration (`calcPayoff(hm, vm)`)**: H gets the H-payoff and V gets the V-payoff of the cell (hm, vm). Both are added to the respective strategies' `currentScore`. The cell that was played is highlighted (light grey) and cleared (white) 50 ms later.

### 3.3 Strategies

`findBiggestPayoff()` returns which of the four values is largest. Ties go to the first in the order aa, ab, ba, bb:
```
if aa>=ab and aa>=ba and aa>=bb: return 1
elif ab>=aa and ab>=ba and ab>=bb: return 2
elif ba>=aa and ba>=ab and ba>=bb: return 3
else return 4
```

`opponentLast` = the opponent's move in the previous iteration of the current match. Within an iteration, both players choose simultaneously from the same "previous" information (see 3.5).

| idx | Name | Unlock | Move rule |
|---|---|---|---|
| 0 | RANDOM | active from start | A if `rand() < 0.5`, else B |
| 1 | A100 | project 60 | always A |
| 2 | B100 | project 61 | always B |
| 3 | GREEDY | project 62 | `x = findBiggestPayoff()`; A if x ∈ {1,2} (the biggest payoff is one of mine when I play A), else B |
| 4 | GENEROUS | project 63 | x ∈ {1,3} → A, else B (pick the move that lets the opponent reach the biggest payoff) |
| 5 | MINIMAX | project 64 | x ∈ {1,3} → B, else A (deny the opponent the biggest payoff) |
| 6 | TIT FOR TAT | project 65 | play `opponentLast` |
| 7 | BEAT LAST | project 66 | if `opponentLast == A`: A if `aa > ba` else B; if `opponentLast == B`: A if `ab > bb` else B (ties → B) |

GREEDY, GENEROUS, and MINIMAX look at all four grid values and ignore history. They're deterministic, and these are their designed rules (not textbook minimax). Keep them exactly as written.

Opening move: the move history is **not** reset between matches (defect S1, canonical). At the first iteration of a match, `hMovePrev`/`vMovePrev` hold the final `hMove`/`vMove` of the previous match in the same tournament, so TIT FOR TAT and BEAT LAST open by reacting to whoever sat in the *opposite seat* in the previous match. History from before a tournament never matters: match 0 is always RANDOM vs RANDOM, which ignores history and overwrites both moves. Initial values at game start are 1.

Self-play: when a strategy plays itself, both seats are treated as seat 2 (defect S2, canonical), so **both** sides use `opponentLast = hMovePrev`. Because the same strategy object occupies both seats, it receives **both** players' payoffs that iteration. That double credit is an intended quirk of the round-robin. Keep it.

Project descriptions (player-facing, owned by 05/06):
A100 "Always choose A", B100 "Always choose B", GREEDY "Choose the option with the largest potential payoff", GENEROUS "Choose the option that gives your opponent the largest potential payoff", MINIMAX "Choose the option that gives your opponent the smallest potential payoff", TIT FOR TAT "Choose the option your opponent chose last round", BEAT LAST "Choose the option that does the best against what your opponent chose last round".

### 3.4 Strategy roster and picker

- `strats` begins as [RANDOM]. Each "New Strategy" project appends its strategy to `strats`, sets `allStrats[idx].active = 1`, adds `tourneyCost += 1000`, adds a picker option (label = name, value = idx), and shows the message "`<NAME>` added to strategy pool". The projects are a strict chain (60 → 61 → … → 66), so `strats[i] == allStrats[i]` always holds and picker values index `strats` directly.
- **Strategy picker**: a selector with "Pick a Strat" (value 10 = none) and "RANDOM" (value 0) at start, plus unlocked strategies in unlock order. The default selection is "Pick a Strat".
- `pick` is re-read from the selector every 100 ms on its own timer. The value that counts is whatever is selected **when the tournament finishes**. The player may change it mid-tournament. That's a design quirk, so keep it.

### 3.5 Tournament flow

**New Tournament** button: enabled iff `operations >= tourneyCost and tourneyInProg == 0`.
```
newTourney():
    resultsFlag = 0
    show grid table; hide results table
    high = 0
    tourneyInProg = 1
    currentRound = 0
    roster = snapshot of strats           // see defect S3; below, n = len(roster) and "strats" means roster
    rounds = n * n
    every strategy in roster: currentScore = 0
    stratCounter = 0
    standardOps = standardOps - tourneyCost
    tourneyLvl = tourneyLvl + 1
    generateGrid()
    enable Run button
    blank both strategy-name labels
    status line = "Pick strategy, run tournament, gain yomi"
```
Cost display: `Cost: <fmtInt(tourneyCost)> ops`. Cost history: 1000 at start, +1000 per new strategy (8,000 with all 8), then set to 16,000 by project 119.

**Run** button: initially disabled. Only `newTourney` enables it, and pressing it disables it.
```
runTourney():
    disable Run button
    if currentRound < rounds: playMatch(currentRound)
    else:
        tourneyInProg = 0
        pickWinner(); calculatePlaceScore(); calculateShowScore(); declareWinner()
```

**Pairing (`pickStrats(roundNum)`)**: sets the horizontal index `h` and vertical index `v`:
```
if roundNum < n:  h = 0; v = roundNum
else:
    stratCounter = stratCounter + 1
    if stratCounter >= n: stratCounter = stratCounter - n
    h = floor(roundNum / n); v = stratCounter
hStrat = strats[h]; vStrat = strats[v]
strats[h].currentPos = 1; strats[v].currentPos = 2
show names: horizontal label = hStrat.name, vertical label = vStrat.name
```
Result: n² matches covering every ordered pair (h, v) exactly once. Row 0 plays v = 0,1,…,n-1. Each later row h plays v = 1,2,…,n-1,0. So every strategy meets every other strategy twice (once in each seat) and itself once.

**Match (`round(roundNum)`)**, i.e. 10 iterations with animation:
```
setup: rCounter = 0; pickStrats(roundNum); status line = "Round " + (roundNum + 1)
         // hMove/vMove are NOT reset here (defect S1; the reset is an optional variant)
loop:
    if rCounter < 10:
        iteration:
            rCounter += 1
            hMovePrev = hMove; vMovePrev = vMove
            hMove = hStrat's move; vMove = vStrat's move      // H decides first, then V (matters only for RNG draw order)
            calcPayoff(hMove, vMove)                           // highlight cell
        after 50 ms: clear highlight; after another 50 ms: loop
    else:
        currentRound += 1
        runTourney()                                           // immediately starts the next match or finishes
```
For position-dependent rules: the player in seat 1 has `opponentLast = vMovePrev` and the player in seat 2 has `opponentLast = hMovePrev`. In self-play (h == v) both sides use `hMovePrev` (defect S2).

**Timing**: each iteration takes 100 ms (50 ms highlighted + 50 ms cleared), so each match takes 1.0 s and a tournament takes about n² seconds (64 s with 8 strategies). The results don't depend on timing, but the yomi-per-minute rate does, so keep the 100 ms iteration cadence. The original uses wall-clock one-shot timers. An implementation may instead drive iterations from the main game clock (one iteration per 10 main ticks, highlight during the first 5). Either is acceptable, as long as the outcome is computed exactly as above. The tournament continues even if its panel is hidden.

### 3.6 Ranking and results

**`pickWinner`**:
```
results = []
temp = copy of strats
repeat n times:
    tempHigh = 0; ptr = 0
    for i over temp: if temp[i].currentScore > tempHigh: ptr = i; tempHigh = temp[i].currentScore
    results.append(temp[ptr]); remove temp[ptr]
// i.e. a stable sort by score, descending; ties keep roster order
for i over strats: if strats[i].currentScore > high: winnerPtr = i; high = strats[i].currentScore
```
**`calculatePlaceScore`**: `placeScore` = the first `results[i].currentScore` (i ≥ 1) that is strictly less than `results[i-1].currentScore`, else 0. That is the second-highest distinct score.
**`calculateShowScore`**: `showScore` = the first `results[i].currentScore` (i ≥ 1) that is strictly less than `placeScore`, else 0. That is the third-highest distinct score.

**`declareWinner`**. If `pick == 10` (nothing picked), or `pick` names a strategy that isn't in the running roster (defect S3), do nothing: no yomi, no results display, `resultsFlag` stays 0 (so auto-tourney waits), and the status line keeps its last "Round N" text. This is intended (a pick is required). Otherwise, with `P = strats[pick]`:
```
status line = "TOURNAMENT RESULTS (roll over for payoff grid)"
yomi = yomi + P.currentScore * yomiBoost
if milestoneFlag < 15:
    displayMessage(P.name + " scored " + P.currentScore + " in the tournament. Yomi increased by " + (P.currentScore * yomiBoost))
if project128.flag == 1:
    if strats[winnerPtr].currentScore == P.currentScore:
        yomi += 20000; if milestoneFlag < 15: displayMessage("Selected strategy won the tournament (or tied for first). +20,000 yomi")
    elif placeScore == P.currentScore:
        yomi += 15000; if milestoneFlag < 15: displayMessage("Selected strategy finished in (or tied for) second place. +15,000 yomi")
    elif showScore == P.currentScore:
        yomi += 10000; if milestoneFlag < 15: displayMessage("Selected strategy finished in (or tied for) third place. +10,000 yomi")
populateTourneyReport(); displayTourneyReport()
refresh yomi display (fmtInt)
```
The scores in the message are plain integers without separators. The bonuses aren't multiplied by `yomiBoost`. The status-line text stays "TOURNAMENT RESULTS (roll over for payoff grid)" in every case (defect S4).

**`populateTourneyReport`**: for i = 0..n-1, results slot i shows `(i+1) + ". " + results[i].name + ": " + results[i].currentScore`. It's bold if `results[i]` is the picked strategy, normal otherwise. The results layout is two columns of four: slots 1–4 on the left and 5–8 on the right.

**`displayTourneyReport`**: `resultsFlag = 1`. Blank both strategy-name labels. Hide the grid and show the results.

**Roll-over**: when the pointer enters the tournament display area and `resultsFlag == 1`, set `resultsTimer = 0` and show the grid (the finished tournament's game) instead of the results. When the pointer leaves and `resultsFlag == 1`, show the results again. On non-pointer UIs, provide an equivalent "show grid" hold/toggle.

### 3.7 Auto-tourney

Checked every main tick inside the button/visibility pass (section 01's `buttonUpdate`):
```
if resultsFlag == 1 and autoTourneyFlag == 1 and autoTourneyStatus == 1 and results are currently displayed (not the grid):
    resultsTimer = resultsTimer + 1
    if resultsTimer >= 300 and operations >= tourneyCost:
        newTourney(); runTourney(); resultsTimer = 0
```
So a new tournament starts automatically about 3 s after results appear, as soon as ops allow, and uses the current pick. Hovering to view the grid pauses and resets the countdown. The **AutoTourney** toggle button flips `autoTourneyStatus` and shows "ON"/"OFF" next to it (initially "ON"). The toggle and its status are visible iff `autoTourneyFlag == 1`.

### 3.8 Panels and visibility

- **Strategic Modeling** panel: visible iff `strategyEngineFlag == 1` and `dismantle < 4`. Contents: the strategy picker, the **Run** button, the status line (initially "Pick strategy, run tournament, gain yomi"), the grid/results area, and `Yomi: <fmtInt(yomi)>`.
- **Tournament management** panel (same visibility): **New Tournament** button, the AutoTourney toggle and status, and `Cost: <tourneyCost> ops`.
- When project 20 completes, the results area starts hidden (grid shown).

### 3.9 Related projects (full details in 05/06)

| # | Title | Trigger | Cost | Effect relevant here |
|---|---|---|---|---|
| 20 | Strategic Modeling | `project19.flag == 1` ("Donkey Space") | 12,000 ops | `strategyEngineFlag = 1`. Message "Run tournament, pick strategy, earn Yomi equal to that strategy's points." |
| 60 | New Strategy: A100 | `project20.flag == 1` | 15,000 ops | adds A100 |
| 61 | New Strategy: B100 | `project60.flag == 1` | 17,500 ops | adds B100 |
| 62 | New Strategy: GREEDY | `project61.flag == 1` | 20,000 ops | adds GREEDY |
| 63 | New Strategy: GENEROUS | `project62.flag == 1` | 22,500 ops | adds GENEROUS |
| 64 | New Strategy: MINIMAX | `project63.flag == 1` | 25,000 ops | adds MINIMAX |
| 65 | New Strategy: TIT FOR TAT | `project64.flag == 1` | 30,000 ops | adds TIT FOR TAT |
| 66 | New Strategy: BEAT LAST | `project65.flag == 1` | 32,500 ops | adds BEAT LAST |
| 118 | AutoTourney | `strategyEngineFlag == 1 and trust >= 90` | 50,000 creat | `autoTourneyFlag = 1`. Message "AutoTourney online." |
| 119 | Theory of Mind | `len(strats) >= 8` | 25,000 creat | `yomiBoost = 2`, `tourneyCost = 16000`. Message "Yomi production doubled." |
| 128 | Strategic Attachment | `spaceFlag == 1 and len(strats) >= 8 and probeTrustCost > yomi` | 175,000 creat | enables the placement bonuses in 3.6 |
| 213 | Disassemble the Strategy Engine | end-game | 100,000 ops | `autoTourneyFlag = 0`, `dismantle = 4` (hides both strategy panels) |

---

## 4. Save/load notes (for section 08)

- Everything in the state tables is saved except `results` and per-strategy `currentScore`/`currentPos`. Only each strategy's `active` is saved.
- On load, `tourneyInProg` is forced to 0, so a tournament interrupted mid-run is abandoned (its ops are already spent) and New Tournament becomes available. The Run button starts disabled.
- Persist the risk selector and the strategy picker selections and restore them on load (defect I5).
- On load, if `resultsFlag == 1`, show the results area rather than the grid, so the auto-tourney countdown can run (defect S5). `results` isn't saved, so the slots may be blank until the next tournament. That's acceptable.

---

## Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

Magnitudes for S1/S2 come from simulating every one of the 10,000 payoff grids with 10 RANDOM seeds each (100,000 tournaments, same random draws in both versions), with the full 8-strategy roster unless stated otherwise.

### Quantum

#### 03-Q1 — Over-cap qOps formula
- **Location:** `qComp`
- **Original behavior:** when `qq > buffer`: `tempOps = tempOps + ceil(qq/damper) - buffer`, then `standardOps += buffer`. The net change in `operations` is `ceil(qq/damper)` (the whole click damped), except that if the new `tempOps` is negative, section 01's next `calculateOperations` resets it to 0, so the net change is `max(buffer - tempOps_before, ceil(qq/damper))`.
- **Fixed behavior:** `tempOps = tempOps + ceil((qq - buffer)/damper)`; net change is `buffer + ceil((qq - buffer)/damper)`. Identical to the original when `buffer == 0` (memory full).
- **Category:** Gameplay
- **Player impact:** differs only when `0 < buffer < qq` (within 3,600 ops of the cap). With `tempOps == 0` the original pays at least the room left, and the fix adds up to 576 ops per click (e.g. room 720, qq 3,600: 720 vs 1,296). With `tempOps >= buffer` (common right after spending ops on a project while holding temp ops, because `standardOps` then can't refill) the original is non-monotonic: `tempOps` 10,000, room 3,000: qq 3,000 gives +3,000, qq 3,001 gives +29. The fix gives +3,001. Over-cap clicks at full memory, the main quantum use, are unchanged.
- **Recommendation:** Fix
- **Rationale:** A brighter click paying 100× less (the click mostly converts existing temp ops into standard ops) is plainly broken from the player's view. Matches 00-overview §4 item 2.

#### 03-Q2 — Negative operations from negative-q clicks
- **Location:** `qComp`
- **Original behavior:** a negative `qq` is added to `standardOps` with no floor, so `standardOps` and `operations` can go below zero (to as low as -3,600 per click).
- **Fixed behavior:** (none adopted) clamping at 0 would be the "fix".
- **Category:** Gameplay
- **Player impact:** clamping would make project 217 "Quantum Temporal Reversion" (trigger `operations <= -10000`) unreachable.
- **Recommendation:** Keep original
- **Rationale:** Intentional design, ruled in 00-overview §4 item 1. The main text specifies it.

#### 03-Q3 — Chip price tag formatting
- **Location:** project 51 effect; load routine
- **Original behavior:** the initial tag is `"(10,000 ops)"`; after a purchase or a load it is rebuilt as `"(" + qChipCost + " ops)"`, e.g. "(15000 ops)".
- **Fixed behavior:** always `"(" + fmtInt(qChipCost) + " ops)"`.
- **Category:** Display
- **Player impact:** none beyond the separator.
- **Recommendation:** Fix
- **Rationale:** Cosmetic inconsistency. Covered by 00-overview §4 item 4.

### Investments

#### 03-I1 — Upgrade message float noise
- **Location:** `investUpgrade`
- **Original behavior:** prints the raw float, e.g. "…ratio now 0.5700000000000001".
- **Fixed behavior:** `format2(stockGainThreshold)`, e.g. "0.57".
- **Category:** Display
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Cosmetic.

#### 03-I2 — P/L not updated on revival
- **Location:** `updateStocks`
- **Original behavior:** when a price of 0 is revived to 1, `total` rises by `amount` but `profit` is unchanged.
- **Fixed behavior:** `profit += amount` on revival (main text 2.6), so P/L tracks the value change.
- **Category:** Display (`profit` is read only by the P/L column)
- **Player impact:** P/L column for a revived holding reads `amount` dollars low; nothing else changes.
- **Recommendation:** Fix
- **Rationale:** Display-only and makes the column consistent.

#### 03-I3 — Possible zero price
- **Location:** `createStock`
- **Original behavior:** if the tier draw (or `roll` on the `pri > dollars` path) is exactly 0, `pri = 0`. In JS `floor(dollars/0)` is Infinity, capped to 1,000,000 shares at price 0 for $0, which can later revive to price 1 (a free $1,000,000 holding). In most other languages this is a divide-by-zero.
- **Fixed behavior:** `pri = max(pri, 1)`.
- **Category:** Robustness (crash)
- **Player impact:** none in practice (needs a draw of exactly 0, about 1 in 2^53 per buy).
- **Recommendation:** Fix
- **Rationale:** Avoids a crash in non-JS hosts at no gameplay cost.

#### 03-I4 — Funds formatting on deposit/withdraw
- **Location:** `investDeposit`, `investWithdraw`
- **Original behavior:** redraw funds as `funds.toFixed(2)` (no thousands separators) until the next funds refresh.
- **Fixed behavior:** section 01's standard funds format.
- **Category:** Display
- **Player impact:** none beyond the separator.
- **Recommendation:** Fix
- **Rationale:** Cosmetic.

#### 03-I5 — Risk and strategy selections not persisted
- **Location:** load routine; 100 ms display loop; `pick` timer
- **Original behavior:** `riskiness` and `pick` are saved, but on load both selectors reset to their defaults (Low Risk, "Pick a Strat") and the 100 ms timers overwrite the loaded values within 100 ms.
- **Fixed behavior:** save both selector values and restore the selectors on load (section 4).
- **Category:** Robustness (save/load)
- **Player impact:** original: after a reload, risk silently returns to Low and tournaments award nothing (and auto-tourney stops) until the player re-picks. Fixed: settings survive the reload.
- **Recommendation:** Fix
- **Rationale:** Save/load state loss.

### Strategic Modeling

#### 03-S1 — Move history carries over between matches
- **Location:** `round`/`runRound`
- **Original behavior:** `hMove`/`vMove` are never reset. At iteration 1 of each match, `hMovePrev`/`vMovePrev` are the previous match's final moves, so a history strategy in seat 1 reacts to the previous match's V player and in seat 2 to the previous match's H player. With 8 strategies (pairing order in 3.5) this means: (a) in rows 1–5 (row strategy constant within a grid), matches (h,6) and (h,7) follow (h,5) and (h,6), whose H seat is the same row strategy, so TFT and BEAT LAST in the V seat open already reacting to their actual opponent's move; (b) in row 6, TFT opens against strategy *v* with strategy *v*−1's move; (c) TFT self-play follows TFT vs MINIMAX, so it opens on MINIMAX's move and then locks in: it scores 20·`bb` instead of 20·`aa` whenever MINIMAX plays B (largest payoff is `aa` or `ba`, 53% of grids); (d) BEAT LAST self-play opens from the final state of BEAT LAST vs TFT; (e) matches against RANDOM differ only at iteration 1. Cross-tournament history has no effect (match 0 is RANDOM vs RANDOM).
- **Fixed behavior (optional variant):** at match setup set `hMove = vMove = 1` (and therefore `hMovePrev = vMovePrev = 1` at iteration 1), so TFT and BEAT LAST open as if the opponent had played A. Apply together with the S2 variant.
- **Category:** Gameplay
- **Player impact:** the fix makes TFT and BEAT LAST stronger. TFT mean score 898.9 → 921.4 (+2.5%; median change +7, 5th–95th percentile −90 to +175, |change| ≥ 50 in 37% of tournaments; about +20 of the gain is item (c)); TFT finishes first or tied 5.5% → 9.2%. BEAT LAST 1,083.5 → 1,096.4 (+1.2%; unchanged in 17%, 5th–95th −22 to +126); first or tied 35.5% → 40.9%. GENEROUS drops 22.9% → 16.9% first; others move ≤ 1.5 points. The winner changes in 16.8% of tournaments. Yomi: an always-optimal pick gains only +0.3% (1,112.7 → 1,115.9 points); an always-BEAT-LAST player with project 128 and `yomiBoost` 2 averages 14,451 → 15,750 yomi per tournament (+9%). With 7 strategies, TFT 770.6 → 787.7 and first 13.1% → 17.2%; winner changes in 11.6%.
- **Recommendation:** Keep original, fix as optional variant
- **Rationale:** The leak is unintended but invisible and deterministic, and fixing it changes which strategy wins about one tournament in six and late-game yomi for the popular BEAT LAST pick by about 9%. The main text specifies the original exactly.

#### 03-S2 — Seat clash in self-play
- **Location:** `pickStrats`; TIT FOR TAT and BEAT LAST `pickMove`
- **Original behavior:** one strategy object holds a single `currentPos`; in self-play it is set to 1 then 2, so both seats act as seat 2 and both read `hMovePrev`. Both sides therefore play the same move every iteration.
- **Fixed behavior (optional variant):** track the seat per player slot: seat 1 reads `vMovePrev`, seat 2 reads `hMovePrev`, also in self-play.
- **Category:** Gameplay
- **Player impact:** with S1 kept, fixing S2 alone changes BEAT LAST self-play (mean 1,083.5 → 1,100.2, first 35.5% → 40.8%); TFT is unaffected because both of its prior moves are equal. With the S1 variant applied, S2 has no observable effect (both moves start at A and stay equal).
- **Recommendation:** Keep original, fix as optional variant (only together with the S1 variant)
- **Rationale:** Reproducing the original tournament results requires the clash as long as S1 is kept. Under the S1 variant it is moot, and per-slot seats are the cleaner model.

#### 03-S3 — Roster change mid-tournament
- **Location:** `newTourney`/`pickStrats`/`pickWinner`
- **Original behavior:** `rounds = n²` is fixed at New Tournament, but `pickStrats` and `pickWinner` read `len(strats)` live. Buying a strategy (projects 60–66) during a run breaks the pairing: e.g. 7 → 8 before match 0 or 1 skips 6 of the 49 original pairings and gives the newcomer 6 matches; mid-run (match 24) skips 6, repeats 3, newcomer plays 3. The newcomer is ranked and can be picked with its partial score.
- **Fixed behavior:** snapshot the roster at New Tournament (main text 3.5). A strategy bought mid-run joins the next tournament. If `pick` isn't in the running roster, treat it as no pick (main text 3.6).
- **Category:** Gameplay
- **Player impact:** at most 7 tournaments per game can be affected, and only if a strategy is bought while one runs; each affected tournament's ranking is distorted. Negligible overall.
- **Recommendation:** Fix
- **Rationale:** Skipped and repeated pairings make no sense, and the impact is negligible.

#### 03-S4 — Status-line text flips
- **Location:** `declareWinner`
- **Original behavior:** sets "TOURNAMENT RESULTS (roll over for payoff grid)", then overwrites it with "TOURNAMENT RESULTS (roll over for grid)" whenever no placement bonus is awarded (always, before project 128).
- **Fixed behavior:** "TOURNAMENT RESULTS (roll over for payoff grid)" always.
- **Category:** Display
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Cosmetic.

#### 03-S5 — Auto-tourney stalls after load
- **Location:** load routine; auto-tourney check in `buttonUpdate`
- **Original behavior:** load hides the results area but restores `resultsFlag = 1`; the countdown requires visible results, so auto-tourney doesn't resume until the player rolls over and off the area.
- **Fixed behavior:** on load, show the results area when `resultsFlag == 1` (section 4).
- **Category:** Robustness (softlock)
- **Player impact:** original: auto-tourney silently stops after every reload until the player hovers. Fixed: resumes about 3 s after load.
- **Recommendation:** Fix
- **Rationale:** Save/load stall with no benefit.

#### 03-S6 — Zero payoff on rand() == 0 (added)
- **Location:** `generateGrid`
- **Original behavior:** `ceil(rand()*10)` gives a 0 payoff if `rand()` returns exactly 0.
- **Fixed behavior:** treat 0 as 1, so every payoff is in 1..10.
- **Category:** Gameplay
- **Player impact:** none in practice (about 1 in 2^53 per value).
- **Recommendation:** Fix
- **Rationale:** Keeps the documented 1..10 range at no observable cost.

**Not defects (intentional; keep)**: double scoring in self-play; GENEROUS/MINIMAX rule definitions; duplicate "accept" labels; bonus yomi not scaled by `yomiBoost`; `pick` read at completion (gives no edge: the grid is visible from New Tournament on); no yomi when nothing is picked; Withdraw only returns cash; the revenue report's first firing right after unlock; investments abandoned on leaving phase 1. Negative ops from Compute is entry Q2.

**Vestigial (no behaviour)**: `tourneyLvl`, stock `age`, `stockID`, and the stock `id` field are maintained and saved but never read.
