# 02 — UI Layout, Visibility Rules, and Progression

This section defines every screen, panel, display field, and button; the rules that show, hide, enable, and disable them; the message console; the transient visual effects (blink, HypnoDrone event); the project list; and the order in which UI reveals across a playthrough.

Mechanics behind the numbers belong to other sections:

- 01: core economy, main loop
- 03: quantum, investments, strategic modeling
- 04: phase 2/3 industry, swarm, power, probes, ending
- 05/06: project catalog
- 07: combat
- 08: save/load/prestige/debug

State identifiers in backticks are the canonical names shared across sections. Each display field is given as `fieldId` → source value and format. Formats are defined in §2.

---

## 1. Global conventions

### 1.1 UI update cadence

- The main tick runs every 10 ms (100 ticks/s). Section 01 owns its full ordering. The UI visibility/enable pass, called `buttonUpdate` below, runs once per main tick: step 3, right after `ticks++` and the first `milestoneCheck()`, and before any production in that tick. Flags that change later in a tick therefore show on screen one tick later (10 ms), which nobody can see. A reimplementation may evaluate visibility at render time from current state instead. The result is the same.
- **`buttonUpdate` also changes game state.** These changes must happen exactly once per main tick, whatever the render rate:
  1. `qFade = qFade - 0.001` (after its value has been applied as the qOps display opacity).
  2. AutoTourney automation (§6.6).
  3. `if funds >= 5: autoClipperFlag = 1`. This runs *after* the AutoClipper panel visibility check in the same pass, so the panel appears one tick later.
  4. `if humanFlag == 0: investmentEngineFlag = 0; wireBuyerFlag = 0` (forced off every tick once humans are gone).
  5. `probeUsedTrust = probeSpeed + probeNav + probeRep + probeHaz + probeFac + probeHarv + probeWire + probeCombat`. Other code reads this value, for example a project trigger in 05/06.
- Most display text is refreshed every tick by `updateStats` (section 01) and the per-tick subsystem functions. Some is refreshed only by event handlers (purchases, project effects) or by the post-load `refresh()`. **Requirement for the reimplementation:** every display field must always show the current value of its source state, formatted as specified here. Several original bugs come from fields that are only updated on events (see §10).
- **Start-up cover:** when the game screen opens, a blank white full-screen cover sits over everything. It is removed at the end of the first `buttonUpdate` pass, so the player never sees panels before the visibility rules have been applied. Recommendation: render nothing until the first visibility pass completes.

### 1.2 Hidden vs. disabled

- *Hidden* means the element takes no layout space; later content moves up.
- *Disabled* means the element is shown but greyed out (60% opacity, white border) and does nothing when clicked.
- *Blink-hidden* (§4.2) means invisible but still taking up its layout space.

### 1.3 Precedence

When several rules touch one element in the same tick, the final state is what counts. The order of evaluation (§6) is the order of the original. The ending teardown rules (§6.12) run after `buttonUpdate` in the same tick and override it.

---

## 2. Display formats

These are used throughout. They are written for an en-US locale. The reimplementation should use these exact outputs whatever the user's locale.

Canonical definitions live in section 01 §1. Short names used in this section:

- **`grp(x)`** = `fmtGrouped(x)` (01 §1.1).
- **`money(x)`** = `fmtMoney(x)` (01 §1.2).
- **`fixed(x, n)`**: exactly n fractional digits, no grouping.
- **`raw(x)`**: the plain number as stored, no grouping. Only used for values that are always small integers.
- **`numberCruncher(number, decimals = 2)`**: see 01 §1.3. Use the clean thresholds (`>= 10^k`) and no trailing space; the original's precision and trailing-space quirks are defects 01-D7/D8.
- **`timeCruncher(t)`**: see 01 §1.4. `t` is in ticks (1/100 s).

---

## 3. Visual style (tech-neutral summary)

- **Overall:** plain, light, "corporate dashboard" look. Black text on a white page. Body text uses the platform's default proportional serif font at the default size. No custom page background. Panel headings are bold text followed by a thin full-width horizontal rule.
- **Small text:** a compact sans-serif at about 11 px (Helvetica/Arial class) for: buttons, stock and tournament tables, the "Next Upgrade at" lines, the factory/drone power breakdown lines, combat overlay text, and tooltip boxes.
- **Buttons (standard):** small (11 px sans-serif, black text, about 2×4 px padding). Vertical gradient from white to mid-grey. 1 px near-black border, 2 px corner radius. Hover lightens the border to mid-grey and the gradient slightly. Pressed inverts to a dark-to-light gradient with dark grey text. Disabled: 60% opacity, white border.
- **Project buttons:** see §5.3.
- **Boxed sub-panels ("engines"):** these have a 1 px grey border, about 5 px padding, and about 5 px margin: Investments, Strategic Modeling, Von Neumann Probe Design, Swarm Computing, Quantum Computing. The Quantum box has a fixed height of about 70 px.
- **Console:** a full-width black band at the very top. Text is monospace (typewriter-style, e.g. Lucida Console/Monaco class) at about 12 px. History lines are grey; the current line is white. A thin "|" cursor pulses (opacity 0 → 1 → 0 over 0.5 s, ease-out, repeating forever).
- **Prestige bar:** full-width strip with a light-grey background, just under the console.
- **Paperclip counter:** large heading text, "Paperclips: N", with a tight line height.
- **Tooltips:** a light-grey (#c8c8c8) box with black centred text, 3 px radius, and about 5 px vertical padding. It fades in over 1 s while the anchor is hovered, and is hidden otherwise. Three placements:
  - clip-count tooltip: about 160 px wide, above the heading
  - probe-design tooltips: about 200 px wide, 11 px sans-serif, above the row
  - "Disassemble All" tooltips: about 180 px wide, above and to the right of the button
- **Quantum chips:** a row of ten 22×22 px black squares with small gaps. Each chip's opacity follows its live value (values ≤ 0 are fully transparent; section 03 owns the values).
- **Combat view:** a 310×150 px mid-grey (#808080) drawing area, centred in the right column. Text is overlaid at its top-left corner (about 15 px, 8 px). Section 07 owns the drawing.
- **HypnoDrone banner:** full-width black band with huge (about 150 px) white sans-serif text and a 115 px line height (§4.3).
- **Layout geometry:** fixed widths that do not reflow:
  - left column about 275 px
  - middle column about 275 px
  - right column about 320 px
  - about 10 px gutters
  - total about 900 px
  
  The columns start below the console, prestige bar, and clip counter.

---

## 4. Console, blink, and the HypnoDrone event

### 4.1 Message console (`displayMessage(msg)`)

- There are five lines, shown top (oldest) to bottom (newest):
  - `readout5`, `readout4`, `readout3`, `readout2`: history lines. Each has the prefix " . " (space, dot, space) and is shown in grey.
  - `readout1`: the current line. It has the prefix " > " and is shown in white, followed by the pulsing "|" cursor.
- Initial contents: `readout1` = "Welcome to Universal Paperclips"; the other four are empty (only their prefixes show).
- `displayMessage(msg)` shifts the lines: `readout5 ← readout4`, `readout4 ← readout3`, `readout3 ← readout2`, `readout2 ← readout1`, `readout1 ← msg`. The oldest line is dropped. Nothing else is stored; there is no scrollback.
- If one action posts several messages, they are pushed in order, so the last one becomes the current line.
- Messages are plain text with one exception: the credits message contains the HTML entity `&#169;`, which must render as "©" (see §6.12).
- Section 08 decides whether the console contents survive save/load. The original does not save them.

### 4.2 Blink (`blink(element)`)

Used when a project button first appears (§5.2).

- It runs on its own 30 ms real-time timer, independent of the game tick.
- Each blink keeps its own step counter `n`, starting at 0. On each timer firing, `n += 1`:
  - if `n >= 12`: stop the timer and make the element visible.
  - otherwise: toggle the element's visibility (it starts visible, so step 1 hides it).
- Net effect: 11 toggles at 30 ms intervals (the element flashes about 5.5 times), ending visible after about 360 ms. While invisible, the element keeps its layout space.
- (The original uses one shared global counter; see §10, D2.)

### 4.3 HypnoDrone event (`hypnoDroneEvent()`)

This is fired by the effect of project "Release the HypnoDrones" (`project35`, section 05/06). The debug button "Destroy all Humans" also fires it.

- The banner element sits above the console, full width, black, with huge white text (§3). It is hidden by default.
- On start: set the banner text to "Release". Then start a 32 ms real-time timer with step counter `k = 0`. On each firing, `k += 1`, then:
  1. Text updates, based on the new `k`. Line breaks are shown as "/"; each "/" is a new line, and leading "/" marks are empty lines:
     - if 5 < k < 10: text = "Release"
     - if 30 < k < 40: text = "///Release" (three empty lines, then "Release")
     - if 45 < k < 55: text = "/Release" (one empty line, then "Release")
     - if k > 55: text = "Release/the/Hypno/Drones" (four lines)
     - for any other k, the text stays as it was.
  2. If k >= 120: stop the timer, reset `k`, and hide the banner. Otherwise, toggle the banner between shown and hidden. It starts hidden, so odd steps show it and even steps hide it.
- Net effect: the banner strobes at about 15.6 Hz for about 3.84 s. It shows "Release" (steps 1–30), then "Release" pushed down three lines (31–45), then pushed down one line (46–55), then the four-line "Release the Hypno Drones" (56–119), then disappears.
- In the original the banner is *in the page flow*: each time it shows, the whole layout below it is pushed down by the banner's height, so the entire screen jumps in time with the strobe. That jump is part of the intended effect. A reimplementation may reproduce the jump or draw the banner as an overlay at the top; either is acceptable. The jump matches the original more closely.
- The event is purely visual and is not saved. If it is triggered while already running, restart it from step 0 (see §10, D3).
- Accessibility (optional): the event flashes at about 15 Hz. An implementation may offer a setting that reduces the flashing (e.g. a steady banner for 3.84 s).

---

## 5. Project list

### 5.1 Placement

"Projects" panel in the middle column, below Computational Resources. It has a bold heading "Projects", a rule, and then a vertical list of project buttons.

### 5.2 Trigger checking and display (`manageProjects`, each main tick, after `updateStats`)

```
for each project p in catalog order (order of definition in sections 05/06):
    if p.trigger() and p.uses > 0:
        displayProject(p)            # creates its button at the BOTTOM of the list, then blinks it
        p.uses = p.uses - 1
        append p to activeProjects
for each p in activeProjects:
    p.button.enabled = p.cost()      # affordability, re-evaluated every tick
```

- New buttons are added at the end (bottom) of the list. The list therefore shows active projects in the order they appeared; ties within one tick go in catalog order.
- A newly created button blinks (§4.2).
- Repeatable projects (e.g. "Beg for More Wire", "Photonic Chip", "Another Token of Goodwill...", "Xavier Re-initialization") work by having their effect add 1 back to `uses`. They reappear as a new button at the bottom, with a fresh `priceTag`, the next time their trigger is true.
- When a project is activated (clicked while enabled), its effect runs, its button is removed from the list (the buttons below move up), and it is removed from `activeProjects`. The effects themselves are in 05/06. **Check `p.cost()` again at click time** and ignore the click if it is false (§10, D13).
- After a load, restore the active projects as buttons in their saved display order (§10, D14). In the original, restored buttons also blink.

### 5.3 Project button appearance

- A full-column-width block (about 275 × 60 px). Light-grey (#c8c8c8) fill, 1 px black border, about 6 px gap below each button. Hover: the border fades to 25% opacity. Pressed: the fill lightens slightly (#d1d1d1). Disabled (unaffordable): no border and greyed text (the platform's standard disabled text colour).
- The content is centred and wraps inside the box:
  - Line 1: **`title`** in bold, immediately followed by `priceTag` in normal weight. Titles in the catalog end with a trailing space, so this reads, e.g., "**Improved AutoClippers** (750 ops)".
  - Line 2 onward: `description` in normal weight.
- A button's `title` and `priceTag` are derived from current state whenever the button is shown (00-overview §4.4). Repeatable projects that change their priceTag in their effect (e.g. "Photonic Chip", "Another Token of Goodwill...") therefore show the new text when they reappear. The original copied the text once at creation; see §10, 02-D19.

---

## 6. The game screen: panels, fields, and rules (`buttonUpdate` and related)

Panels are listed in screen order. For each panel: its contents (labels verbatim), then its visibility rules, then its enable rules. Button labels are shown in [brackets]. In the original some labels are padded with spaces to widen the button (e.g. "[ Memory ]"). Equivalent fixed widths are fine. Unless stated otherwise, every rule below is evaluated every main tick.

### 6.0 Top area (full width, above the columns)

From top to bottom:

1. **HypnoDrone banner**: §4.3.
2. **Console**: §4.1.
3. **Prestige bar**: " Universe: `prestigeUcounter` / Sim Level: `prestigeScounter`"
   - `prestigeUcounter` = `prestigeU + 1`; `prestigeScounter` = `prestigeS + 1` (raw). The first universe therefore reads "Universe: 1 / Sim Level: 1". The original fills these only after a load or prestige load, which is fine because the bar is only visible when a prestige count is nonzero.
   - Visible iff `prestigeU >= 1 or prestigeS >= 1`.
4. **Paperclip counter**: heading "Paperclips: `clips`".
   - Normally the value is `grp(ceil(clips))`. During the ending, section 04 replaces it with fixed strings once `milestoneFlag >= 15`.
   - Hover tooltip: `numberCruncher(clips, 1)`, e.g. "1.5 million". Its initial placeholder text "total clips produced" is replaced on the first tick.

### 6.1 Left column: the clip button

- [Make Paperclip]: makes one clip by hand (section 01). Disabled iff `wire < 1`. It is always visible, in every phase including the very end.

### 6.2 Left column: phase-2/3 "Manufacturing" panel (`creationDiv`)

Heading "Manufacturing" and a rule. Contents, in order:

- **Factory upgrade line** (`factoryUpgradeDisplay`, small text): "Next Upgrade at: `nextFactoryUpgrade` Factories"
  - Value: 10 if `maxFactoryLevel < 10`; else 20 if `< 20`; else 50 if `< 50`; else 0. Format `grp`.
  - Hidden iff `maxFactoryLevel >= 50 or project45.flag == 0`.
- "Clips per Second: `clipmakerRate2`". This shows `clipRate`, formatted `grp` when `humanFlag == 1` and `numberCruncher` otherwise.
- **Unused clips line** (`tothDiv`): "Unused Clips: `unusedClipsDisplay`" = `numberCruncher(unusedClips)`.
  - Visible iff `tothFlag == 1`.
- **Factory sub-panel** (`factoryDiv`):
  - [Clip Factory] followed by the count `factoryLevelDisplay` (`grp(factoryLevel)`).
  - [Disassemble All], with hover tooltip "+`numberCruncher(factoryBill)` clips".
  - "Cost: `numberCruncher(factoryCost)` clips"
  - Visible iff `factoryFlag == 1` and `spaceFlag == 0`.
  - [Clip Factory] is disabled iff `unusedClips < factoryCost`. [Disassemble All] is disabled iff `factoryLevel == 0`.
- **Wire line** (`wireTransDiv`): "Wire: `transWire` inch|inches" = `numberCruncher(wire)`. The unit word is "inch" when `wire == 1`, otherwise "inches".
  - Visible by default. Hidden while `wireProductionFlag == 1` (wire is then shown in Wire Production). It is shown again during the ending, from `dismantle >= 2` (§6.12).
- **Space-phase factory summary** (`factoryDivSpace`): "Factories: `numberCruncher(floor(factoryLevel))`"
  - Visible iff `spaceFlag == 1`. Hidden from `dismantle >= 3`.

Panel visibility: visible iff `humanFlag == 0`, i.e. hidden in phase 1. Hidden in the ending from `endTimer6 >= 250`.

### 6.3 Left column: "Wire Production" panel (`wireProductionDiv`)

Heading "Wire Production" and a rule. Contents, in order:

- **Drone upgrade line** (`droneUpgradeDisplay`, small text): "Next Upgrade at: `nextDroneUpgrade` Drones"
  - Value: 500 if `maxDroneLevel < 500`; else 5,000 if `< 5000`; else 50,000 if `< 50000`; else 0. Format `grp`.
  - Visible iff `maxDroneLevel < 50000`, so it shows whenever the Wire Production panel does, including before the drone projects are done (it then reads "500 Drones"). This is the original rule; gating it on `harvesterFlag`/`wireDroneFlag` is an optional variant (§10, 02-D6).
- "Available Matter: `numberCruncher(availableMatter)` g"
- **Matter discovery rate** (`mdpsDiv`): "(`numberCruncher(xRate*100)` g per sec)". `xRate` is the per-tick exploration amount from section 04.
  - Visible iff `spaceFlag == 1`.
- "Acquired Matter: `numberCruncher(acquiredMatter)` g"
- "(`maps` g per sec)": `numberCruncher(mtr*100)` while matter is available, else "0" (section 04).
- "Wire: `numberCruncher(wire)` inches". Always the word "inches" here.
- "(`wpps` inches per sec)": `numberCruncher(a*100)` while acquired matter remains, else "0" (section 04).
- **Harvester sub-panel** (`harvesterDiv`):
  - [Harvester Drone] followed by the count `harvesterLevelDisplay` (`grp(harvesterLevel)`).
  - A row of [+10] [+100] [+1k].
  - [Disassemble All], with tooltip "+`numberCruncher(harvesterBill)` clips".
  - "Cost: `numberCruncher(harvesterCost)` clips". Only the single-unit cost is ever shown; the bulk costs are not displayed.
  - Visible iff `harvesterFlag == 1` and `spaceFlag == 0`.
  - Enable rules (evaluated only while `humanFlag == 0 and spaceFlag == 0`, i.e. while the panel can be seen):
    - [Harvester Drone] is disabled iff `unusedClips < harvesterCost`.
    - [+10]/[+100]/[+1k] are disabled iff `unusedClips < p10h / p100h / p1000h`. `pNh` = Σ_{L=harvesterLevel+1}^{harvesterLevel+N} L^2.25 × 1,000,000. Section 04 defines when these are recomputed.
    - [Disassemble All] is disabled iff `harvesterLevel == 0`.
- **Wire Drone sub-panel** (`wireDroneDiv`): the same layout with [Wire Drone], `wireDroneLevel`, `wireDroneBill`, `wireDroneCost`, and `p10w/p100w/p1000w`.
  - Visible iff `wireDroneFlag == 1` and `spaceFlag == 0`.
  - The same enable rules apply, using the wire-drone values.
- **Space-phase drone summary** (`droneDivSpace`):
  - "Harvester Drones: `numberCruncher(floor(harvesterLevel))`"
  - "Wire Drones: `numberCruncher(floor(wireDroneLevel))`"
  - Visible iff `spaceFlag == 1`.

Panel visibility: visible iff `wireProductionFlag == 1`. Hidden from `dismantle >= 2`.

### 6.4 Left column: "Space Exploration" panel (`spaceDiv`)

Heading "Space Exploration" and a rule. Contents, in order:

- "`colonizedDisplay`% of universe explored". The value is `fixed(100 / (totalMatter / foundMatter), 12)`, e.g. "0.000000000020% of universe explored".
- [Launch Probe], then on the next line "Cost: `numberCruncher(probeCost)` clips". [Launch Probe] is disabled iff `unusedClips < probeCost`.
- "Launched: `numberCruncher(probeLaunchLevel)`"
- "Descendents: `numberCruncher(probeDescendents)`". The spelling "Descendents" is in the original; see §10, D15.
- "Lost to hazards: (`numberCruncher(probesLostHaz)`)". Visible iff `probesLostHaz >= 1`.
- "Lost to value drift: (`numberCruncher(probesLostDrift)`)". Visible iff `probesLostDrift >= 1`.
- "Lost in combat: (`numberCruncher(probesLostCombat)`)". Visible iff `probesLostCombat >= 1`.
- A short horizontal rule (about 225 px, left-aligned).
- "Total: `numberCruncher(probeCount)`"
- **Drifter lines** (`drifterDiv`):
  - "Drifters Killed: `numberCruncher(driftersKilled)`"
  - "Drifters: `numberCruncher(drifterCount)`"
  - Visible iff `battleFlag == 1`.

Panel visibility: visible iff `spaceFlag == 1`. Hidden during the ending from `dismantle >= 1 and endTimer1 >= 150`.

### 6.5 Left column: phase-1 "Business" panel (`businessDiv`)

Heading "Business" and a rule. Contents, in order:

- "Available Funds: $ `money(funds)`"
- **Revenue lines** (`revPerSecDiv`):
  - "Avg. Rev. per sec: $ `money(avgRev)`"
  - "Avg. Clips Sold per sec: `grp(round(avgSales))`"
  - Updated once per second by section 01.
  - Visible iff `revPerSecFlag == 1`.
- "Unsold Inventory: `grp(floor(unsoldClips))`"
- [lower] [raise] "Price per Clip: $ `fixed(margin, 2)`". It shows "0.25" at start (§10, D5).
  - [lower] is disabled iff `margin <= 0.01`. [raise] is always enabled.
- "Public Demand: `demand`%". The value shown is `grp(round(demand * 10))`, i.e. 0 decimals with grouping (§10, D8).
- [Marketing] " Level: `raw(marketingLvl)`", then "Cost: $ `money(adCost)`". [Marketing] is disabled iff `funds < adCost`.

Panel visibility: visible iff `humanFlag == 1`.

### 6.6 Left column: phase-1 "Manufacturing" panel (`manufacturingDiv`)

Heading "Manufacturing" and a rule. (This is a separate panel from §6.2, which has the same heading.) Contents, in order:

- "Clips per Second: `grp(clipRate)`"
- **WireBuyer line** (`wireBuyerDiv`): [WireBuyer] followed by the status text "ON"/"OFF" from `wireBuyerStatus` (1 = "ON", the initial value). Clicking toggles it (section 01).
  - Visible iff `wireBuyerFlag == 1`. Always enabled.
- [Wire] "`grp(floor(wire))` inches", then "Cost: $ `wireCost`". `wireCost` is always an integer and is shown without grouping (e.g. "20").
  - [Wire] is disabled iff `funds < wireCost`.
- **AutoClipper line** (`autoClipperDiv`): [AutoClippers] followed by the count `raw(clipmakerLevel)`, then "Cost: $ `money(clipperCost)`".
  - Visible iff `autoClipperFlag == 1`. The flag is set by `buttonUpdate` when `funds >= 5` (§1.1) and stays set.
  - [AutoClippers] is disabled iff `funds < clipperCost`.
- **MegaClipper line** (`megaClipperDiv`): [MegaClippers] followed by the count `raw(megaClipperLevel)`, then "Cost: $ `money(megaClipperCost)`".
  - Visible iff `megaClipperFlag == 1`.
  - [MegaClippers] is disabled iff `funds < megaClipperCost`.

Panel visibility: visible iff `humanFlag == 1`.

### 6.7 Left column: bottom (save/load and debug)

- Below all panels are the save controls, shown as default (unstyled) platform buttons: [SAVE SLOT 1] [LOAD SLOT 1] / [SAVE SLOT 2] [LOAD SLOT 2] / [RESET ALL PROGRESS]. Section 08 owns their behaviour. They are always visible and enabled.
- Debug/cheat buttons, always visible in the original, one per line unless noted:
  - [Free Clips]
  - [Free Money]
  - [Free Trust]
  - [Free Ops]
  - [Free Creativity]
  - [Free Yomi]
  - [Reset Prestige]
  - [Destroy all Humans]
  - [Free Prestige U] [Free Prestige S] [Set Battle Number 1 to 7] (on one line)
  - [Set Avail Matter to 0]
  
  Section 08 specifies what they do. **Recommendation:** hide all of these unless a debug option is turned on (§10, D17).

### 6.8 Middle column: "Computational Resources" panel (`compDiv`)

Heading "Computational Resources" and a rule. Contents, in order:

- **Trust lines** (`trustDiv`):
  - "Trust: `grp(floor(trust))`"
  - "+1 Trust at: `grp(floor(nextTrust))` clips"
  - Visible iff `humanFlag == 1`.
- **Swarm gift line** (`swarmGiftDiv`): "Swarm Gifts: `numberCruncher(swarmGifts)`"
  - Visible iff `swarmFlag == 1`. Section 04's swarm update sets this every tick. Hidden from `dismantle >= 2 and endTimer2 >= 50`.
- **Processors** (`processorDisplay`): [Processors] (about 70 px wide) followed by `raw(processors)`.
  - Hidden from `dismantle >= 6`.
- **Memory** (`memoryDisplay`): [ Memory ] (about 70 px wide) followed by `raw(memory)`.
- Enable rule for both buttons: disabled iff `trust <= processors + memory and swarmGifts <= 0`. What a click does after the humans are gone is in 01 §7.2 (01-D9).
- "Operations: `grp(floor(operations))` / `grp(memory*1000)`"
- **Creativity line** (`creativityDiv`): "Creativity: `grp(round(creativity))`"
  - Visible iff `creativityOn`. The value only updates while `creativityOn` is true.
- **Swarm Computing box** (`swarmEngine`, boxed):
  - Bold title "Swarm Computing"
  - "Drones: `numberCruncher(floor(harvesterLevel + wireDroneLevel))`"
  - "Status: `swarmStatus` text". This line is hidden when status code is 7 (no drones). Status texts, by code (section 04 owns the codes): 0 "Active", 3 "Bored", 5 "Disorganized", 6 "Sleeping", 8 "Lonely", 9 "NO RESPONSE...".
  - "Next gift in `timeCruncher(giftCountdown)`". Visible only when status is 0 (Active), and only while the gift rate is above 0. When less than 1 s remains it reads "Next gift in less than 1 second" (§10, D12).
  - When status is 3: [Entertain the Swarm], then "Cost: `grp(entertainCost)` creat". Disabled iff `creativity < entertainCost`.
  - When status is 5: [Synchronize the Swarm], then "Cost: `grp(synchCost)` yomi" (5,000 by default). Disabled iff `yomi < synchCost`.
  - The original also has three more action blocks that can never appear: [Feed the Swarm] "Cost: … MWs" (status 1 "Hungry"), [Teach the Swarm] "Cost: … MWs" (status 2 "Confused"), and [Clad the Swarm] "Cost: … MWs" (status 4 "Cold"). Nothing ever sets statuses 1, 2, or 4, so these are dead. Do not implement them (§10, D7).
  - Box visibility: visible iff `swarmFlag == 1`. Hidden from `dismantle >= 2 and endTimer2 >= 100`.
- **Work/Think slider** (`swarmSliderDiv`): the label "Work" on the left, a horizontal slider about 180 px wide, and the label "Think" on the right.
  - Integer range 0–200, initial value 0 (fully "Work"). Section 04 reads the value as `sliderPos`.
  - Visible iff `swarmFlag == 1`. Hidden from `dismantle >= 2 and endTimer2 >= 150`.
- **Quantum Computing box** (`qComputing`, boxed, about 70 px tall):
  - Bold title "Quantum Computing"
  - A row of 10 chip squares, `qChip0`…`qChip9`. Each one's opacity is its chip value (section 03), clamped to [0, 1].
  - [Compute], always enabled, followed by the result text `qCompDisplay`. On click it shows "Need Photonic Chips" (no chips) or "qOps: `grp(ceil(q*360))`". Section 03 owns that logic.
  - `qCompDisplay` opacity = `clamp(qFade, 0, 1)`. A click sets `qFade = 1`, and `buttonUpdate` lowers it by 0.001 per tick, so the text fades out over 10 s.
  - Box visibility: visible iff `qFlag == 1`. In the ending (§6.12): [Compute] is hidden from `dismantle >= 5`, the chips are then removed one at a time, and the box is hidden from `dismantle >= 5 and endTimer4 >= 250`.

Panel visibility: visible iff `compFlag == 1`. Hidden from `dismantle >= 7`.

### 6.9 Middle column: "Projects" panel (`projectsDiv`)

See §5. Visible iff `projectsFlag == 1`. Hidden from `dismantle >= 7`.

### 6.10 Right column

These panels are stacked in this order.

#### (a) "Investments" box (`investmentEngine`, boxed)

- Header row: bold "Investments" followed by a dropdown `investStrat` with the options "Low Risk" (value low, default), "Med Risk" (med), and "High Risk" (hi). Section 03 reads it.
- Left block: [ Deposit ] with [ Withdraw] below it. Both are always enabled.
- Right block (small text):
  - "Cash: $`grp(bankroll)`"
  - "Stocks: $`grp(secTotal)`"
  - bold "Total: $`grp(portTotal)`"
- Stock table (small text, zebra-striped rows):
  - Header columns: "Stock", "Amt.", "Price", "Total", "P/L"
  - Five fixed rows, one per portfolio slot. Section 03 fills or blanks them.

#### (b) Investment upgrade (`investmentEngineUpgrade`, unboxed, directly below)

- [Upgrade Investment Engine] " Level: `raw(investLevel)`"
- "Cost: `grp(investUpgradeCost)` Yomi"
- [Upgrade Investment Engine] is disabled iff `yomi < investUpgradeCost`.

Visibility of (a) and (b): visible iff `investmentEngineFlag == 1`. Because `buttonUpdate` forces that flag to 0 every tick while `humanFlag == 0`, both are hidden from phase 2 onward.

#### (c) "Strategic Modeling" box (`strategyEngine`, boxed)

- Header row: bold "Strategic Modeling", then a dropdown `stratPicker` with "Pick a Strat" (value 10, default) and "RANDOM" (value 0). Section 03 adds more strategies as they unlock. Then [Run].
  - [Run] is disabled at start. Section 03 owns its enabling: a new tournament enables it, and running disables it.
- Status text `tourneyDisplay`, initially "Pick strategy, run tournament, gain yomi".
- A tournament area about 58 px tall, which shows one of two views:
  - **Grid view:** the vertical-strategy label is centred above the matrix, and the horizontal-strategy label is centred to its left. The 2×2 payoff matrix has column headers "Move A", "Move B" and row headers "Move A", "Move B" (bold, right-aligned). Each cell shows "h,v" (horizontal payoff, vertical payoff; initially "0,0"). Cells have 1 px black borders.
  - **Results view:** a 2-column × 4-row list of standings `results0..7`, filled in column order (results0–3 in the left column, 4–7 in the right). Each entry reads "`rank`. `name`: `score`". The player's picked strategy is bold.
  - Which view shows:
    - `newTourney` shows the grid.
    - Finishing a tournament shows the results and sets `resultsFlag = 1`.
    - While `resultsFlag == 1`, hovering the pointer over the tournament area shows the grid and resets `resultsTimer = 0`; moving the pointer off it shows the results again.
    - On load, the results view is hidden.
- "Yomi: `grp(yomi)`"

#### (d) Tournament management (`tournamentManagement`, unboxed, directly below)

- One row: [ New Tournament ] [AutoTourney] `autoTourneyStatus` text "ON"/"OFF" (1 = "ON", the initial value).
- "Cost: `grp(tourneyCost)` ops"
- [ New Tournament ] is enabled iff `operations >= tourneyCost and tourneyInProg == 0`.
- [AutoTourney] and its status text are visible iff `autoTourneyFlag == 1`. The button is always enabled.

Visibility of (c) and (d): visible iff `strategyEngineFlag == 1`. Both are hidden from `dismantle >= 4`.

**AutoTourney automation** (runs inside `buttonUpdate`; section 03 owns the tournament functions):

```
if resultsFlag == 1 and autoTourneyFlag == 1 and autoTourneyStatus == 1 and results view is currently shown:
    resultsTimer += 1
    if resultsTimer >= 300 and operations >= tourneyCost:
        newTourney(); runTourney(); resultsTimer = 0
```

Hovering the grid therefore pauses auto-tourneys, and resets the 3-second wait. This is intentional.

#### (e) Combat view (`battleCanvasDiv`)

- The 310×150 drawing area (section 07). Overlaid text, top-left:
  - bold "Combat"
  - the battle name (`battleName`, e.g. "Drifter Attack 3", or a generated name once battles are named)
  - a centred result block, `victoryDiv`: "VICTORY" or "DEFEAT", then "`+`|`-``honorAmount` honor"
  - "Scale = `numberCruncher(unitSize, 0)`:1"
- The result block is hidden by default. Section 07 shows it only at the end of a battle once `project121.flag == 1`, and hides it when the battle closes (§10, D4).
- Visible iff `battleFlag == 1`. Hidden during the ending from `dismantle >= 1 and endTimer1 >= 175`.

#### (f) Honor line (`honorDiv`)

- "Honor: `grp(round(honor))`"
- Visible iff `project121.flag == 1`. Hidden from `dismantle >= 1 and endTimer1 >= 190`.

#### (g) "Power" panel (`powerDiv`)

Heading "Power" and a rule. Contents, in order:

- "Factory/Drone Performance: `performance`%". The value is `grp(round(powMod*100))`, or "0" when `factoryLevel == 0 and harvesterLevel == 0 and wireDroneLevel == 0`.
- "Consumption: `grp(round(demand*100))` MWs". Here `demand` is the local power demand in section 04, not the market `demand`.
- Two small-text lines:
  - "Factories: `grp(round(fDemand*100))` MWs"
  - "Drones: `grp(round(dDemand*100))` MWs"
- "Production: `grp(round(supply*100))` MWs"
- [Solar Farm] followed by the count `grp(farmLevel)`. Then a row [+10] [+100]. Then [Disassemble All], with tooltip "+`numberCruncher(farmBill)` clips". Then "Cost: `numberCruncher(farmCost)` clips".
- "Storage: `grp(round(storedPower))` / `grp(round(batteryLevel*batterySize))` MW-seconds"
- [Battery Tower] followed by the count `grp(batteryLevel)`. Then [+10] [+100]. Then [Disassemble All], with tooltip "+`numberCruncher(batteryBill)` clips". Then "Cost: `numberCruncher(batteryCost)` clips".
- Enable rules (evaluated only while `spaceFlag == 0`):
  - [Solar Farm] is disabled iff `unusedClips < farmCost`; [+10]/[+100] are disabled iff `unusedClips < p10f / p100f`.
  - [Battery Tower] is disabled iff `unusedClips < batteryCost`; [+10]/[+100] are disabled iff `unusedClips < p10b / p100b`. Section 04 gives the sums.
  - Farm [Disassemble All] is disabled iff `farmLevel < 1`; battery [Disassemble All] is disabled iff `batteryLevel < 1`.

Visibility: visible iff `project127.flag == 1 and spaceFlag == 0`. This is evaluated by section 04's power update every tick, so the panel exists in phase 2 only.

#### (h) "Von Neumann Probe Design" box (`probeDesignDiv`, boxed)

Section 04 owns what each stat does.

- Bold title "Von Neumann Probe Design"
- "Trust: `raw(probeUsedTrust)` / `raw(probeTrust)` (`grp(maxTrust)` Max)"
- Eight rows. Each row is [<] [>] then "`Label`: `raw(value)`". Hovering the label shows a tooltip (texts verbatim):

  | Row | Label | Value | Tooltip |
  |---|---|---|---|
  | 1 | Speed | `probeSpeed` | Modifies rate of exploration |
  | 2 | Exploration | `probeNav` | Rate at which probes gain access to new matter |
  | 3 | Self-Replication | `probeRep` | Rate at which probes generate more probes (each new probe costs 100 quadrillion clips) |
  | 4 | Hazard Remediation | `probeHaz` | Reduces damage from dust, junk, radiation, and general entropic decay |
  | 5 | Factory Production | `probeFac` | Rate at which probes build factories (each new factory costs 100 million clips) |
  | 6 | Harvester Drone Production | `probeHarv` | Rate at which probes spawn Harvester Drones (each new drone costs 2 million clips) |
  | 7 | Wire Drone Production | `probeWire` | Rate at which probes spawn Wire Drones (each new drone costs 2 million clips) |
  | 8 | Combat | `probeCombat` | Determines offensive and defensive effectiveness in battle |

  Row 8 (`combatButtonDiv`) is visible iff `project131.flag == 1`.
- Enable rules, for every row:
  - [>] is disabled iff `probeTrust − probeUsedTrust < 1`.
  - [<] is disabled iff that row's value `< 1`.
  - (`probeUsedTrust` is recomputed at the start of these rules each tick, §1.1.)
- Visible iff `spaceFlag == 1`. Hidden from `dismantle >= 1`, immediately.

#### (i) Probe trust purchase row

Two blocks side by side, directly below the probe design box:

- **Increase probe trust** (`increaseProbeTrustDiv`): [Increase Probe Trust], then "Cost: `grp(floor(probeTrustCost))` yomi".
  - Disabled iff `yomi < probeTrustCost or probeTrust >= maxTrust`.
  - Visible iff `spaceFlag == 1`. Hidden from `dismantle >= 1 and endTimer1 >= 50`.
- **Increase max trust** (`increaseMaxTrustDiv`): [Increase Max Trust], then "Cost: `money(maxTrustCost)` honor" (`maxTrustCost` is the constant 91117.99, so this reads "91,117.99").
  - Disabled iff `honor < maxTrustCost`.
  - Visible iff `project121.flag == 1`. Hidden from `dismantle >= 1 and endTimer1 >= 100`.

### 6.11 The three game phases

| Phase | Condition | Switched by |
|---|---|---|
| 1. Human / business | `humanFlag == 1` (and `spaceFlag == 0`) | initial state |
| 2. Earth consumption (drones) | `humanFlag == 0 and spaceFlag == 0` | effect of "Release the HypnoDrones" (`project35`) sets `humanFlag = 0` and fires the HypnoDrone event |
| 3. Space | `humanFlag == 0 and spaceFlag == 1` | effect of "Space Exploration" (`project46`) sets `spaceFlag = 1` |
| Ending | `spaceFlag == 1`, `dismantle` 1–7 | disassembly projects (05/06, section 04) |

What each phase shows. Each panel still needs its own unlock flag, given in brackets.

- **Phase 1:** [Make Paperclip], Business, phase-1 Manufacturing (AutoClipper / MegaClipper / WireBuyer lines when unlocked), Computational Resources with Trust [compFlag], Creativity [creativityOn], Quantum [qFlag], Projects [projectsFlag], Investments + upgrade [investmentEngineFlag], Strategic Modeling + management [strategyEngineFlag].
- **Phase 2:**
  - Hidden: Business, phase-1 Manufacturing, Trust lines, Investments, and the WireBuyer line.
  - Shown: phase-2/3 Manufacturing, plus Unused Clips [tothFlag], factory [factoryFlag], wire line (until Wire Production appears), Wire Production [wireProductionFlag] with its harvester [harvesterFlag] and wire drone [wireDroneFlag] sub-panels, Power [project127], Swarm box, gifts, and slider [swarmFlag].
  - Unchanged from phase 1: Computational Resources (minus Trust), Projects, Quantum, Strategic Modeling.
- **Phase 3:**
  - Hidden: the factory, harvester, wire drone, and Power build panels.
  - Shown: the "Factories: N" and "Harvester Drones / Wire Drones" summaries, the matter-discovery rate line, Space Exploration, Probe Design, and Increase Probe Trust.
  - Shown when unlocked: Drifter lines and Combat view [battleFlag], combat row [project131], Honor and Increase Max Trust [project121].
  - Unchanged: Swarm, Strategic Modeling, Quantum, Projects, Computational Resources.

### 6.12 Ending teardown

These rules are evaluated every main tick after `buttonUpdate`, and they override it. Section 04 owns the timers (`endTimer1..6`, `dismantle`) and the ending mechanics. This is the UI side, in the order the original evaluates it.

- `dismantle >= 1`:
  - hide Probe Design (immediately)
  - if `endTimer1 >= 50`: hide Increase Probe Trust
  - if `endTimer1 >= 100`: hide Increase Max Trust
  - if `endTimer1 >= 150`: hide Space Exploration
  - if `endTimer1 >= 175`: hide the Combat view
  - if `endTimer1 >= 190`: hide the Honor line
- `dismantle >= 2`:
  - hide Wire Production and show the wire line (`wireTransDiv`)
  - if `endTimer2 >= 50`: hide Swarm Gifts
  - if `endTimer2 >= 100`: hide the Swarm box
  - if `endTimer2 >= 150`: hide the slider
- `dismantle >= 3`: hide "Factories: N" (`factoryDivSpace`), "Clips per Second", and "Unused Clips".
- `dismantle >= 4`: hide Strategic Modeling and Tournament management.
- `dismantle >= 5`:
  - hide [Compute]
  - set every chip's value and displayed opacity to 0.5 (03 §1.5)
  - then hide the chips one at a time as `endTimer4` reaches 10, 60, 100, 130, 150, 160, 165, 169, 172, 174 (chips 9, 8, 7, 6, 5, 4, 3, 2, 1, 0 in that order)
  - hide the whole Quantum box at `endTimer4 >= 250`
  - Each chip hiding coincides with section 04 adding 1 wire. The wire line must show the new value (§10, D10).
- `dismantle >= 6`: hide Processors (the Memory line stays).
- `dismantle >= 7`: hide Computational Resources and Projects.
- `endTimer6 >= 250`: hide the phase-2/3 Manufacturing panel. After this only the console, the clip counter, [Make Paperclip], and the save and debug buttons remain. The Wire Production panel is already hidden from `dismantle >= 2`.
- The credits then arrive as console messages: at `endTimer6` 500, 600, 700, 800, and 900 (section 04 owns the gating). In order:
  1. "Universal Paperclips"
  2. "a game by Frank Lantz"
  3. "combat programming by Bennett Foddy"
  4. "'Riversong' by Tonto's Expanding Headband used by kind permission of Malcolm Cecil"
  5. "© 2017 Everybody House Games"

---

## 7. Progression map (reveal order across a typical playthrough)

Triggers come from sections 01/04/05/06/07. Where a project is named, its unlock condition (trigger) is shown in parentheses, and the reveal happens when the player completes it.

1. **Start:** Console ("Welcome to Universal Paperclips"), clip counter, [Make Paperclip], Business (minus revenue lines), phase-1 Manufacturing (Clips per Second, Wire). Everything else is hidden.
2. **`funds >= 5`:** the AutoClippers line (`autoClipperFlag`). Console: "AutoClippers available for purchase".
3. **`ceil(clips) >= 2000`, or the player is stuck (`unsoldClips < 1 and funds < wireCost and wire < 1`):** `compFlag = projectsFlag = 1`. Computational Resources (Trust, Processors, Memory, Operations) and the Projects panel appear. Console: "Trust-Constrained Self-Modification enabled".
4. **RevTracker** (available as soon as projects exist): revenue lines.
5. **Creativity** (operations at max): Creativity line.
6. **WireBuyer** (`wirePurchase >= 15`): WireBuyer line.
7. **Algorithmic Trading** (`trust >= 8`): Investments box and Investment upgrade.
8. **MegaClippers** (`clipmakerLevel >= 75`): MegaClippers line.
9. **Strategic Modeling** (after Donkey Space, `creativity >= 250`): Strategic Modeling box and Tournament management.
10. **Quantum Computing** (`processors >= 5`): Quantum box. Photonic Chip projects then make the chips flicker.
11. **AutoTourney** (Strategic Modeling unlocked, `trust >= 90`): [AutoTourney] and its status.
12. **Release the HypnoDrones** (after Hypno Harmonics → HypnoDrones; costs 100 Trust): HypnoDrone event; **phase 2**.
    - Hidden: Business, phase-1 Manufacturing, Trust, Investments, WireBuyer.
    - Shown: phase-2/3 Manufacturing (Clips per Second, Wire).
13. **Tóth Tubule Enfolding** (Tóth Sausage Conjecture done and `humanFlag == 0`): `tothFlag` → Unused Clips.
14. **Power Grid** (`tothFlag == 1`): Power panel.
15. **Nanoscale Wire Production** (Power Grid done): Wire Production panel (the wire line moves into it).
16. **Harvester Drones / Wire Drones** (Nanoscale done): their sub-panels. **Clip Factories** (both drone projects done): factory sub-panel and factory upgrade line.
17. **Swarm Computing** (`harvesterLevel + wireDroneLevel >= 200`): Swarm box, Swarm Gifts, Work/Think slider.
18. **Space Exploration** (`availableMatter == 0` in phase 2): **phase 3**.
    - Shown: Space Exploration, Probe Design, Increase Probe Trust, the factory/drone summaries, the matter discovery rate.
    - Hidden: the Power panel and the factory/drone build panels.
    - Console: "Terrestrial resources fully utilized in …" (milestone).
19. **First probe losses:** the "Lost to hazards" / "Lost to value drift" lines appear when each count reaches 1 or more.
20. **First battle** (section 07: `drifterCount > warTrigger` with probes alive): `battleFlag = 1` → Drifter lines and Combat view. When combat losses reach 1 or more, the "Lost in combat" line appears.
21. **Combat** project (`probesLostCombat >= 1`): Combat row in Probe Design.
22. **Name the battles** (`probesLostCombat >= 10,000,000`): Honor line, Increase Max Trust, and VICTORY/DEFEAT results in the Combat view.
23. **Universe fully converted** (`milestoneFlag` reaches 15): the clip counter freezes into the ending strings, and the Emperor of Drift message projects begin, ending in the Accept/Reject choice.
    - **Accept** → "The Universe Next Door" / "The Universe Within" → game reset (section 08). In the next universe the **Prestige bar** is visible from the start.
    - **Reject** → the disassembly projects → ending teardown (§6.12) → credits.

---

## 8. Title screen

- A single screen with a white background. The title image (a white cardboard box of paperclips labelled "Universal Paperclips", "100 COUNT", about 453 × 355 px) is centred horizontally and vertically.
- Clicking the image opens the game screen. There are no other controls.
- The original's analytics tags are not part of the game; leave them out.

---

## 9. Panel inventory (identifier → screen location)

This is a quick cross-reference for other sections.

- **Top:** HypnoDrone banner; console (`readout1`–`readout5`, cursor); prestige bar (`prestigeDiv`); clip counter (`clips`, tooltip `clipCountCrunched`).
- **Left column:** `btnMakePaperclip`; `creationDiv` (`factoryUpgradeDisplay`, `clipsPerSecDiv`, `tothDiv`, `factoryDiv`, `wireTransDiv`, `factoryDivSpace`); `wireProductionDiv` (`droneUpgradeDisplay`, `mdpsDiv`, `harvesterDiv`, `wireDroneDiv`, `droneDivSpace`); `spaceDiv` (`probeDiv`, `hazardBodyCount`, `driftBodyCount`, `combatBodyCount`, `drifterDiv`); `businessDiv` (`revPerSecDiv`); `manufacturingDiv` (`wireBuyerDiv`, `autoClipperDiv`, `megaClipperDiv`); save/load/reset; debug buttons.
- **Middle column:** `compDiv` (`trustDiv`, `swarmGiftDiv`, `processorDisplay`, `memoryDisplay`, `creativityDiv`, `swarmEngine`, `swarmSliderDiv`, `qComputing`); `projectsDiv` (`projectListTop`).
- **Right column:** `investmentEngine`; `investmentEngineUpgrade`; `strategyEngine` (`tournamentStuff` = `tournamentTable` / `tournamentResultsTable`); `tournamentManagement` (`autoTourneyControl`, `autoTourneyStatusDiv`); `battleCanvasDiv` (`victoryDiv`); `honorDiv`; `powerDiv`; `probeDesignDiv` (`combatButtonDiv`); `increaseProbeTrustDiv`; `increaseMaxTrustDiv`.

---

## 10. Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

#### 02-D1 — Project insertion call
- **Location:** `displayProjects`.
- **Original behavior:** calls `appendChild(newProject, element.firstChild)`. The second argument looks like an attempt to insert at the top, but append ignores it, so every new button goes to the bottom of the list.
- **Fixed behavior:** append at the bottom (§5.2). This matches what players of the original see.
- **Category:** Code-only (no observable effect)
- **Player impact:** none. The fixed behavior is the observed behavior.
- **Recommendation:** Fix
- **Rationale:** Specifying "bottom" removes the ambiguous call without changing anything on screen. Inserting at the top would be a visible change and is not recommended.

#### 02-D2 — Blink counter shared globally
- **Location:** `blink`, global `blinkCounter`.
- **Original behavior:** every running blink increments one global `blinkCounter`; the timer that pushes it to 12 stops, sets its element visible and resets the counter to 0, and the others carry on from 0. Two buttons created in the same tick end after about 180 ms and 540 ms instead of 360 ms each; five end at about 90, 180, 270, 450 and 810 ms. `blinkCounter` is also saved and loaded, so a save taken mid-blink shortens the first blink after load. Every blink still ends with its element visible.
- **Fixed behavior:** each blink has its own counter and runs 11 toggles over about 360 ms (§4.2). The counter is not persisted.
- **Category:** Display
- **Player impact:** cosmetic only. When several projects appear together (or on load) they flash in step instead of for uneven lengths. No effect on gameplay.
- **Recommendation:** Fix
- **Rationale:** Purely visual timing; the fixed version is the clear intent and cannot leave anything hidden.

#### 02-D3 — HypnoDrone strobe counter shared and re-entrant
- **Location:** `longBlink` / `hypnoDroneEvent`, global `longBlinkCounter`.
- **Original behavior:** one global counter and no guard. A second trigger while one is running starts a second 32 ms timer on the same counter and banner. The counter then rises twice per 32 ms; the timer that pushes it to 120 stops, hides the banner and resets the counter to 0, and the other timer then runs a further full 120 steps alone. A retrigger therefore *extends* the event: retriggering at 0 / 0.5 / 1.92 / 3 s after the first gives a total of about 5.8 / 6.0 / 6.7 / 7.3 s instead of 3.84 s. While both timers run, the banner toggles twice per interval, so it looks steady or flickers irregularly, and the retrigger resets the text to "Release". In normal play only the debug button "Destroy all Humans" can retrigger it; "Release the HypnoDrones" has one use and its button is removed when clicked.
- **Fixed behavior:** one instance at a time; a retrigger restarts it from step 0 (§4.3).
- **Category:** Display
- **Player impact:** none in normal play (needs the debug button). Cosmetic otherwise.
- **Recommendation:** Fix
- **Rationale:** Visual only and unreachable without debug tools.

#### 02-D4 — Combat result block visible on a fresh game
- **Location:** `victoryDiv` (combat view overlay).
- **Original behavior:** the block is visible by default in the page and is hidden only by the post-load `refresh()` or by `endBattle`. `refresh()` runs only when a save or a prestige save exists. A player who starts with no save and plays to the first battle without reloading sees the placeholder "VICTORY / +200 honor" for the whole first battle, long before "Name the battles" exists. After that battle it never reappears until `project121.flag == 1`.
- **Fixed behavior:** hidden by default; shown only by section 07 at battle end once `project121.flag == 1` (§6.10e).
- **Category:** Display
- **Player impact:** removes a misleading placeholder from one battle in a first-ever, unreloaded session. No effect on honor or outcomes.
- **Recommendation:** Fix
- **Rationale:** The placeholder shows a value that never happened.

#### 02-D5 — Displays only updated by events show wrong values at start
- **Location:** fields filled only by purchase handlers, project effects, or the post-load `refresh()` (which runs only when a save or prestige save exists).
- **Original behavior:** in a session started without a save, until the relevant event runs, the game shows:
  - "Next Upgrade at: 0 Factories" / "0 Drones" (true values 10 / 500) until the first factory or drone purchase
  - Solar Farm and Battery Tower "Cost: 0 clips" (true values 10,000,000 / 1,000,000) until the first farm or battery purchase
  - "(0 Max)" for max probe trust (true value 20) until Increase Max Trust is bought
  - probe trust "Cost: 0 yomi" (true value 200) until the first Increase Probe Trust
  - "Price per Clip: $ .25" instead of "0.25" until the first price change
  - MegaClippers "Cost: $ 500" instead of "500.00" until the first MegaClipper purchase
  - "+1 Trust at" placeholder 1000 (true value 3,000) and "Public Demand" placeholder 10. These two are corrected on the first tick.
  Enable states always use the true values, so for example Increase Probe Trust stays disabled at 0 yomi even though the cost reads 0. (The swarm Entertain cost is rewritten every tick while the swarm is Bored, so it is not affected.)
- **Fixed behavior:** every field shows its current source value in its specified format at all times (§1.1).
- **Category:** Display
- **Player impact:** removes wrong numbers that could mislead a first-session player (e.g. "Cost: 0 yomi"). No mechanical change.
- **Recommendation:** Fix
- **Rationale:** Display bug; the true values are what the buttons already obey. Also required by 00-overview §4.4.

#### 02-D6 — Drone upgrade line not gated on a drone flag
- **Location:** `droneUpgradeDisplay` in `buttonUpdate`.
- **Original behavior:** the factory upgrade line requires `project45.flag`, but the drone line has no unlock condition of its own. It shows whenever the Wire Production panel is visible, which is before the Harvester/Wire Drone projects are done. Combined with 02-D5 it reads "0 Drones" until the first drone purchase. It is hidden once `maxDroneLevel >= 50000`, and there is no rule that shows it again (harmless: `maxDroneLevel` never decreases).
- **Fixed behavior (optional variant):** visible iff (`harvesterFlag == 1 or wireDroneFlag == 1`) and `maxDroneLevel < 50000`.
- **Category:** Display
- **Player impact:** with 02-D5 fixed, the original rule just shows "Next Upgrade at: 500 Drones" a little before the drone projects appear (typically seconds to a few minutes). The variant hides it during that gap.
- **Recommendation:** Keep original, fix as optional variant
- **Rationale:** Once 02-D5 is fixed nothing on screen is wrong, and gating on a flag would be a guess at intent. The main text uses `maxDroneLevel < 50000` within the Wire Production panel (same as the original, with the missing "else" written out), in line with 04-D16.

#### 02-D7 — Swarm action blocks
- **Location:** the Swarm box markup and `updateSwarm`.
- **Original behavior:** the Feed, Teach, Clad and Synchronize "Cost:" fields share one element id, `swarmFeedCost`, which nothing ever writes. The Synchronize cost is hard-coded text "5,000"; `synchCost` is a constant 5,000, so the text is always right. The Feed/Teach/Clad blocks (statuses 1 Hungry, 2 Confused, 4 Cold) can never show because nothing assigns those statuses, and their handlers do not exist.
- **Fixed behavior:** show `grp(synchCost)` and `grp(entertainCost)` from state; omit the three dead blocks.
- **Category:** Code-only (no observable effect)
- **Player impact:** none. "5,000" is shown either way, and the dead blocks never appeared.
- **Recommendation:** Fix
- **Rationale:** Same output with cleaner structure.

#### 02-D8 — Public Demand shown at the wrong scale for one tick
- **Location:** `raisePrice`, `lowerPrice`, and the effects of Hostile Takeover / Full Monopoly.
- **Original behavior:** these write the raw `demand` (`toFixed(2)` in the price buttons, unformatted in the projects) into the "Public Demand" field. The next tick overwrites it with `demand*10`, so for 10 ms the field shows one-tenth of the true value.
- **Fixed behavior:** the field always shows `grp(round(demand * 10))`.
- **Category:** Display
- **Player impact:** removes a one-frame flicker on each price click. None on play.
- **Recommendation:** Fix
- **Rationale:** Invisible-to-barely-visible glitch with no mechanical role.

#### 02-D9 — Inconsistent count formats
- **Location:** "Launched" (`probesLaunchedDisplay`) and the factory, harvester and wire-drone counts.
- **Original behavior:** "Launched" is written with `numberCruncher` on launch but raw on load. The factory count is raw when bought (so "1000" rather than "1,000"), the drone counts are grouped when bought and raw after Disassemble All or load, and all three are written with `numberCruncher` when probes spawn them (by then their panels are hidden).
- **Fixed behavior:** the formats in §6: "Launched" `numberCruncher`; phase-2 build counts `grp`.
- **Category:** Display
- **Player impact:** consistent number formatting; no gameplay effect.
- **Recommendation:** Fix
- **Rationale:** Formatting only.

#### 02-D10 — Ending wire display lag
- **Location:** `dismantle >= 5` steps of the ending, `endTimer4 == 165` (same as 04-D12).
- **Original behavior:** each chip step adds 1 wire and writes the raw `wire` into the wire line, except the step at `endTimer4 == 165`, which adds the wire without writing it. The line shows one less than the true value from tick 165 until tick 169 (about 40 ms) or until the player makes a clip.
- **Fixed behavior:** the wire line always shows `numberCruncher(wire)` with the singular/plural unit (§6.2).
- **Category:** Display
- **Player impact:** none noticeable (a 40 ms lag). Wire itself is unaffected.
- **Recommendation:** Fix
- **Rationale:** Display only.

#### 02-D11 — qOps fade not clamped
- **Location:** `qFade` in `buttonUpdate`.
- **Original behavior:** `qFade` drops by 0.001 every tick forever (about −360 per hour of play) and is saved that way. The rendered opacity is clamped by the platform, so nothing shows.
- **Fixed behavior:** clamp the displayed opacity to [0, 1]; optionally stop decrementing at 0.
- **Category:** Code-only (no observable effect)
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Keeps state bounded with identical visuals.

#### 02-D12 — Gift countdown "Infinity hours" and blank text
- **Location:** `updateSwarm`, the "Next gift in" line (display side of 04-D7).
- **Original behavior:** with the slider at full "Work" (`sliderPos == 0`) the gift rate is 0, `giftCountdown` becomes `(giftPeriod − giftBits) / 0 = Infinity`, and the line reads "Next gift in Infinity hours". When under 1 s remains, `timeCruncher` returns "" and the line reads "Next gift in " with nothing after it.
- **Fixed behavior:** hide the line while the gift rate is 0; show "Next gift in less than 1 second" when the remaining time is under 1 s. Never render "Infinity" or "NaN". The value and gift trigger of `giftCountdown` are owned by section 04 (04-D7) and are not changed here.
- **Category:** Display
- **Player impact:** text only; gift timing is unchanged.
- **Recommendation:** Fix
- **Rationale:** Display bug. Matches the 04-D7 recommendation to hide the line at rate 0.

#### 02-D13 — Project click does not re-check its cost
- **Location:** project buttons (`displayProjects` click handler) and other purchase handlers without their own check.
- **Original behavior:** a click runs the effect with no check. Enable states are refreshed once per tick (10 ms), and the clicked button is removed, so the only gap is a second, different purchase clicked within the same tick after a first one has spent the shared resource (or a click in the first tick after load, before `manageProjects` sets enable states). That purchase still succeeds and can take ops, creativity, trust, yomi or funds negative.
- **Fixed behavior:** run the effect only if `cost()` is true at click time; same for every purchase button whose handler does not check its own cost (00-overview §4.3).
- **Category:** Gameplay
- **Player impact:** negligible for a human (needs two clicks within 10 ms). Closes an exploit for scripted or auto-clicker play.
- **Recommendation:** Fix
- **Rationale:** Already ruled in 00-overview §4.3; the exploit is the only effect.

#### 02-D14 — Active projects reorder on load
- **Location:** `load`/`load1`/`load2` (section 08).
- **Original behavior:** saves the active project ids in display order, but rebuilds the list by walking the catalog, so after any page reload or slot load the buttons appear in catalog order. They all blink on rebuild.
- **Fixed behavior:** rebuild in the saved display order. Restored buttons still blink.
- **Category:** Display
- **Player impact:** the list keeps its order across reloads. Catalog order roughly follows progression, so the change is usually small. No effect on which projects are available.
- **Recommendation:** Fix
- **Rationale:** Display only.

#### 02-D15 — "Descendents" spelling
- **Location:** Space Exploration panel label.
- **Original behavior:** "Descendents: N".
- **Fixed behavior (optional variant):** "Descendants: N".
- **Category:** Display
- **Player impact:** text only.
- **Recommendation:** Keep original, fix as optional variant
- **Rationale:** Text is verbatim by convention (00-overview §3) and players know this label. The corrected spelling is an acceptable variant if the project owner prefers it.

#### 02-D16 — Debug log line
- **Location:** `longBlink`.
- **Original behavior:** writes "weed wizzard" to the developer console when the HypnoDrone event ends.
- **Fixed behavior:** no log line.
- **Category:** Code-only (no observable effect)
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Developer leftover, not visible in the game.

#### 02-D17 — Cheat buttons always visible
- **Location:** bottom of the left column.
- **Original behavior:** the ten debug/cheat buttons (§6.7) are part of the normal UI in this source and always enabled.
- **Fixed behavior:** hidden behind a debug option that is off by default (00-overview §4.10; section 08 specifies what they do).
- **Category:** Gameplay
- **Player impact:** large if it were kept (one click grants clips, money, trust, ops, creativity, yomi, prestige, or skips to phase 2). With the fix, normal play has no cheats.
- **Recommendation:** Fix
- **Rationale:** An exploit by any measure, and already ruled in 00-overview §4.10.

#### 02-D18 — Processor/Memory purchase after the humans are gone
- Duplicate of **01-D9**; see 01-D9 and 01 §7.2 for the recommendation and behavior. 00-overview §4.6 applies.

#### 02-D19 — Project button text fixed at creation
- **Location:** `displayProjects`.
- **Original behavior:** the title and `priceTag` are copied into the button once, when it is created. If a project's title or tag changes while its button is shown (e.g. project 133's title from `threnodyTitle`, or tags fixed up on load), the button keeps the old text until it next appears.
- **Fixed behavior:** title and `priceTag` are derived from current state whenever the button is shown (§5.3, 00-overview §4.4).
- **Category:** Display
- **Player impact:** labels stay current; costs and effects are unchanged.
- **Recommendation:** Fix
- **Rationale:** Required by 00-overview §4.4; related entries are 05-D3, 06-D3 and 06-D4.

**Design quirks that are not defects (keep them):**
- Hovering the tournament grid pauses AutoTourney.
- The HypnoDrone banner pushes the layout down while it strobes.
- The phase-2/3 panel reuses the heading "Manufacturing".
- Investments and WireBuyer are forced off once the humans are gone.
- The AutoClipper line appears one tick after `funds` reaches 5.
