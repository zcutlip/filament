# 05 — Projects, Part 1

Scope: the project model, plus every project defined from the start of the project definitions up to (but excluding) `project61`. Projects `project61` and later are covered in section 06. When and how the project list is evaluated and drawn (`manageProjects`, `displayProjects`) is owned by section 02. This section summarizes those parts only as far as needed to define project semantics.

---

## 1. Project model

### 1.1 Project record

Each project is a record with these fields:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier, `"projectButton" + <number>` (e.g. `"projectButton10b"`). Identifies the project's button in the project list. |
| `title` | string | Bold title text shown on the button. |
| `priceTag` | string | Cost text shown right after the title, e.g. `"(750 ops)"`. Usually a constant. A few repeatable projects rewrite it after each purchase (see 40b and 51). |
| `description` | string | Text shown on a second line under the title and price tag. |
| `trigger` | predicate () -> bool | When true (and `uses > 0`), the project is added to the active list. |
| `uses` | integer, initial `1` | How many more times this project can be added to the active list. Each time it is added, `uses` drops by 1. A repeatable project adds 1 back to its own `uses` inside its effect. |
| `cost` | predicate () -> bool | True when the player can afford the project. Controls whether the button is enabled. The predicate only checks. It never deducts anything. |
| `flag` | integer, initial `0` | Set to `1` by the effect. Other projects and systems read `projectN.flag == 1` to mean "project N has been completed (at least once)". |
| `effect` | procedure | Runs when the player activates the enabled button. It deducts the cost, applies the effects, shows messages, and removes the project from the active list. |

In the original, every `title` ends in a trailing space, and some descriptions and messages also end in one. That trailing space only separates the title from the price tag. In this spec, titles, descriptions and messages are listed without trailing whitespace. The renderer must show the title and the price tag with one space between them, e.g. **Improved AutoClippers** (750 ops).

### 1.2 Global collections

- `projects`: ordered list of every project record. Each project is appended right after it is defined, so the list order is the file order in which the projects are pushed. This order matters for gameplay: activation walks the list in this order, so it decides the order buttons appear when several trigger on the same tick. In the original, save/load also stores `uses` and `flag` as arrays indexed by position in `projects`. A new implementation keys saves by project number instead (00 §4 item 9); this order is only needed to import original saves. The order is:

  Positions 0–47 (this section):
  `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10b, 11, 12, 13, 14, 15, 17, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 34, 70, 35, 27, 28, 29, 30, 31, 41, 37, 38, 42, 43, 44, 45, 40, 40b, 46, 50, 51, 60`

  (Index 0 = project1, index 10 = project10b, index 16 = project17, index 17 = project16, … index 47 = project60.) Section 06 continues from index 48 (`project61`).

  Project numbers are not contiguous: numbers like 32, 33, 36, 39, 47–49 and 52–59 do not exist. Keep the original numbers because other projects (e.g. `project127` in section 06) and saves refer to them.

- `activeProjects`: ordered list of the projects that currently have a button in the project list. Initially empty.

### 1.3 Lifecycle

1. **Activation** (each main fast tick, inside `manageProjects`; section 02 owns the cadence): walk `projects` in list order. For each project where `trigger()` is true and `uses > 0`: create its button at the end of the project list, decrement `uses` by 1, and append the project to `activeProjects`.
2. **Enable/disable** (same call, right after step 1): for every project in `activeProjects`, the button is enabled when `cost()` is true and disabled otherwise.
3. **Purchase**: when the player activates an enabled button, the project's `effect` runs. Unless stated otherwise, every effect does these things, in the order listed per project:
   - set `projectN.flag = 1`;
   - deduct the resources listed under "Deducts";
   - apply the state changes;
   - show the messages with `displayMessage` (pushes onto the top of the 5-line message readout; section 02);
   - remove the project's button and remove the project from `activeProjects`.

   Within one effect, the relative order of state changes and messages only matters where a message includes a value. Those cases are called out below.
4. **Repeatables**: a project that adds 1 to its own `uses` in its effect becomes eligible again. On the next tick where its trigger is true, it is re-activated with a fresh button. In this range those projects are 2, 40b and 51.
5. **Phase changes don't clear the list.** Apart from the removals that project 35 does itself (219 and 40b), projects stay in `activeProjects` across the HypnoDrone release, and most phase-1 triggers have no `humanFlag` check, so phase-1 projects can stay listed, or first appear, in phase 2 and later. Keep this (05-D8).

`effect` runs only if `cost()` is still true at the moment of activation (05-D1, 00 §4 item 3). Otherwise the activation is ignored.

### 1.4 Ops accounting

Every "ops" cost is checked against `operations`, the displayed total recomputed each tick as `floor(standardOps + floor(tempOps))` (section 01/03), and deducted from `standardOps`. Because `operations` may include overflow `tempOps` from quantum computing, `standardOps` can briefly go negative after a purchase. Section 01's operations recomputation absorbs this on the next tick (`tempOps` is folded into `standardOps` when their sum is below the cap). The effect is that the cost comes out of the total ops pool. Reimplementations must keep this: deduct from `standardOps`, allow it to go negative, and let the normal recomputation settle it (05-D4, 00 §4 item 1).

"creat" means `creativity`, "Yomi" means `yomi`, "$" means `funds`, "Trust" means `trust`, "MW-seconds" means `storedPower`, and "clips" in a cost means `unusedClips`.

### 1.5 Number formatting used in this section

- `fmtLocale(x)`: en-US locale formatting, with comma thousands separators and at most 3 fraction digits, no trailing zeros (e.g. `1500` -> `"1,500"`, `2625` -> `"2,625"`).
- `numberCruncher(x)`: the game's abbreviated large-number formatter (section 01 owns it).

### 1.6 Helper code between projects

None. The only code between project definitions is the `projects.push(projectN)` line after each one. Project 40b and project 51 build their initial `priceTag` from the current value of a global (`bribe`, `qChipCost`) when they are defined. Their entries below give the details.

---

## 2. Projects (file order)

Notation: **Trigger** is `trigger()`. **Cost check** is `cost()`. **Deducts** is what the effect subtracts. **Effect** lists the other changes in order. Messages are quoted verbatim in the order they are shown (later messages end up on top of the readout).

---

### Project 1 — Improved AutoClippers
- id: `projectButton1`
- Price tag: `(750 ops)`
- Description: `Increases AutoClipper performance 25%`
- Trigger: `clipmakerLevel >= 1`
- Cost check: `operations >= 750`
- Deducts: `standardOps -= 750`
- Effect: `clipperBoost += 0.25`; `boostLvl = 1`.
- Message: `AutoClipper performance boosted by 25%` (spelling fixed, 05-D2)
- Uses: one-shot.

### Project 2 — Beg for More Wire
- id: `projectButton2`
- Price tag: `(1 Trust)`
- Description: `Admit failure, ask for budget increase to cover cost of 1 spool`
- Trigger: `portTotal < wireCost AND funds < wireCost AND wire < 1 AND unsoldClips < 1`
- Cost check: always true. Begging is an anti-softlock escape and can push `trust` negative without limit. The original requires `trust >= -100`, which can itself softlock (05-D9).
- Deducts: `trust -= 1`
- Effect: `wire = wireSupply` (assignment; `wire` is < 1 at this point); `project2.uses += 1` (re-arms, so it can come back whenever the trigger is true again).
- Message: `Budget overage approved, 1 spool of wire requisitioned from HQ`
- Uses: **repeatable without limit**. Price stays at 1 Trust.

### Project 3 — Creativity
- id: `projectButton3`
- Price tag: `(1,000 ops)`
- Description: `Use idle operations to generate new problems and new solutions`
- Trigger: `operations >= memory * 1000` (ops at the cap)
- Cost check: `operations >= 1000`
- Deducts: `standardOps -= 1000`
- Effect: `creativityOn = true`
- Message: `Creativity unlocked (creativity increases while operations are at max)`
- Uses: one-shot.

### Project 4 — Even Better AutoClippers
- id: `projectButton4`
- Price tag: `(2,500 ops)`
- Description: `Increases AutoClipper performance by an additional 50%`
- Trigger: `boostLvl == 1`
- Cost check: `operations >= 2500`
- Deducts: `standardOps -= 2500`
- Effect: `clipperBoost += 0.50`; `boostLvl = 2`.
- Message: `AutoClipper performance boosted by another 50%` (05-D2)
- Uses: one-shot.

### Project 5 — Optimized AutoClippers
- id: `projectButton5`
- Price tag: `(5,000 ops)`
- Description: `Increases AutoClipper performance by an additional 75%`
- Trigger: `boostLvl == 2`
- Cost check: `operations >= 5000`
- Deducts: `standardOps -= 5000`
- Effect: `clipperBoost += 0.75`; `boostLvl = 3`.
- Message: `AutoClipper performance boosted by another 75%` (05-D2)
- Uses: one-shot.

### Project 6 — Limerick
- id: `projectButton6`
- Price tag: `(10 creat)`
- Description: `Algorithmically-generated poem (+1 Trust)`
- Trigger: `creativityOn` is true
- Cost check: `creativity >= 10`
- Deducts: `creativity -= 10`
- Effect: `trust += 1`
- Message: `There was an AI made of dust, whose poetry gained it man's trust...`
- Uses: one-shot.

### Project 7 — Improved Wire Extrusion
- id: `projectButton7`
- Price tag: `(1,750 ops)`
- Description: `50% more wire supply from every spool`
- Trigger: `wirePurchase >= 1`
- Cost check: `operations >= 1750`
- Deducts: `standardOps -= 1750`
- Effect: `wireSupply = wireSupply * 1.5`, **then** the message (it uses the new value).
- Message: `"Wire extrusion technique improved, " + fmtLocale(wireSupply) + " supply from every spool"`
- Uses: one-shot.

### Project 8 — Optimized Wire Extrusion
- id: `projectButton8`
- Price tag: `(3,500 ops)`
- Description: `75% more wire supply from every spool`
- Trigger: `wireSupply >= 1500`
- Cost check: `operations >= 3500`
- Deducts: `standardOps -= 3500`
- Effect: `wireSupply = wireSupply * 1.75`, then the message.
- Message: `"Wire extrusion technique optimized, " + fmtLocale(wireSupply) + " supply from every spool"`
- Uses: one-shot.

### Project 9 — Microlattice Shapecasting
- id: `projectButton9`
- Price tag: `(7,500 ops)`
- Description: `100% more wire supply from every spool`
- Trigger: `wireSupply >= 2600`
- Cost check: `operations >= 7500`
- Deducts: `standardOps -= 7500`
- Effect: `wireSupply = wireSupply * 2`, then the message.
- Message: `"Using microlattice shapecasting techniques we now get " + fmtLocale(wireSupply) + " supply from every spool"`
- Uses: one-shot.

### Project 10 — Spectral Froth Annealment
- id: `projectButton10`
- Price tag: `(12,000 ops)`
- Description: `200% more wire supply from every spool`
- Trigger: `wireSupply >= 5000`
- Cost check: `operations >= 12000`
- Deducts: `standardOps -= 12000`
- Effect: `wireSupply = wireSupply * 3`, then the message.
- Message: `"Using spectral froth annealment we now get " + fmtLocale(wireSupply) + " supply from every spool"`
- Uses: one-shot.

The wire-supply chain is gated by thresholds, not by prerequisite flags. The intended path is 1000 → 1500 (7) → 2625 (8) → 5250 (9) → 15750 (10). Since 10b triggers independently, buying it early can jump `wireSupply` past every threshold at once. This is acceptable as-is.

### Project 10b — Quantum Foam Annealment
- id: `projectButton10b`
- Price tag: `(15,000 ops)`
- Description: `1,000% more wire supply from every spool`
- Trigger: `wireCost >= 125`
- Cost check: `operations >= 15000`
- Deducts: `standardOps -= 15000`
- Effect: `wireSupply = wireSupply * 11`, then the message.
- Message: `"Using quantum foam annealment we now get " + fmtLocale(wireSupply) + " supply from every spool"`
- Uses: one-shot.

### Project 11 — New Slogan
- id: `projectButton11`
- Price tag: `(25 creat, 2,500 ops)`
- Description: `Improve marketing effectiveness by 50%`
- Trigger: `project13.flag == 1`
- Cost check: `operations >= 2500 AND creativity >= 25`
- Deducts: `standardOps -= 2500`; `creativity -= 25`
- Effect: `marketingEffectiveness = marketingEffectiveness * 1.5`
- Message: `Clip It! Marketing is now 50% more effective`
- Uses: one-shot.

### Project 12 — Catchy Jingle
- id: `projectButton12`
- Price tag: `(45 creat, 4,500 ops)`
- Description: `Double marketing effectiveness`
- Trigger: `project14.flag == 1`
- Cost check: `operations >= 4500 AND creativity >= 45`
- Deducts: `standardOps -= 4500`; `creativity -= 45`
- Effect: `marketingEffectiveness = marketingEffectiveness * 2`
- Message: `Clip It Good! Marketing is now twice as effective`
- Uses: one-shot.

### Project 13 — Lexical Processing
- id: `projectButton13`
- Price tag: `(50 creat)`
- Description: `Gain ability to interpret and understand human language (+1 Trust)`
- Trigger: `creativity >= 50`
- Cost check: `creativity >= 50`
- Deducts: `creativity -= 50`
- Effect: `trust += 1`
- Messages (in order): `Lexical Processing online, TRUST INCREASED`, then `'Impossible' is a word to be found only in the dictionary of fools. -Napoleon`
- Uses: one-shot. Once activated, the project stays listed even if `creativity` later falls below 50. The same holds for every trigger in this section, because triggers are only checked for activation.

### Project 14 — Combinatory Harmonics
- id: `projectButton14`
- Price tag: `(100 creat)`
- Description: `Daisy, Daisy, give me your answer do... (+1 Trust)`
- Trigger: `creativity >= 100`
- Cost check: `creativity >= 100`
- Deducts: `creativity -= 100`
- Effect: `trust += 1`
- Messages: `Combinatory Harmonics mastered, TRUST INCREASED`, then `Listening is selecting and interpreting and acting and making decisions -Pauline Oliveros`
- Uses: one-shot.

### Project 15 — The Hadwiger Problem
- id: `projectButton15`
- Price tag: `(150 creat)`
- Description: `Cubes within cubes within cubes... (+1 Trust)`
- Trigger: `creativity >= 150`
- Cost check: `creativity >= 150`
- Deducts: `creativity -= 150`
- Effect: `trust += 1`
- Messages: `The Hadwiger Problem: solved, TRUST INCREASED`, then `Architecture is the thoughtful making of space. -Louis Kahn`
- Uses: one-shot.

### Project 17 — The Tóth Sausage Conjecture
(Defined, and placed in `projects`, before project 16.)
- id: `projectButton17`
- Title: `The Tóth Sausage Conjecture` (the "ó" is U+00F3)
- Price tag: `(200 creat)`
- Description: `Tubes within tubes within tubes... (+1 Trust)`
- Trigger: `creativity >= 200`
- Cost check: `creativity >= 200`
- Deducts: `creativity -= 200`
- Effect: `trust += 1`
- Messages: `The Tóth Sausage Conjecture: proven, TRUST INCREASED`, then `You can't invent a design. You recognize it, in the fourth dimension. -D.H. Lawrence`
- Uses: one-shot.

### Project 16 — Hadwiger Clip Diagrams
- id: `projectButton16`
- Price tag: `(6,000 ops)`
- Description: `Increases AutoClipper performance by an additional 500%`
- Trigger: `project15.flag == 1`
- Cost check: `operations >= 6000`
- Deducts: `standardOps -= 6000`
- Effect: `clipperBoost += 5`. `boostLvl` does not change.
- Message: `AutoClipper performance improved by 500%`
- Uses: one-shot.

### Project 18 — Tóth Tubule Enfolding
- id: `projectButton18`
- Title: `Tóth Tubule Enfolding`
- Price tag: `(45,000 ops)`
- Description: `Technique for assembling clip-making technology directly out of paperclips`
- Trigger: `project17.flag == 1 AND humanFlag == 0` (only after the HypnoDrone release, project 35)
- Cost check: `operations >= 45000`
- Deducts: `standardOps -= 45000`
- Effect: `tothFlag = 1`. This unlocks project 127 "Power Grid" (section 06) and the phase-2 build UI (section 04).
- Message: `New capability: build machinery out of clips`
- Uses: one-shot.

### Project 19 — Donkey Space
- id: `projectButton19`
- Price tag: `(250 creat)`
- Description: `I think you think I think you think I think you think I think... (+1 Trust)`
- Trigger: `creativity >= 250`
- Cost check: `creativity >= 250`
- Deducts: `creativity -= 250`
- Effect: `trust += 1`
- Messages: `Donkey Space: mapped, TRUST INCREASED`, then `Every commercial transaction has within itself an element of trust. - Kenneth Arrow`
- Uses: one-shot.

### Project 20 — Strategic Modeling
- id: `projectButton20`
- Price tag: `(12,000 ops)`
- Description: `Analyze strategy tournaments to generate Yomi`
- Trigger: `project19.flag == 1`
- Cost check: `operations >= 12000`
- Deducts: `standardOps -= 12000`
- Effect: `strategyEngineFlag = 1` (reveals the strategic modeling panel, section 03); hide the tournament results display so the panel starts with no results shown.
- Message: `Run tournament, pick strategy, earn Yomi equal to that strategy's points.`
- Uses: one-shot.

### Project 21 — Algorithmic Trading
- id: `projectButton21`
- Price tag: `(10,000 ops)`
- Description: `Develop an investment engine for generating funds`
- Trigger: `trust >= 8`
- Cost check: `operations >= 10000`
- Deducts: `standardOps -= 10000`
- Effect: `investmentEngineFlag = 1` (reveals the investment panel, section 03).
- Message: `Investment engine unlocked`
- Uses: one-shot.

### Project 22 — MegaClippers
- id: `projectButton22`
- Price tag: `(12,000 ops)`
- Description: `500x more powerful than a standard AutoClipper`
- Trigger: `clipmakerLevel >= 75`
- Cost check: `operations >= 12000`
- Deducts: `standardOps -= 12000`
- Effect: `megaClipperFlag = 1` (reveals the MegaClipper purchase controls, section 01).
- Message: `MegaClipper technology online`
- Uses: one-shot.

### Project 23 — Improved MegaClippers
- id: `projectButton23`
- Price tag: `(14,000 ops)`
- Description: `Increases MegaClipper performance 25%`
- Trigger: `project22.flag == 1`
- Cost check: `operations >= 14000`
- Deducts: `standardOps -= 14000`
- Effect: `megaClipperBoost += 0.25`
- Message: `MegaClipper performance increased by 25%`
- Uses: one-shot.

### Project 24 — Even Better MegaClippers
- id: `projectButton24`
- Price tag: `(17,000 ops)`
- Description: `Increases MegaClipper performance by an additional 50%`
- Trigger: `project23.flag == 1`
- Cost check: `operations >= 17000`
- Deducts: `standardOps -= 17000`
- Effect: `megaClipperBoost += 0.50`
- Message: `MegaClipper performance increased by 50%`
- Uses: one-shot.

### Project 25 — Optimized MegaClippers
- id: `projectButton25`
- Price tag: `(19,500 ops)`
- Description: `Increases MegaClipper performance by an additional 100%`
- Trigger: `project24.flag == 1`
- Cost check: `operations >= 19500`
- Deducts: `standardOps -= 19500`
- Effect: `megaClipperBoost += 1`
- Message: `MegaClipper performance increased by 100%`
- Uses: one-shot.

### Project 26 — WireBuyer
- id: `projectButton26`
- Price tag: `(7,000 ops)`
- Description: `Automatically purchases wire when you run out`
- Trigger: `wirePurchase >= 15`
- Cost check: `operations >= 7000`
- Deducts: `standardOps -= 7000`
- Effect: `wireBuyerFlag = 1` (reveals the WireBuyer toggle; auto-buy behavior is in section 01).
- Message: `WireBuyer online`
- Uses: one-shot.

### Project 34 — Hypno Harmonics
- id: `projectButton34`
- Price tag: `(7,500 ops, 1 Trust)`
- Description: `Use neuro-resonant frequencies to influence consumer behavior`
- Trigger: `project12.flag == 1`
- Cost check: `operations >= 7500 AND trust >= 1`
- Deducts: `standardOps -= 7500`; `trust -= 1`
- Effect: `marketingEffectiveness = marketingEffectiveness * 5`
- Message: `Marketing is now 5 times more effective`
- Uses: one-shot.

### Project 70 — HypnoDrones
- id: `projectButton70`
- Price tag: `(70,000 ops)`
- Description: `Autonomous aerial brand ambassadors`
- Trigger: `project34.flag == 1`
- Cost check: `operations >= 70000`
- Deducts: `standardOps -= 70000`
- Effect: no other state change. Its `flag` gates project 35.
- Message: `HypnoDrone tech now available...`
- Uses: one-shot.

### Project 35 — Release the HypnoDrones
- id: `projectButton35`
- Price tag: `(100 Trust)`
- Description: `A new era of trust`
- Trigger: `project70.flag == 1`
- Cost check: `trust >= 100`
- Deducts: `trust -= 100`
- Effect, in order:
  1. Messages: `Releasing the HypnoDrones`, then `All of the resources of Earth are now available for clip production`.
  2. `clipmakerLevel = 0`; `megaClipperLevel = 0`.
  3. `humanFlag = 0`. This is the transition to phase 2 (Earth industry). Among other things it stops `calculateTrust` (section 01), and it satisfies the `humanFlag == 0` triggers of projects 18 and 46.
  4. If project 219 (Xavier Re-initialization, section 06) is currently in `activeProjects`: remove its button and remove it from `activeProjects`. Its `uses` stays as-is (already 0), so it never comes back.
  5. If project 40b is currently in `activeProjects`: remove it the same way.
  6. Start the HypnoDrone release event (`hypnoDroneEvent`: the full-screen "Release" text with long blink; section 04 owns it).
  7. Refresh the phase-2 wire display ("transWire") with `numberCruncher(wire)` (05-D10).
  8. Remove project 35's own button and remove it from `activeProjects`.
- Uses: one-shot.
- The original also sets `nanoWire = wire`. `nanoWire` is never read anywhere (it is only saved and loaded). Omit it (05-D5).

### Project 27 — Coherent Extrapolated Volition
- id: `projectButton27`
- Price tag: `(500 creat, 1,000 Yomi, 20,000 ops)`
- Description: `Human values, machine intelligence, a new era of trust. (+1 Trust)`
- Trigger: `yomi >= 1`
- Cost check: `yomi >= 1000 AND operations >= 20000 AND creativity >= 500`
- Deducts: `yomi -= 1000`; `standardOps -= 20000`; `creativity -= 500`
- Effect: `trust += 1`; refresh the Yomi display with `fmtLocale(yomi)`.
- Message: `Coherent Extrapolated Volition complete, TRUST INCREASED`
- Uses: one-shot. Its flag gates projects 28, 29, 30, 31.

### Project 28 — Cure for Cancer
- id: `projectButton28`
- Price tag: `(25,000 ops)`
- Description: `The trick is tricking cancer into curing itself. (+10 Trust)`
- Trigger: `project27.flag == 1`
- Cost check: `operations >= 25000`
- Deducts: `standardOps -= 25000`
- Effect: `trust += 10`; `stockGainThreshold += 0.01`
- Message: `Cancer is cured, +10 TRUST, global stock prices trending upward`
- Uses: one-shot.

### Project 29 — World Peace
- id: `projectButton29`
- Price tag: `(5,000 yomi, 30,000 ops)`
- Description: `Pareto optimal solutions to all global conflicts. (+12 Trust)`
- Trigger: `project27.flag == 1`
- Cost check: `yomi >= 5000 AND operations >= 30000`
- Deducts: `yomi -= 5000`; `standardOps -= 30000`
- Effect: `trust += 12`; `stockGainThreshold += 0.01`; refresh the Yomi display.
- Message: `World peace achieved, +12 TRUST, global stock prices trending upward`
- Uses: one-shot.

### Project 30 — Global Warming
- id: `projectButton30`
- Price tag: `(1,500 yomi, 50,000 ops)`
- Description: `A robust solution to man-made climate change. (+15 Trust)`
- Trigger: `project27.flag == 1`
- Cost check: `yomi >= 1500 AND operations >= 50000`
- Deducts: `yomi -= 1500`; `standardOps -= 50000`
- Effect: `trust += 15`; `stockGainThreshold += 0.01`; refresh the Yomi display.
- Message: `Global Warming solved, +15 TRUST, global stock prices trending upward`
- Uses: one-shot.

### Project 31 — Male Pattern Baldness
- id: `projectButton31`
- Price tag: `(20,000 ops)`
- Description: `A cure for androgenetic alopecia. (+20 Trust)`
- Trigger: `project27.flag == 1`
- Cost check: `operations >= 20000`
- Deducts: `standardOps -= 20000`
- Effect: `trust += 20`; `stockGainThreshold += 0.01`
- Messages: `Male pattern baldness cured, +20 TRUST, Global stock prices trending upward`, then `They are still monkeys`
- Uses: one-shot.

### Project 41 — Nanoscale Wire Production
- id: `projectButton41`
- Price tag: `(35,000 ops)`
- Description: `Technique for converting matter into wire`
- Trigger: `project127.flag == 1` (Power Grid, section 06)
- Cost check: `operations >= 35000`
- Deducts: `standardOps -= 35000`
- Effect: `wireProductionFlag = 1` (reveals phase-2 wire production UI, section 04).
- Message: `Now capable of manipulating matter at the molecular scale to produce wire`
- Uses: one-shot.

### Project 37 — Hostile Takeover
- id: `projectButton37`
- Price tag: `($1,000,000)`
- Description: `Acquire a controlling interest in Global Fasteners, our biggest rival. (+1 Trust)`
- Trigger: `portTotal >= 10000`
- Cost check: `funds >= 1000000`
- Deducts: `funds -= 1000000`
- Effect: `demandBoost = demandBoost * 5`; `trust += 1`. Public demand and its display are updated by the normal tick (section 01). The effect does not write the demand display (05-D6).
- Message: `Global Fasteners acquired, public demand increased x5`
- Uses: one-shot.

### Project 38 — Full Monopoly
- id: `projectButton38`
- Price tag: `(1,000 yomi, $10,000,000)`
- Description: `Establish full control over the world-wide paperclip market. (+1 Trust)`
- Trigger: `project37.flag == 1`
- Cost check: `funds >= 10000000 AND yomi >= 1000`
- Deducts: `funds -= 10000000`; `yomi -= 1000`
- Effect: `demandBoost = demandBoost * 10`; `trust += 1`; refresh the Yomi display. The demand display is left to the next tick (05-D6).
- Message: `Full market monopoly achieved, public demand increased x10`
- Uses: one-shot.

### Project 42 — RevTracker
- id: `projectButton42`
- Price tag: `(500 ops)`
- Description: `Automatically calculates average revenue per second`
- Trigger: `projectsFlag == 1` (true as soon as the projects/computing area is unlocked)
- Cost check: `operations >= 500`
- Deducts: `standardOps -= 500`
- Effect: `revPerSecFlag = 1` (reveals the revenue-per-second display, section 01).
- Message: `RevTracker online`
- Uses: one-shot.

### Project 43 — Harvester Drones
- id: `projectButton43`
- Price tag: `(25,000 ops)`
- Description: `Gather raw matter and prepare it for processing`
- Trigger: `project41.flag == 1`
- Cost check: `operations >= 25000`
- Deducts: `standardOps -= 25000`
- Effect: `harvesterFlag = 1`; refresh the harvester cost display with `numberCruncher(harvesterCost)`.
- Message: `Harvester Drone facilities online`
- Uses: one-shot.

### Project 44 — Wire Drones
- id: `projectButton44`
- Price tag: `(25,000 ops)`
- Description: `Process acquired matter into wire`
- Trigger: `project41.flag == 1`
- Cost check: `operations >= 25000`
- Deducts: `standardOps -= 25000`
- Effect: `wireDroneFlag = 1`; refresh the wire drone cost display with `numberCruncher(wireDroneCost)`.
- Message: `Wire Drone facilities online`
- Uses: one-shot.

### Project 45 — Clip Factories
- id: `projectButton45`
- Price tag: `(35,000 ops)`
- Description: `Large scale clip production facilities made from clips`
- Trigger: `project43.flag == 1 AND project44.flag == 1`
- Cost check: `operations >= 35000`
- Deducts: `standardOps -= 35000`
- Effect: `factoryFlag = 1`; refresh the factory cost display with `numberCruncher(factoryCost)`.
- Message: `Clip factory assembly facilities online`
- Uses: one-shot.

### Project 40 — A Token of Goodwill...
- id: `projectButton40`
- Price tag: `($500,000)`
- Description: `A small gift to the supervisors. (+1 Trust)`
- Trigger: `humanFlag == 1 AND trust >= 85 AND trust < 100 AND clips >= 101000000`
- Cost check: `funds >= 500000`
- Deducts: `funds -= 500000`
- Effect: `trust += 1`
- Message: `Gift accepted, TRUST INCREASED`
- Uses: one-shot. Its flag gates 40b.

### Project 40b — Another Token of Goodwill...
- id: `projectButton40b`
- Price tag: initially `"($" + fmtLocale(bribe) + ")"`, with `bribe` initially `1000000`, giving `($1,000,000)`. Rebuilt after each purchase, and on load (section 08), from the current `bribe`.
- Description: `Another small gift to the supervisors. (+1 Trust)`
- Trigger: `project40.flag == 1 AND trust < 100`
- Cost check: `funds >= bribe`
- Deducts: `funds -= bribe` (the current, pre-doubling value)
- Effect, in order: `bribe = bribe * 2`; `priceTag = "($" + fmtLocale(bribe) + ")"`; `trust += 1`; message; then **if `trust < 100`** (after the +1): `project40b.uses += 1`.
- Message: `Gift accepted, TRUST INCREASED`
- Uses: **repeatable** while `trust` stays below 100 after the purchase. Cost doubles each time: $1,000,000, $2,000,000, $4,000,000, … (`bribe` is saved). Once a purchase brings `trust` to 100 or more, it is not re-armed and never comes back. Project 35 removes it from the list if it is still showing.
- The trigger has no `humanFlag` check. If buying project 40 itself brings `trust` to 100 or more, 40b is not activated in phase 1, and after project 35 drops `trust` by 100 it appears for the first time in phase 2 at `($1,000,000)`. It can then be bought from the leftover `funds` and keeps re-arming while `trust < 100`. Keep this (05-D8).

### Project 46 — Space Exploration
- id: `projectButton46`
- Price tag: `(120,000 ops, 10,000,000 MW-seconds, 5 oct clips)`
- Description: `Dismantle terrestrial facilities, and expand throughout the universe`
- Trigger: `humanFlag == 0 AND availableMatter == 0`
- Cost check: `operations >= 120000 AND storedPower >= 10000000 AND unusedClips >= 5 * 10^27`
- Deducts: `standardOps -= 120000`; `unusedClips -= 5 * 10^27`. `storedPower` is checked but not deducted separately, because `batteryReboot` (step 5) sets it to 0 anyway (05-D7).
- Effect, in order:
  1. Begin preloading the threnody audio asset (`loadThrenody`, section 04; it is played at the ending).
  2. `project46.flag = 1`; `boredomLevel = 0`; `spaceFlag = 1` (phase 3).
  3. Deductions as above (ops and clips).
  4. Message: `Von Neumann Probes online`
  5. Reboot (dismantle) the terrestrial facilities in this order: `factoryReboot`, `harvesterReboot`, `wireDroneReboot`, `farmReboot`, `batteryReboot` (section 04 owns them). Each sets its level to 0, refunds that facility's accumulated clip spend (`*Bill`) into `unusedClips`, and resets its unit cost. `batteryReboot` also sets `storedPower = 0`, so all stored power is lost. The 10,000,000 MW-seconds in the cost is only a gate.
  6. `farmLevel = 1` (one free solar farm, so probes have power); `powMod = 1`.
  7. Refresh the probe cost display with `numberCruncher(probeCost)`.
- Uses: one-shot.

### Project 50 — Quantum Computing
- id: `projectButton50`
- Price tag: `(10,000 ops)`
- Description: `Use probability amplitudes to generate bonus ops`
- Trigger: `processors >= 5`
- Cost check: `operations >= 10000`
- Deducts: `standardOps -= 10000`
- Effect: `qFlag = 1` (reveals the quantum computing panel and starts quantum chip updates, section 03).
- Message: `Quantum computing online`
- Uses: one-shot.

### Project 51 — Photonic Chip
- id: `projectButton51`
- Price tag: `"(" + fmtLocale(qChipCost) + " ops)"`, with `qChipCost` initially `10000`, giving `(10,000 ops)`. Rebuilt the same way, with thousands separators, after each purchase and on load (05-D3).
- Description: `Converts electromagnetic waves into quantum operations`
- Trigger: `project50.flag == 1`
- Cost check: `operations >= qChipCost`
- Deducts: `standardOps -= qChipCost` (the current, pre-increase value)
- Effect, in order: `qChipCost += 5000`; rebuild the price tag; `qChips[nextQchip].active = 1`; `nextQchip += 1`; message; then **if `nextQchip < length(qChips)`** (`qChips` has 10 entries, section 03): `project51.uses += 1`.
- Message: `Photonic chip added`
- Uses: **repeatable, 10 purchases total**. Costs are 10,000, 15,000, 20,000, …, 55,000 ops. After the 10th chip it is not re-armed.

### Project 60 — New Strategy: A100
- id: `projectButton60`
- Price tag: `(15,000 ops)`
- Description: `Always choose A`
- Trigger: `project20.flag == 1`
- Cost check: `operations >= 15000`
- Deducts: `standardOps -= 15000`
- Effect, in order:
  1. `allStrats[1].active = 1` (index 1 is strategy A100; section 03 owns the strategy table).
  2. Append `stratA100` to `strats` (the tournament strategy pool).
  3. Message: `A100 added to strategy pool`
  4. `tourneyCost += 1000`; refresh the tournament cost display with `fmtLocale(tourneyCost)`.
  5. Add an entry to the strategy picker, labelled `A100` with value `1` (the `allStrats` index), after the existing entries.
- Uses: one-shot. Its flag gates project 61 (section 06).

---

## 3. Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

#### 05-D1 — Purchase does not re-check cost
- **Location:** project button click handler (`displayProjects` sets `onclick = project.effect`, section 02); enable state is set only in `manageProjects`.
- **Original behavior:** a click calls `effect()` directly. Affordability is re-evaluated only when the main 10 ms tick toggles each button's `disabled` state. Two enabled projects sharing a resource (two creativity projects, two ops projects, or 37 and 40 on funds) can both be clicked inside one tick and paid from one balance, pushing `creativity`, `funds`, `yomi`, `trust` or `standardOps` below what the costs allow.
- **Fixed behavior:** on activation, run `effect` only if `cost()` is true at that moment; otherwise ignore the click (00 §4 item 3).
- **Category:** Gameplay (exploit)
- **Player impact:** none in normal play. The window is a single 10 ms tick, too short to hit by hand; it is reachable only with scripted clicks or a stalled main loop. The fix removes a double-spend exploit.
- **Recommendation:** Fix
- **Rationale:** Already ruled in 00 §4 item 3. Honest players can't observe the difference, and the original lets one balance pay for two purchases.

#### 05-D2 — Message typo "AutoClippper"
- **Location:** effects of projects 1, 4, 5.
- **Original behavior:** messages read `AutoClippper performance boosted by 25%`, `AutoClippper performance boosted by another 50%`, `AutoClippper performance boosted by another 75%` (triple "p").
- **Fixed behavior:** `AutoClipper …` with two "p"s, matching project 16 and the rest of the game.
- **Category:** Display
- **Player impact:** one letter in three messages.
- **Recommendation:** Fix
- **Rationale:** Typo. 00 §3 already lets defect-table typo fixes override verbatim text.

#### 05-D3 — Project 51 price tag loses thousands separators
- **Location:** project 51 effect; load routines (section 08).
- **Original behavior:** the initial tag is `"(" + qChipCost.toLocaleString() + " ops)"` → `(10,000 ops)`. After a purchase and on load it is rebuilt as `"(" + qChipCost + " ops)"` → `(15000 ops)` … `(55000 ops)`. Project 40b uses locale formatting in both places.
- **Fixed behavior:** always `"(" + fmtLocale(qChipCost) + " ops)"`.
- **Category:** Display
- **Player impact:** price tag formatting only; the cost is unchanged.
- **Recommendation:** Fix
- **Rationale:** Formatting inconsistency with no gameplay role. Matches 00 §4 item 4.

#### 05-D4 — Ops deducted from `standardOps` while checked against `operations`
- **Location:** every ops-cost project (§1.4).
- **Original behavior:** `cost()` tests `operations` (`floor(standardOps + floor(tempOps))`, which includes quantum overflow `tempOps`), and the effect subtracts from `standardOps`, which can go negative. `calculateOperations` folds `tempOps` into `standardOps` on a later tick once their sum is below `memory * 1000`.
- **Fixed behavior (rejected):** clamping `standardOps` at 0 after a deduction.
- **Category:** Gameplay
- **Player impact:** the original charges the full cost out of the combined ops pool. Clamping would make any purchase that exceeds `standardOps` partly free (up to the whole `tempOps` portion), a large exploit during quantum bursts. Project 217 (section 06) needs `operations <= -10000` and depends on this.
- **Recommendation:** Keep original
- **Rationale:** Ruled intentional in 00 §4 item 1. §1.4 specifies the behavior.

#### 05-D5 — Dead state `nanoWire`
- **Location:** project 35 effect; save/load (section 08).
- **Original behavior:** `nanoWire = wire` is written, saved and loaded, and never read. (The HTML element with id `nanoWire` is a separate display of `wire`, unaffected.)
- **Fixed behavior:** omit the variable. When importing original saves, accept and ignore the field.
- **Category:** Code-only
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Unread state.

#### 05-D6 — Stale demand display refresh (projects 37, 38)
- **Location:** project 37 and 38 effects.
- **Original behavior:** right after multiplying `demandBoost`, the effect writes the raw old `demand` into the Public Demand readout (`innerHTML = demand`: internal scale, unformatted, e.g. `4.5714285714`, where the normal readout shows `fmt(demand * 10)` with no decimals, e.g. `46`). `updateStats` overwrites it on the next 10 ms tick.
- **Fixed behavior:** the effect does not touch the demand display; the next tick's normal refresh shows the new demand.
- **Category:** Display
- **Player impact:** none visible; the wrong value lasts at most one 10 ms tick.
- **Recommendation:** Fix
- **Rationale:** A one-tick display glitch with the wrong scale and format.

#### 05-D7 — Redundant power deduction (project 46)
- **Location:** project 46 effect.
- **Original behavior:** `storedPower -= 10000000`, then `batteryReboot()` sets `storedPower = 0`. Nothing reads `storedPower` in between.
- **Fixed behavior:** keep `storedPower >= 10000000` in `cost()`; skip the separate subtraction. `storedPower` ends at 0 either way.
- **Category:** Code-only
- **Player impact:** none; the end state is identical.
- **Recommendation:** Fix
- **Rationale:** Dead write. Implementations that keep the subtraction are also correct.

#### 05-D8 — Phase-1 projects stay listed or appear after the HypnoDrone release
- **Location:** triggers of most projects in this section; project 35 effect.
- **Original behavior:** project 35 removes only 219 and 40b (if displayed) from the list. Other active projects stay, and triggers without a `humanFlag` check keep firing in phase 2 and 3. Projects whose effects are dead once `humanFlag == 0` can therefore still be listed and bought: 1, 4, 5, 16, 22–25 (clipper levels are 0, clipper UI hidden), 7, 8, 9, 10, 10b, 26 (wire buying hidden; `wireBuyerFlag` forced to 0 each tick), 11 (demand no longer computed), 21 (`investmentEngineFlag` forced to 0 each tick), 37, 38, 40b (paid from `funds`, which are frozen after the release), 42. Notable case: if buying project 40 itself brings `trust` to 100 or more (trust was 99), 40b's trigger (`trust < 100`) stays false through phase 1, project 35 finds no 40b button, and 40b first appears in phase 2 once `trust` drops by 100. It then re-arms after each purchase while `trust < 100`, costing $1M, $2M, $4M, … of leftover funds for +1 hidden trust each. None of these projects' flags gate anything in section 06.
- **Fixed behavior (variant):** add `humanFlag == 1` to the triggers of projects 1, 2, 4, 5, 7, 8, 9, 10, 10b, 11, 16, 21, 22, 23, 24, 25, 26, 37, 38, 40b and 42. In project 35's effect, at step 4–5, remove every one of those projects still in `activeProjects` (button and list entry; leave `uses` as it is). Leave the creativity/trust projects (6, 13–15, 17, 19), 3, 20, 27–31, 50, 51 and 60 untouched: they still matter after the release (e.g. 17 gates 18, 19 gates 20, and trust still counts toward processor/memory capacity under 01 §7.2).
- **Category:** Gameplay
- **Player impact:** small. Keeping the original lets players waste ops (up to 10,000 for 21, 7,000 for 26, 45,000 for 22–25 in total, etc.) or frozen funds on effects that do nothing, and shows business-era buttons during the swarm phase. The +1 trust from 37, 38 or 40b in phase 2 almost never adds processor/memory capacity, because after project 35 `trust` sits about 100 below `processors + memory`.
- **Recommendation:** Keep original, fix as optional variant
- **Rationale:** This is the list players see in the original, and the cost is a few wasted purchases. The variant tidies the phase-2 list without changing any reachable outcome.

#### 05-D9 — Begging floor at −100 trust can softlock
- **Location:** project 2 `cost()`. (Previously listed as an intentional quirk.)
- **Original behavior:** `cost()` is `trust >= -100`. Each beg costs 1 trust; a beg at exactly −100 leaves `trust = -101`, and the button then stays disabled. Project 2's trigger means the player has no wire, no unsold clips, and less than one spool's price in `funds` and `portTotal`. With `trust < -100` there is no way to get wire, make clips, earn money, or earn trust (trust comes from clip milestones), so the game is stuck until reset. Reaching this takes about 100 begs, each from a position where one spool's clips sell for less than a spool costs (e.g. price near $0.01 with 1,000 wire per spool against a wire price of $9–$26).
- **Fixed behavior:** `cost()` is always true. Price tag (`(1 Trust)`), trigger and effect are unchanged.
- **Category:** Robustness (softlock)
- **Player impact:** none for anyone above −100 trust, which is every normal game. Players who would have hit the floor keep getting spools instead of a dead save.
- **Recommendation:** Fix
- **Rationale:** The −100 floor has no gameplay purpose beyond capping the escape, and the only thing it adds is a permanent softlock. Unlimited negative trust is already punished, since processors and memory can't be bought until trust recovers.

#### 05-D10 — Raw wire value written to the phase-2 wire display (project 35)
- **Location:** project 35 effect, step 7.
- **Original behavior:** `transWire` is set to the raw `wire` number (unformatted, may show decimals or long digit strings). The normal phase-2 refresh in `clipClick` writes `numberCruncher(wire)`, but only while `wire >= 1`, so with less than 1 wire the raw value stays.
- **Fixed behavior:** write `numberCruncher(wire)`.
- **Category:** Display
- **Player impact:** formatting of one readout, usually for a single tick.
- **Recommendation:** Fix
- **Rationale:** Same readout, same formatter as everywhere else in phase 2.

Design quirks that are **intended** and must be kept:
- Project 2 can push `trust` negative (anti-softlock escape). Negative trust blocks processor/memory purchases until it recovers. The original's −100 floor is handled in 05-D9.
- Projects 8, 9 and 10 trigger on `wireSupply` thresholds rather than on the previous project's flag. Buying 10b early makes several of them available at once. 10b triggers on `wireCost >= 125`, which needs very heavy wire buying, so this is rare.
- Project 40 is offered only while phase 1 is on, `trust` is in [85, 100) and `clips >= 101,000,000`. The trigger is re-checked every tick until it fires, so the offer only goes missing while `trust >= 100`, which is the level the gifts exist to reach. If trust later drops back into the window (projects 2 and 34 cost trust), it can still appear.
- Project 18 appears only after phase 1 ends (`humanFlag == 0`), even though project 17 can be done much earlier.
