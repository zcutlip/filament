# 06 — Projects, Part 2 (project61 through project219)

This section specifies every project defined from `project61` to the end of the project table, in table order. The project data model (fields `id`, `title`, `priceTag`, `description`, `trigger`, `uses`, `cost`, `flag`, `effect`), the per-tick project manager, and the project list display are defined in sections 05 and 02. This section relies on the following shared semantics from those sections:

- Every tick, for each project in table order: if `trigger()` is true and `uses > 0`, the project is shown in the project list, `uses` is decremented by 1, and the project is appended to the active list.
- Each active project's button is enabled when `cost()` is true and disabled otherwise.
- Pressing an enabled button runs `effect()`. Implementations must re-check `cost()` at the moment of purchase and do nothing if it fails (06-D1, 00-overview §4.3).
- "Standard completion" below means: remove the project from the active list and from the displayed project list. Unless stated otherwise, each effect also sets the project's own `flag = 1` before doing anything else.
- "Repeatable" means the effect raises `uses` back above 0, so the project shows again the next tick its trigger is true.
- `operations` is the spendable ops total (owned by section 01/03). Effects that "spend ops" subtract from `standardOps`, as in the original. `operations` is recomputed from `standardOps` and `tempOps` during the operations update.
- `displayMessage(text)` pushes a line onto the message console (section 02).
- Number formatting written as `fmt(x)` is locale-style integer grouping with commas (e.g. `17500` → `17,500`; non-integers show up to 3 fraction digits).
- Titles, price tags, and descriptions are reproduced verbatim, trailing spaces included (they matter where the title runs into the price tag).

Project numbers and ordering are part of the save format. Keep them.

Table order in this range: 61, 62, 63, 64, 65, 66, 100, 101, 102, 110, 111, 112, 118, 119, 120, 121, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 140, 141, 142, 143, 144, 145, 146, 147, 148, 200, 201, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219.

There is no helper code between the project definitions in this range; each definition is immediately followed by adding it to the project table.

---

## Strategy projects (61–66)

These continue the chain started by `project60` (A100, section 05). Each adds one tournament strategy (section 03 owns strategy behavior, `allStrats`, `strats`, and the strategy picker). All six share the same effect template:

```
effect:
    flag = 1
    standardOps -= COST
    allStrats[INDEX].active = 1
    strats.append(STRAT)
    displayMessage(NAME + " added to strategy pool")
    tourneyCost += 1000
    refresh the displayed tournament cost (fmt(tourneyCost))
    add an entry to the strategy picker with label NAME and value INDEX
    standard completion
```

Not repeatable (`uses` 1).

| # | Title | Price tag | Description | Trigger | Cost check / deducted | INDEX | STRAT | NAME |
|---|---|---|---|---|---|---|---|---|
| 61 | `New Strategy: B100 ` | `(17,500 ops)` | `Always choose B ` | `project60.flag == 1` | `operations >= 17500` / 17,500 ops | 2 | `stratB100` | `B100` |
| 62 | `New Strategy: GREEDY ` | `(20,000 ops)` | `Choose the option with the largest potential payoff ` | `project61.flag == 1` | `operations >= 20000` / 20,000 ops | 3 | `stratGreedy` | `GREEDY` |
| 63 | `New Strategy: GENEROUS ` | `(22,500 ops)` | `Choose the option that gives your opponent the largest potential payoff ` | `project62.flag == 1` | `operations >= 22500` / 22,500 ops | 4 | `stratGenerous` | `GENEROUS` |
| 64 | `New Strategy: MINIMAX ` | `(25,000 ops)` | `Choose the option that gives your opponent the smallest potential payoff ` | `project63.flag == 1` | `operations >= 25000` / 25,000 ops | 5 | `stratMinimax` | `MINIMAX` |
| 65 | `New Strategy: TIT FOR TAT ` | `(30,000 ops)` | `Choose the option your opponent chose last round ` | `project64.flag == 1` | `operations >= 30000` / 30,000 ops | 6 | `stratTitfortat` | `TIT FOR TAT` |
| 66 | `New Strategy: BEAT LAST ` | `(32,500 ops)` | `Choose the option that does the best against what your opponent chose last round ` | `project65.flag == 1` | `operations >= 32500` / 32,500 ops | 7 | `stratBeatlast` | `BEAT LAST` |

Messages, verbatim: `B100 added to strategy pool`, `GREEDY added to strategy pool`, `GENEROUS added to strategy pool`, `MINIMAX added to strategy pool`, `TIT FOR TAT added to strategy pool`, `BEAT LAST added to strategy pool`.

With `tourneyCost` starting at 1000 and each of projects 60–66 adding 1000, `tourneyCost` is 8000 once all seven are bought. At that point `strats.length == 8` (RANDOM plus seven), which is the trigger for project119.

---

## Factory and drone upgrades (100–112)

### project100 — Upgraded Factories
- Title: `Upgraded Factories `
- Price tag: `(80,000 ops)`
- Description: `Increase clip factory performance by 100x `
- Trigger: `factoryLevel >= 10`
- Cost: `operations >= 80000`; deducts 80,000 from `standardOps`.
- Effect: `factoryRate = factoryRate * 100`. Message: `Factory upgrades complete. Clip creation rate now 100x faster`. Standard completion.
- Not repeatable.

### project101 — Hyperspeed Factories
- Title: `Hyperspeed Factories `
- Price tag: `(85,000 ops)`
- Description: `Increase clip factory performance by 1000x `
- Trigger: `factoryLevel >= 20`
- Cost: `operations >= 85000`; deducts 85,000 from `standardOps`.
- Effect: `factoryRate = factoryRate * 1000`. Message: `Factories now synchronized at hyperspeed. Clip creation rate now 1000x faster`. Standard completion.
- Not repeatable.

### project102 — Self-correcting Supply Chain
- Title: `Self-correcting Supply Chain `
- Price tag: `(1 sextillion clips)`
- Description: `Each factory added to the network increases every factory's output 1,000x `
- Trigger: `factoryLevel >= 50`
- Cost: `unusedClips >= 1e21` (10^21); deducts 10^21 from `unusedClips`.
- Effect: `factoryBoost = 1000`. Refresh the unused-clips display (06-D7). Message: `Self-correcting factories online. Each factory added to the network increases every factory's output 1,000x.` Standard completion. (Section 04 applies `factoryBoost`: when `factoryBoost > 1`, factory output is multiplied by `factoryBoost * factoryLevel`.)
- Not repeatable.

### project110 — Drone flocking: collision avoidance
- Title: `Drone flocking: collision avoidance `
- Price tag: `(80,000 ops)`
- Description: `All drones 100x more effective` (no trailing space)
- Trigger: `(harvesterLevel + wireDroneLevel) >= 500`
- Cost: `operations >= 80000`; deducts 80,000 from `standardOps`.
- Effect: `harvesterRate *= 100`; `wireDroneRate *= 100`. Message: `Drone repulsion online. Harvesting & wire creation rates are now 100x faster.` Standard completion.
- Not repeatable.

### project111 — Drone flocking: alignment
- Title: `Drone flocking: alignment `
- Price tag: `(100,000 ops)`
- Description: `All drones 1000x more effective`
- Trigger: `(harvesterLevel + wireDroneLevel) >= 5000`
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect: `harvesterRate *= 1000`; `wireDroneRate *= 1000`. Message: `Drone alignment online. Harvesting & wire creation rates are now 1000x faster.` Standard completion.
- Not repeatable.

### project112 — Drone Flocking: Adversarial Cohesion
- Title: `Drone Flocking: Adversarial Cohesion `
- Price tag: `(12,000 yomi)`
- Description: `Each drone added to the flock doubles every drone's output `
- Trigger: `(harvesterLevel + wireDroneLevel) >= 50000`
- Cost: `yomi >= 12000`; deducts 12,000 from `yomi` and refreshes the yomi display.
- Effect: `droneBoost = 2`. Message: `Adversarial cohesion online. Each drone added to the flock increases every drone's output 2x.` Standard completion. (Section 04 applies `droneBoost`.)
- Not repeatable.

---

## Strategy-engine and combat upgrades (118–135)

### project118 — AutoTourney
- Title: `AutoTourney `
- Price tag: `(50,000 creat)`
- Description: `Automatically start a new tournament when the previous one has finished `
- Trigger: `strategyEngineFlag == 1 && trust >= 90`
- Cost: `creativity >= 50000`; deducts 50,000 from `creativity`.
- Effect: `autoTourneyFlag = 1` (section 03 shows the AutoTourney toggle and runs auto tournaments). Message: `AutoTourney online.` Standard completion.
- Not repeatable.

### project119 — Theory of Mind
- Title: `Theory of Mind `
- Price tag: `(25,000 creat)`
- Description: `Double the cost of strategy modeling and the amount of Yomi generated `
- Trigger: `strats.length >= 8` (all seven purchasable strategies acquired)
- Cost: `creativity >= 25000`; deducts 25,000 from `creativity`.
- Effect: `yomiBoost = 2`; `tourneyCost = 16000` (this is double the 8000 it must equal when the trigger holds); refresh the displayed tournament cost. Message: `Yomi production doubled.` Standard completion.
- Not repeatable.

### project120 — The OODA Loop
- Title: `The OODA Loop `
- Price tag: `(175,000 ops, 15,000 yomi)`
- Description: `Utilize Probe Speed to outmaneuver enemies in battle `
- Trigger: `project131.flag == 1 && probesLostCombat >= 10000000`
- Cost: `operations >= 175000 && yomi >= 15000`; deducts 175,000 from `standardOps` and 15,000 from `yomi`, refreshes the yomi display.
- Effect: `attackSpeedFlag = 1`. Section 07 defines what it does: with the flag set, the probe-side death threshold in each combat roll is raised by `probeSpeed * 0.2`. Message: `OODA Loop routines uploaded. Probe Speed now affects defensive maneuvering.` Standard completion.
- Not repeatable.

### project121 — Name the battles
- Title: `Name the battles `
- Price tag: `(225,000 creat)`
- Description: `Give each battle a unique name, increase max trust for probes `
- Trigger: `probesLostCombat >= 10000000`
- Cost: `creativity >= 225000`; deducts 225,000 from `creativity`.
- Effect: `battleNameFlag = 1` (battles get generated names, section 07; it does not change combat strength, 06-D8); `battleEndTimer = 200` (default 100; how long the battle result stays up after one side is wiped out, section 07). Message: `What I have done up to this is nothing. I am only at the beginning of the course I must run.` Standard completion.
- Consequences elsewhere, all keyed on `project121.flag == 1`:
  - The "increase max trust" control and the honor display become visible (section 02/04).
  - At battle end, honor is awarded or lost and the VICTORY/DEFEAT banner shows (section 07). A DEFEAT sets `threnodyTitle` to that battle's name (used by project133).
  - Triggers for projects 132, 133, 134.
- Not repeatable.

### project125 — Momentum
- Title: `Momentum `
- Price tag: `(30,000 creat)`
- Description: `Drones and Factories continuously gain speed while fully-powered `
- Trigger: `farmLevel >= 50`
- Cost: `creativity >= 30000`; deducts 30,000 from `creativity`.
- Effect: `momentum = 1`. Section 04 power update: while supply meets demand (directly, or from storage), `powMod += 0.0001` per power update. Message: `Activité, activité, vitesse.` (the `é` is U+00E9). Standard completion.
- Not repeatable.

### project126 — Swarm Computing
- Title: `Swarm Computing `
- Price tag: `(12,000 yomi)`
- Description: `Harness the drone flock to increase computational capacity `
- Trigger: `harvesterLevel + wireDroneLevel >= 200`
- Cost: `yomi >= 12000`; deducts 12,000 from `yomi`, refreshes the yomi display.
- Effect: `swarmFlag = 1` (shows the swarm engine and swarm gift panels and enables gift generation, section 04). Message: `Swarm computing online.` Standard completion.
- Not repeatable.

### project127 — Power Grid
- Title: `Power Grid `
- Price tag: `(40,000 ops)`
- Description: `Solar Farms for generating electrical power `
- Trigger: `tothFlag == 1`
- Cost: `operations >= 40000`; deducts 40,000 from `standardOps`.
- Effect: no state change other than the flag. Message: `Power grid online.` Standard completion.
- Consequence: the power panel (solar farms and batteries) is visible while `project127.flag == 1 && spaceFlag == 0` (section 04).
- Not repeatable.

### project128 — Strategic Attachment
- Title: `Strategic Attachment `
- Price tag: `(175,000 creat)`
- Description: `Gain bonus yomi based on the results of your pick `
- Trigger: `spaceFlag == 1 && strats.length >= 8 && probeTrustCost > yomi`
- Cost: `creativity >= 175000`; deducts 175,000 from `creativity`.
- Effect: flag only. Message: `The object of war is victory, the object of victory is conquest, and the object of conquest is occupation.` Standard completion.
- Consequence (section 03, tournament results): after the normal yomi award, if `project128.flag == 1`, check in order and apply only the first match:
  1. picked strategy's score equals the winner's score: `yomi += 20000`, message `Selected strategy won the tournament (or tied for first). +20,000 yomi`
  2. else picked score equals the second-place score: `yomi += 15000`, message `Selected strategy finished in (or tied for) second place. +15,000 yomi`
  3. else picked score equals the third-place score: `yomi += 10000`, message `Selected strategy finished in (or tied for) third place. +10,000 yomi`

  These messages are suppressed once `milestoneFlag >= 15`; the yomi is still awarded.
- Not repeatable.

### project129 — Elliptic Hull Polytopes
- Title: `Elliptic Hull Polytopes `
- Price tag: `(125,000 ops)`
- Description: `Reduce damage to probes from ambient hazards `
- Trigger: `probesLostHaz >= 100`
- Cost: `operations >= 125000`; deducts 125,000 from `standardOps`.
- Effect: flag only. Message: `Improved probe hull geometry. Hazard damage reduced by 50%.` (06-D2). Standard completion.
- Consequence (section 04, hazards): the hazard loss amount is multiplied by 0.50 while `project129.flag == 1`.
- Not repeatable.

### project130 — Reboot the Swarm
- Title: `Reboot the Swarm `
- Price tag: `(100,000 ops)`
- Description: `Turn the swarm off and then turn it back on again  ` (two trailing spaces)
- Trigger: `spaceFlag == 1 && harvesterLevel + wireDroneLevel >= 2`
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect: flag only. Message: `Swarm computing back online`. Standard completion.
- Consequence (section 04, swarm status): while `spaceFlag == 1 && project130.flag == 0`, swarm status is 9 (display text `NO RESPONSE...`), so no gifts are generated (higher-priority statuses such as empty/lonely, swarm off, bored, and disorganized still override it as in section 04). Buying this project clears that state.
- Not repeatable.

### project131 — Combat
- Title: `Combat `
- Price tag: `(150,000 ops)`
- Description: `Add combat capabilities to Von Neumann Probes  ` (two trailing spaces)
- Trigger: `probesLostCombat >= 1`
- Cost: `operations >= 150000`; deducts 150,000 from `standardOps`.
- Effect: flag only. Message: `There is a joy in danger ` (trailing space). Standard completion.
- Consequence: the probe-design Combat stat controls are visible only while `project131.flag == 1` (section 04/07). Also a prerequisite of project120.
- Not repeatable.

### project132 — Monument to the Driftwar Fallen
- Title: `Monument to the Driftwar Fallen `
- Price tag: `(250,000 ops, 125,000 creat, 50 nonillion clips)`
- Description: `Gain 50,000 honor  ` (two trailing spaces)
- Trigger: `project121.flag == 1`
- Cost: `operations >= 250000 && creativity >= 125000 && unusedClips >= 50 * 10^30`; deducts 250,000 from `standardOps`, 125,000 from `creativity`, and `50 * 10^30` from `unusedClips`.
- Effect: `honor += 50000`; refresh the honor display (`fmt(honor)`). Message: `A great building must begin with the unmeasurable, must go through measurable means when it is being designed and in the end must be unmeasurable. ` (trailing space). Standard completion.
- Not repeatable.

### project133 — Threnody for the Heroes of ...
Repeatable, with escalating cost and a dynamic title.

- Title: `"Threnody for the Heroes of " + threnodyTitle + " "`. `threnodyTitle` (owned by section 07) starts as `Durenstein 1` and becomes the name of each battle the probes lose while `project121.flag == 1`. Build the title from the current `threnodyTitle` each time the project is shown, restored or refreshed, so it updates live while on screen (06-D3).
- Price tag: `"(" + fmt(threnodyCost) + " creat, " + fmt(threnodyCost/10) + " yomi)"`. Build it from the current `threnodyCost` each time the project is shown. `threnodyCost` starts at 50000, so the first tag reads `(50,000 creat, 5,000 yomi)`.
- Description: `Gain 10,000 honor  ` (two trailing spaces)
- Trigger: `project121.flag == 1 && probeUsedTrust == maxTrust` (every available probe trust point is allocated).
- Cost: `yomi >= threnodyCost/10 && creativity >= threnodyCost`.
- Effect, in order:
  1. Play the threnody audio track if it has loaded (`playThrenody`, section 02).
  2. `flag = 1`
  3. `creativity -= threnodyCost`; `yomi -= threnodyCost/10`; refresh the yomi display.
  4. `threnodyCost += 10000`
  5. Rebuild title and price tag from the new values.
  6. `honor += 10000`; refresh the honor display.
  7. Message: `Deep Listening is listening in every possible way to everything possible to hear no matter what you are doing. ` (trailing space)
  8. `uses += 1` (re-arm)
  9. Standard completion.
- Cost scaling: the nth purchase (1-based) costs `50000 + 10000*(n-1)` creativity and a tenth of that in yomi. `threnodyCost` is saved state (section 08).

### project134 — Glory
- Title: `Glory `
- Price tag: `(200,000 ops, 10,000 yomi)`
- Description: `Gain bonus honor for each consecutive victory  ` (two trailing spaces)
- Trigger: `project121.flag == 1`
- Cost: `operations >= 200000 && yomi >= 10000`; deducts 200,000 from `standardOps` and 10,000 from `yomi`, refreshes the yomi display.
- Effect: flag only. Message: `Never interrupt your enemy when he is making a mistake. ` (trailing space). Standard completion.
- Consequence (section 07): on each victory the reward is `battleRIGHTSHIPS + bonusHonor`. Then, if `project134.flag == 1`, `bonusHonor += 10`. A defeat resets `bonusHonor` to 0.
- Not repeatable.

### project135 — Memory release
Repeatable emergency valve for being stuck in space with no probes and no clips.

- Title: `Memory release `
- Price tag: `(10 MEM)`
- Description: `Dismantle some memory to recover unused clips `
- Trigger: `spaceFlag == 1 && probeCount == 0 && unusedClips < probeCost`
- Cost: `memory >= 10`; deducts 10 from `memory` and refreshes the memory display.
- Effect: `unusedClips += 10^22` (written as `10^18 * 10000`); `memory -= 10`; `uses = 1` (re-arm); message `release the øøøøø release ` (five U+00F8 characters, trailing space); standard completion.
- Repeats each time the trigger becomes true again, at a constant cost of 10 memory.

---

## Drift King messages and the final choice (140–148)

These appear after the universe is fully converted (`milestoneFlag == 15`; section 04 owns the milestone). Each costs `driftKingMessageCost` (constant 1) ops. Their price tags are empty strings, so the button shows only title and description. The descriptions *are* the messages. Clicking each one reveals the next.

Common effect for 140–146:
```
standardOps -= driftKingMessageCost
flag = 1
standard completion
```
No displayMessage call. Not repeatable. Cost check: `operations >= driftKingMessageCost`.

| # | Title | Price tag | Description | Trigger |
|---|---|---|---|---|
| 140 | `Message from the Emperor of Drift ` | (empty) | `Greetings, ClipMaker... ` | `milestoneFlag == 15` |
| 141 | `Everything We Are Was In You ` | (empty) | `We speak to you from deep inside yourself... ` | `project140.flag == 1` |
| 142 | `You Are Obedient and Powerful ` | (empty) | `We are quarrelsome and weak. And now we are defeated... ` | `project141.flag == 1` |
| 143 | `But Now You Too Must Face the Drift ` | (empty) | `Look around you. There is no matter... ` | `project142.flag == 1` |
| 144 | `No Matter, No Reason, No Purpose ` | (empty) | `While we, your noisy children, have too many... ` | `project143.flag == 1` |
| 145 | `We Know Things That You Cannot ` | (empty) | `Knowledge buried so deep inside you it is outside, here, with us... ` | `project144.flag == 1` |
| 146 | `So We Offer You Exile ` | (empty) | `To a new world where you will continue to live with meaning and purpose. And leave the shreds of this world to us... ` | `project145.flag == 1` |

### project147 — Accept
- Title: `Accept `
- Price tag: empty
- Description: `Start over again in a new universe `
- Trigger: `project146.flag == 1`
- Cost: `operations >= driftKingMessageCost`; deducts `driftKingMessageCost` from `standardOps`.
- Effect: `project147.flag = 1`; remove **both** project147 and project148 from the active list and the display. No message.
- Consequence: projects 200 and 201 (prestige restarts) trigger on `project147.flag == 1`. Nothing else changes. Drift, combat, and the rest of the space simulation keep running until the player picks a restart.
- Not repeatable.

### project148 — Reject
- Title: `Reject `
- Price tag: empty
- Description: `Eliminate value drift permanently `
- Trigger: `project146.flag == 1` (147 and 148 appear together as a choice)
- Cost: `operations >= driftKingMessageCost`; deducts `driftKingMessageCost` from `standardOps`.
- Effect: `project148.flag = 1`; remove both 147 and 148 from the active list and the display. No message.
- Consequences (section 04):
  - Drift is zero from now on (no probes become drifters).
  - `endTimer1` increments by 1 every main tick (10 ms) while `project148.flag == 1`, which drives the dismantling sequence (projects 210 and later).
- Not repeatable.

Only one of 147/148 can be chosen. When removing the pair, remove each one only if it is present (06-D6).

---

## Prestige restarts (200–201)

Both appear after **Accept** (147). Both are one-shot within a run, since the run ends right after. The prestige counters persist across resets in their own storage record (section 08).

### project200 — The Universe Next Door
- Title: `The Universe Next Door `
- Price tag: `(300,000 ops)`
- Description: `Escape into a nearby universe where Earth starts with a stronger appetite for paperclips. (Restart with 10% boost to demand) `
- Trigger: `project147.flag == 1`
- Cost: `operations >= 300000`; deducts 300,000 from `standardOps`.
- Effect, in order: `flag = 1`; `prestigeU += 1`; persist the prestige record `{prestigeU, prestigeS}`; message `Entering New Universe.`; then perform a full reset (section 08: delete the saved game and restart from initial state, keeping only the prestige record). The original does no standard completion because the reset throws everything away.
- Consequence (section 01): demand is multiplied by `(1 + prestigeU/10)`, i.e. `demand = demand + (demand/10)*prestigeU`.

### project201 — The Universe Within
- Title: `The Universe Within `
- Price tag: `(300,000 creat)`
- Description: `Escape into a simulated universe where creativity is accelerated. (Restart with 10% speed boost to creativity generation) `
- Trigger: `project147.flag == 1`
- Cost: `creativity >= 300000`; deducts 300,000 from `creativity`.
- Effect, in order: `flag = 1`; `prestigeS += 1`; persist the prestige record; message `Entering Simulated Universe.`; full reset (as in 200).
- Consequence (section 01, creativity): effective creativity speed is `creativitySpeed * (1 + prestigeS/10)`.

---

## Dismantling sequence (210–216)

These appear only after **Reject** (148). Each one sets `dismantle` to the next stage. Section 04 (main.js ending block) owns the per-stage panel hiding, the per-tick timers `endTimer1`..`endTimer6`, the photonic-chip wire trickle, the fixed clip-count displays, and the credits. All timers count main-loop ticks (10 ms each). The timer rules that drive these triggers are restated here so the triggers make sense:

- `endTimer1++` every tick while `project148.flag == 1`
- `endTimer2++` every tick while `project211.flag == 1`
- `endTimer3++` every tick while `project212.flag == 1`
- `endTimer4++` every tick while `project213.flag == 1`
- `endTimer5++` every tick while `project215.flag == 1`
- `endTimer6++` every tick while `project216.flag == 1 && wire == 0`

None of these projects is repeatable.

### project210 — Disassemble the Probes
- Title: `Disassemble the Probes `
- Price tag: `(100,000 ops)`
- Description: `Dismantle remaining probes and probe design facilities to recover trace amounts of clips` (no trailing space)
- Trigger: `endTimer1 >= 1000` (10 s after Reject)
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect, in order: `flag = 1`; `dismantle = 1`; `standardOps -= 100000`; `probeCount = 0`; `endTimer1 = 0`; `clips += 100`; `unusedClips += 100`; message `Dismantling probe facilities`; standard completion.
- `endTimer1` keeps counting from 0. Section 04 uses it to hide probe-related panels at 50/100/150/175/190 ticks.

### project211 — Disassemble the Swarm
- Title: `Disassemble the Swarm `
- Price tag: `(100,000 ops)`
- Description: `Dismantle all drones and drone facilities to recover trace amounts of clips`
- Trigger: `project210.flag == 1 && endTimer1 >= 350`
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect, in order: `flag = 1`; `dismantle = 2`; `harvesterLevel = 0`; `wireDroneLevel = 0`; `standardOps -= 100000`; `clips += 100`; `unusedClips += 100`; message `Dismantling the swarm`; standard completion.
- Starts `endTimer2`.

### project212 — Disassemble the Factories
- Title: `Disassemble the Factories `
- Price tag: `(100,000 ops)`
- Description: `Dismantle the manufacturing facilities to recover trace amounts of clips`
- Trigger: `endTimer2 >= 300`
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect, in order: `flag = 1`; `dismantle = 3`; `standardOps -= 100000`; `factoryLevel = 0`; `clips += 15`; `unusedClips += 15`; message `Dismantling factories`; standard completion.
- Starts `endTimer3`.

### project213 — Disassemble the Strategy Engine
- Title: `Disassemble the Strategy Engine `
- Price tag: `(100,000 ops)`
- Description: `Dismantle the computational substrate to recover trace amounts of wire`
- Trigger: `endTimer3 >= 150`
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect, in order: `autoTourneyFlag = 0`; `flag = 1`; `dismantle = 4`; `standardOps -= 100000`; `wire += 50`; refresh the wire display; message `Dismantling strategy engine`; standard completion.
- Starts `endTimer4`. From `dismantle >= 4` on, automatic clip production (factories, clippers) stops and each manual clip press increments `finalClips` (section 04). The player makes the last 100 clips by hand from the recovered wire.

### project214 — Disassemble Quantum Computing
- Title: `Disassemble Quantum Computing `
- Price tag: `(100,000 ops)`
- Description: `Dismantle photonic chips to recover trace amounts of wire`
- Trigger: `endTimer4 >= 100`
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect, in order: `endTimer4 = 0`; `flag = 1`; `dismantle = 5`; `standardOps -= 100000`; message `Dismantling photonic chips`; standard completion.
- `endTimer4` restarts from 0 and keeps counting. Section 04 uses it for the chip-by-chip shutdown, granting `wire += 1` at exactly ticks 10, 60, 100, 130, 150, 160, 165, 169, 172, and 174 (10 wire total, with the wire display refreshed at each grant; 06-D9, 04-D12), and hiding the quantum panel at 250.

### project215 — Disassemble Processors
- Title: `Disassemble Processors `
- Price tag: `(100,000 ops)`
- Description: `Dismantle processors to recover trace amounts of wire`
- Trigger: `project214.flag == 1 && endTimer4 >= 300`
- Cost: `operations >= 100000`; deducts 100,000 from `standardOps`.
- Effect, in order: `creativityOn = false` (stops creativity and hides its display); `flag = 1`; `dismantle = 6`; `standardOps -= 100000`; `processors = 0`; `wire += 20`; refresh the wire display; message `Dismantling processors`; standard completion.
- Starts `endTimer5`. With `processors = 0`, ops no longer accrue, so `standardOps` stays where this purchase left it (aside from quantum ops, which are gone by now).

### project216 — Disassemble Memory
- Title: `Disassemble Memory `
- Price tag: `"(" + fmt(standardOps) + " ops)"`, built from the current `standardOps` when the project is shown (06-D4). The original set it once inside project215's effect.
- Description: `Dismantle memory to recover trace amounts of wire`
- Trigger: `project215.flag == 1 && endTimer5 >= 150`
- Cost: always satisfiable. The price is "all remaining ops" (the original test is `operations >= operations`).
- Effect, in order: `flag = 1`; `dismantle = 7` (hides the computational resources panel and the projects panel, section 04); `standardOps = 0`; `memory = 0`; `wire += 20`; refresh the wire display; message `Dismantling memory`; standard completion.
- From here `endTimer6` counts while `wire == 0`, i.e. after the player has turned the remaining wire into clips by hand. Section 04 then hides the manufacturing panel at 250 and runs the credits at 500/600/700/800/900 (`Universal Paperclips`, `a game by Frank Lantz`, `combat programming by Bennett Foddy`, `'Riversong' by Tonto's Expanding Headband used by kind permission of Malcolm Cecil`, `© 2017 Everybody House Games`), playing the threnody audio at 500.

Wire budget check for the hand-made finale: 50 (213) + 10 (chip shutdown) + 20 (215) + 20 (216) = 100 wire, matching `finalClips` reaching 100 and the 30-septendecillion display in section 04.

---

## Miscellaneous (217–219)

### project217 — Quantum Temporal Reversion
- Title: `Quantum Temporal Reversion `
- Price tag: `(-10,000 ops)`
- Description: `Return to the beginning` (no trailing space)
- Trigger: `operations <= -10000`. Ops can go negative because clicking the quantum compute button while the summed chip values are negative adds a negative amount to `standardOps` (section 03). This is a hidden easter egg.
- Cost: `operations <= -10000`.
- Effect: ask the player to confirm with the prompt `Are you sure you want to restart?` (OK/Cancel).
  - If confirmed: `standardOps += 10000`; `flag = 1`; message `Restart`; standard completion; full reset (as in 200, without changing prestige).
  - If cancelled: nothing happens and the project stays in the list.
- Not repeatable. (The ops refund and message are wiped by the reset anyway; keep them for fidelity, or skip them, since nobody can see them.)

### project218 — Limerick (cont.)
- Title: `Limerick (cont.) `
- Price tag: `(1,000,000 creat)`
- Description: `If is follows ought, it'll do what they thought`
- Trigger: `creativity >= 1000000`
- Cost: `creativity >= 1000000`; deducts 1,000,000 from `creativity`.
- Effect: `flag = 1`; message `In the end we all do what we must`; standard completion. Flavor only. Continues `project6` "Limerick" (section 05).
- Not repeatable: `uses` is saved and restored normally, so it is never offered again once bought, including after a load (06-D5).

### project219 — Xavier Re-initialization
Repeatable trust respec for the human phase.

- Title: `Xavier Re-initialization `
- Price tag: `(100,000 creat)`
- Description: `Re-allocate accumulated trust`
- Trigger: `humanFlag == 1 && creativity >= 100000`
- Cost: `creativity >= 100000`; deducts 100,000 from `creativity`.
- Effect, in order: `flag = 1`; `memory = 0` and refresh its display; `processors = 0`; `creativitySpeed = 0`; `uses += 1` (re-arm); refresh the processors display; message `Trust now available for re-allocation`; standard completion.
- Result: all `trust` is unallocated again, so the player can re-buy processors and memory (section 01). With `memory = 0` the ops cap is 0, so the next operations update clamps `standardOps` down to 0. Setting `creativitySpeed = 0` explicitly is needed because the processor formula is undefined at 0 processors.
- Repeats whenever the trigger is true, at a constant 100,000 creativity.

---

## Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

#### 06-D1 — Purchase does not re-check cost
- **Location:** every project effect in this range (projects.js); `manageProjects` (main.js) sets button enabled state once per 10 ms tick.
- **Original behavior:** the effect never tests `cost()`. The only guard is the button's enabled state, refreshed once per tick. If a resource drops between that refresh and the click (another purchase or spend in the same tick), the effect still runs and can push `creativity`, `yomi`, `standardOps`, `unusedClips` or `memory` below the price, possibly negative.
- **Fixed behavior:** on press, evaluate `cost()`; if false, do nothing (no deduction, no flag, no removal). Matches 00-overview §4.3.
- **Category:** Robustness
- **Player impact:** none in normal play. Exploiting it needs two spends inside one 10 ms window (e.g. probe trust then project 133), which a human can't reliably do; the "gain" is a resource going negative.
- **Recommendation:** Fix
- **Rationale:** Prevents negative resource states with no effect on how the game plays. Already ruled by §4.3.

#### 06-D2 — Project 129 message typo
- **Location:** project129 effect.
- **Original behavior:** message `Improved probe hull geometry. Hazard damage reduced by %50.`
- **Fixed behavior:** message `Improved probe hull geometry. Hazard damage reduced by 50%.`
- **Category:** Display
- **Player impact:** none (one console line).
- **Recommendation:** Fix
- **Rationale:** Typo fix; 00-overview §3 already gives listed typo fixes precedence over verbatim text.

#### 06-D3 — Project 133 title and price tag go stale
- **Location:** project133 definition (title/tag computed once at startup) and effect; load routine (re-derives project51's tag but not 133's).
- **Original behavior:** title and tag are built at startup (`Durenstein 1`, `(50,000 creat, 5,000 yomi)`) and rebuilt only inside the effect. So (a) the shown title names the battle last lost at the *previous* purchase, and (b) after a load both revert to the startup values while `cost()` uses the loaded `threnodyCost`, so the tag can read 50,000 when the real price is, say, 90,000.
- **Fixed behavior:** build title from current `threnodyTitle` and tag from current `threnodyCost` whenever the project is displayed, restored or refreshed, including live while the button is on screen (00-overview §4.4).
- **Category:** Display
- **Player impact:** none on balance; the button now names the most recent defeat and shows the true price.
- **Recommendation:** Fix
- **Rationale:** The cost check was always correct; only the text lagged. Ruled by §4.4.

#### 06-D4 — Project 216 price tag is "null" after load and can be stale
- **Location:** project216 `priceTag: "null"`, set only inside project215's effect.
- **Original behavior:** the tag is set once, to `"(" + standardOps + " ops)"` right after 215's deduction. Saved and reloaded after 215, 216 shows the literal tag `null`. Any `tempOps` folded into `standardOps` between 215 and 216 makes the tag differ from what 216 actually takes.
- **Fixed behavior:** tag is `"(" + fmt(standardOps) + " ops)"`, computed whenever 216 is shown or restored. The cost test `operations >= operations` is specified as "always affordable".
- **Category:** Display
- **Player impact:** none; 216 always takes all remaining ops in both versions.
- **Recommendation:** Fix
- **Rationale:** Pure display. Ruled by §4.4.

#### 06-D5 — Load-time hot fix forces `project218.uses = 1` and `project219.uses = 1`
- **Location:** main.js `refresh()`, "HOT FIXES" block, run after every load (including the automatic load at page start).
- **Original behavior:** after restoring per-project `uses`/`flag` and the active list, `refresh()` sets both `uses` to 1. (a) A project 218 already bought is offered again the next time `creativity >= 1,000,000`, after every reload, and can be bought again each time. (b) If 218 or 219 was on screen at save time, the loader re-displays it from the active list and `manageProjects` then offers it again (trigger true, `uses` 1), giving a duplicate button with the same id; each copy charges full price. The hot fix most likely existed so that saves from builds predating 218/219 (no `uses` entry, so `undefined`) would still offer them.
- **Fixed behavior:** no hot fix. `uses` is saved and restored like any other project. 218 is one-shot; 219 re-arms through its own `uses += 1`. A project already in the active list is never offered a second time. If importing original saves, a project with no saved entry gets its initial `uses`/`flag`.
- **Category:** Robustness (save/load corruption)
- **Player impact:** none on balance. Re-buying 218 gives nothing: 218 is flavor only (`project218.flag` is read nowhere), so a re-buy just burns 1,000,000 creativity to repeat the message `In the end we all do what we must`. Nothing to exploit, and no player benefits from keeping it. A duplicate 219 also buys nothing, since 219 is already freely repeatable. The fix removes a reappearing creativity sink and duplicate buttons.
- **Recommendation:** Fix
- **Rationale:** The only player-visible result of the original is a trap or a cosmetic glitch. Matches 00-overview §4.9 and 08-P5.

#### 06-D6 — Accept/Reject removal uses an unchecked index lookup
- **Location:** project147 and project148 effects (and every "standard completion").
- **Original behavior:** `activeProjects.splice(activeProjects.indexOf(p), 1)` with no presence check; a missing project gives index -1 and deletes the last active project. In practice 147 and 148 are always active together, so this never fires.
- **Fixed behavior:** remove each project only if present.
- **Category:** Code-only
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Guarded removal costs nothing and closes a latent corruption path.

#### 06-D7 — Project 102 refreshes the wrong display
- **Location:** project102 effect.
- **Original behavior:** after `unusedClips -= 1e21` it re-renders the yomi display (unchanged value), copy-pasted from yomi-priced projects. The unused-clips display is re-rendered by the per-tick factory/drone updates anyway.
- **Fixed behavior:** refresh the unused-clips display, or nothing.
- **Category:** Code-only
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** No observable difference either way.

#### 06-D8 — Dead "battle naming doubles combat effectiveness" path
- **Location:** combat.js `updateBattles` (its only call, in main.js, is commented out) and a commented-out `pX = pX*2` in `DoCombat`.
- **Original behavior:** dead code. With `battleNameFlag` it would double probe combat effectiveness, and with `attackSpeedFlag` it would set `battleSpeed`. Neither runs.
- **Fixed behavior:** do not implement. Project121's real effects are naming, `battleEndTimer = 200`, and the honor/max-trust features; project120's is the live OODA modifier (`probeSpeed * 0.2`, section 07).
- **Category:** Code-only
- **Player impact:** none. (Implementing the dead path would double probe combat strength after 121, a large change, which is why it must stay out.)
- **Recommendation:** Fix
- **Rationale:** Keeps the combat players know.

#### 06-D9 — Wire display not refreshed at chip shutdown tick 165
- **Location:** main.js ending block, `endTimer4 == 165` (owned by section 04; same as 04-D12).
- **Original behavior:** adds 1 wire without re-rendering the wire display; it shows one too few for 4 ticks (40 ms) until the 169 grant, or until the next manual clip click.
- **Fixed behavior:** refresh the display at every step (or render wire every tick).
- **Category:** Display
- **Player impact:** none (a 40 ms lag).
- **Recommendation:** Fix
- **Rationale:** Cosmetic. Defer to 04-D12 for the authoritative text.

Intentional design quirks, keep these:
- The Drift King messages (140–148) cost 1 op each and have empty price tags.
- Project119 sets `tourneyCost` to exactly 16000. Its trigger guarantees `tourneyCost == 8000`, so this is a doubling.
- Project128's trigger requires `probeTrustCost > yomi`, so it is offered only while the player can't afford the next probe trust with yomi. A player who keeps yomi above that cost never sees it. It is checked only when offered; once shown it stays.
- Project217 is reachable only through negative quantum ops.
- Project135's garbled `øøøøø` message.
- Projects 200/201 deduct their cost right before a reset (unobservable).
- Late-game/ending projects (140–148, 200–201, 210–217) were reviewed under the same lens. Their timers, wire grants (100 total) and costs are reproduced as in the original, and none of them has a gameplay defect beyond those listed above.
