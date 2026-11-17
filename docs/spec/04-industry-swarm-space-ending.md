# 04: Industry (Phase 2/3), Swarm, Power, Space Exploration, and the Ending

Scope: everything that runs after the HypnoDrones are released (`humanFlag == 0`). That covers clip factories, harvester and wire drones, matter acquisition and processing, the power grid, Swarm Computing, the Earth-to-space transition, Von Neumann probes and probe design, and the final dismantling ending with credits.

Cross-references:
- Tick cadence, `clipClick`, `numberCruncher`, `timeCruncher`, `displayMessage`, milestones: section 01.
- Panel layout and general visibility rules: section 02. This section gives the visibility conditions for its own panels. Where the ending hides panels, the ending rule overrides every other visibility rule for the rest of the game.
- Quantum chips (`qChips`), operations, `yomi`, `creativity`, processors/memory: sections 01 and 03.
- Project definitions (triggers, costs, effects): sections 05 and 06. This section restates the project effects that drive these systems (projects 46, 127, 130, 148, 210–216) so the sequencing reads in one place. Section 05/06 is authoritative for each project record.
- Battles, `honor` gains and losses, drifter combat, `attackSpeed`: section 07.
- Save/load, prestige (projects 200/201), reset: section 08.

Conventions:
- One "tick" is one run of the main fast loop, 100 ticks per second (section 01). Every per-tick rate below is per tick. Displays that say "per sec" show the per-tick value × 100.
- `random()` is uniform on [0,1). This section's systems use no randomness. The only random call in the war hook is inside combat (section 07).
- "Integer display" means the value shown as a whole number with comma thousands separators (e.g. `12,345`).
- Clip counts, drone counts, factory counts and probe counts are real numbers. In space they become fractional. Keep them as floating point (IEEE double) and apply `floor` only where stated.

---

## 1. State owned by this section

| Name | Initial | Meaning |
|---|---|---|
| `factoryFlag` | 0 | Clip Factory build panel unlocked (project 45) |
| `harvesterFlag` | 0 | Harvester Drone build panel unlocked (project 43) |
| `wireDroneFlag` | 0 | Wire Drone build panel unlocked (project 44) |
| `wireProductionFlag` | 0 | Wire Production panel unlocked (project 41) |
| `factoryLevel` | 0 | number of clip factories |
| `factoryCost` | 100000000 | clips for the next factory |
| `factoryBill` | 0 | total clips spent on factories since the last factory reboot |
| `factoryRate` | 1000000000 | clips per tick per factory before modifiers (projects 100/101 multiply it by 100 and 1000) |
| `factoryBoost` | 1 | project 102 sets it to 1000 |
| `maxFactoryLevel` | 0 | highest `factoryLevel` ever reached via purchase |
| `harvesterLevel` | 0 | number of harvester drones |
| `harvesterCost` | 1000000 | clips for the next harvester |
| `harvesterBill` | 0 | clips spent on harvesters since last reboot |
| `harvesterRate` | 26180337 | grams of matter per tick per harvester (×100 by project 110, ×1000 by project 111) |
| `wireDroneLevel` | 0 | number of wire drones |
| `wireDroneCost` | 1000000 | clips for the next wire drone |
| `wireDroneBill` | 0 | clips spent on wire drones since last reboot |
| `wireDroneRate` | 16180339 | inches of wire per tick per wire drone (×100 by 110, ×1000 by 111) |
| `droneBoost` | 1 | project 112 sets it to 2 |
| `maxDroneLevel` | 0 | highest `harvesterLevel + wireDroneLevel` ever reached via purchase |
| `p10h`, `p100h`, `p1000h` | 0 | bulk prices for +10/+100/+1000 harvesters |
| `p10w`, `p100w`, `p1000w` | 0 | bulk prices for +10/+100/+1000 wire drones |
| `availableMatter` | 6000 × 10^24 (= 6×10^27) | grams of matter that can still be harvested |
| `acquiredMatter` | 0 | grams harvested, not yet turned into wire |
| `foundMatter` | = initial `availableMatter` (6×10^27) | total matter discovered so far (Earth counts as found) |
| `totalMatter` | 30 × 10^54 (= 3×10^55) | matter in the universe |
| `farmLevel` | 0 | solar farms |
| `farmCost` | 10000000 | clips for the next farm |
| `farmBill` | 0 | clips spent on farms since last reboot |
| `farmRate` | 50 | |
| `batteryLevel` | 0 | battery towers |
| `batteryCost` | 1000000 | clips for the next battery |
| `batteryBill` | 0 | |
| `batterySize` | 10000 | storage per battery tower |
| `factoryPowerRate` | 200 | |
| `dronePowerRate` | 1 | |
| `storedPower` | 0 | |
| `powMod` | 0 | performance multiplier applied to factories and drones |
| `momentum` | 0 | project 125 sets it to 1 |
| `p10f`, `p100f`, `p10b`, `p100b` | 0 | bulk prices for farms and batteries |
| `swarmFlag` | 0 | Swarm Computing unlocked (project 126) |
| `swarmStatus` | 7 | current swarm state (see §7) |
| `swarmGifts` | 0 | unspent gifts (spent by Processors/Memory buttons, section 01/03) |
| `nextGift` | 0 | size of the most recent gift |
| `giftPeriod` | 125000 | gift bits needed per gift |
| `giftCountdown` | 125000 (= `giftPeriod`) | ticks until next gift (display only, plus the gift trigger) |
| `giftBits` | 0 | accumulated progress toward the next gift |
| `giftBitGenerationRate` | 0 | gift bits per tick, last computed |
| `sliderPos` | 0 | Work/Think slider value, integer 0..200 |
| `boredomLevel` | 0 | |
| `boredomFlag` | 0 | |
| `boredomMsg` | 0 | boredom message already shown |
| `entertainCost` | 10000 | creativity cost of Entertain the Swarm |
| `disorgCounter` | 0 | |
| `disorgFlag` | 0 | |
| `disorgMsg` | 0 | |
| `synchCost` | 5000 | yomi cost of Synchronize the Swarm (never changes) |
| `spaceFlag` | 0 | space phase active (project 46) |
| `probeCount` | 0 | live probes (real number) |
| `probeLaunchLevel` | 0 | probes launched manually |
| `probeCost` | 10^17 | clips per probe (never changes) |
| `probeDescendents` | 0 | probes born by self-replication |
| `probesLostHaz`, `probesLostDrift`, `probesLostCombat` | 0 | loss counters (`probesLostCombat` is incremented by section 07) |
| `drifterCount` | 0 | probes that have drifted into Drifters (section 07 reduces it in battle) |
| `partialProbeSpawn` | 0 | accumulator for fractional replication |
| `partialProbeHaz` | 0 | accumulator for fractional hazard losses |
| `probeTrust` | 0 | design points available |
| `probeUsedTrust` | 0 | sum of the 8 design attributes (recomputed every tick) |
| `probeTrustCost` | floor((`probeTrust`+1)^1.47 × 200) = 200 | yomi for the next probe trust point |
| `maxTrust` | 20 | cap on `probeTrust` |
| `maxTrustCost` | 91117.99 | honor cost of +10 `maxTrust` (never changes) |
| `honor` | 0 | owned jointly with section 07, displayed here |
| `probeSpeed`, `probeNav`, `probeRep`, `probeHaz`, `probeFac`, `probeHarv`, `probeWire` | 0 | design attributes (integers ≥ 0) |
| `probeCombat` | 0 | 8th design attribute (declared with combat state, section 07) |
| `dismantle` | 0 | ending stage 0..7 |
| `endTimer1` … `endTimer6` | 0 | ending tick counters |
| `finalClips` | 0 | clips made by hand during the final stage |

Constants:

| Name | Value |
|---|---|
| `probeXBaseRate` | 1750000000000000000 (1.75×10^18) |
| `probeRepBaseRate` | 0.00005 |
| `probeHazBaseRate` | 0.01 |
| `probeFacBaseRate` | 0.000001 |
| `probeHarvBaseRate` | 0.000002 |
| `probeWireBaseRate` | 0.000002 |
| `probeDriftBaseRate` | 0.000001 |

---

## 2. Phases at a glance

- **Phase 2 (Earth industry):** `humanFlag == 0`, `spaceFlag == 0`. The player builds factories, harvester drones, wire drones, solar farms and batteries out of `unusedClips`. Harvesters strip Earth's `availableMatter` (6×10^27 g), wire drones turn it into `wire`, and factories turn wire into clips. Power limits performance through `powMod`.
- **Phase 3 (space):** `spaceFlag == 1`, set by project 46 "Space Exploration" once Earth's matter is gone (§9). Manual building stops. Probes explore (raising `availableMatter`), replicate, and build factories and drones automatically. Power is no longer simulated (`powMod` stays at 1).
- **Ending:** after the universe is consumed (milestone 15, section 01) and the player rejects the Drifters' offer (project 148), the player dismantles everything stage by stage and hand-makes the last 100 clips (§10).

Unlock chain, for orientation (all in sections 05/06): project 18 (`tothFlag`) → 127 Power Grid → 41 Nanoscale Wire Production (`wireProductionFlag`) → 43 Harvester Drones (`harvesterFlag`) and 44 Wire Drones (`wireDroneFlag`) → 45 Clip Factories (`factoryFlag`). Factories and drones always exist after the power grid.

---

## 3. Clip factories

### 3.1 Panel ("Manufacturing", Earth)
Visible when `factoryFlag == 1` and `spaceFlag == 0`.
- Button **"Clip Factory"**, followed by `factoryLevel` (integer display). Enabled when `unusedClips >= factoryCost`.
- Button **"Disassemble All"**, with a hover tooltip `"+" + numberCruncher(factoryBill) + " clips"`. Enabled when `factoryLevel != 0`.
- `"Cost: " + numberCruncher(factoryCost) + " clips"`.
- Upgrade hint (see §4.5): `"Next Upgrade at: " + nfup + " Factories"`. Visible when `project45.flag == 1` and `maxFactoryLevel < 50`.

In space, this panel is replaced by the line `"Factories: " + numberCruncher(floor(factoryLevel))` (the space factory line), visible when `spaceFlag == 1`.

### 3.2 makeFactory()
```
unusedClips -= factoryCost
factoryBill += factoryCost
factoryLevel += 1
fcmod = multiplier for the NEW factoryLevel:
    1..7    -> 11 - factoryLevel        (10, 9, 8, 7, 6, 5, 4)
    8..12   -> 2
    13..19  -> 1.5
    20..38  -> 1.25
    39..78  -> 1.15
    79+     -> 1.10
if factoryLevel > maxFactoryLevel: maxFactoryLevel = factoryLevel
updateUpgrades()
factoryCost = factoryCost * fcmod
```
The function itself does not check affordability. Only the button gate does. A reimplementation should also guard inside the action (no-op if `unusedClips < factoryCost`; defect D17).

### 3.3 factoryReboot() ("Disassemble All")
```
factoryLevel = 0
unusedClips += factoryBill
factoryBill = 0
factoryCost = 100000000
```
This refunds every clip spent on factories since the last reboot. `maxFactoryLevel` is kept.

### 3.4 Factory production (each tick)
Runs every tick in both phases, as long as `dismantle < 4`:
```
fbst = 1
if factoryBoost > 1: fbst = factoryBoost * floor(factoryLevel)     // original: unfloored; see defect D14
clipClick( powMod * fbst * (floor(factoryLevel) * factoryRate) )
```
`clipClick(n)` (section 01) turns up to `n` wire into clips. It does nothing if `wire < 1`, and otherwise clamps `n` to `wire`. It adds to `clips`, `unsoldClips`, `unusedClips` and subtracts from `wire`. With project 102, output is quadratic in factory count.

---

## 4. Harvester drones and wire drones

### 4.1 Panels ("Wire Production", Earth)
The Wire Production panel is visible when `wireProductionFlag == 1`, with the ending override in §10. A compact wire line in the Manufacturing panel, `"Wire: " + wire + " " + ("inch" if wire == 1 else "inches")`, is shown while `wireProductionFlag == 0`, hidden once it becomes 1, and shown again from `dismantle >= 2`. The Wire Production panel always shows:
- `"Available Matter: " + numberCruncher(availableMatter) + " g"`
- only when `spaceFlag == 1`: `"(" + numberCruncher(xRate*100) + " g per sec)"` (exploration rate, §8.5)
- `"Acquired Matter: " + numberCruncher(acquiredMatter) + " g"`, then `"(" + maps + " g per sec)"`
- `"Wire: " + numberCruncher(wire) + " inches"`, then `"(" + wpps + " inches per sec)"`
- upgrade hint `"Next Upgrade at: " + ndup + " Drones"` (hidden once `maxDroneLevel >= 50000`)

Harvester sub-panel, visible when `harvesterFlag == 1` and `spaceFlag == 0`:
- Button **"Harvester Drone"** + `harvesterLevel` (integer display). Enabled when `unusedClips >= harvesterCost`.
- Buttons **"+10"**, **"+100"**, **"+1k"**, enabled when `unusedClips >= p10h` / `p100h` / `p1000h`.
- **"Disassemble All"** with tooltip `"+" + numberCruncher(harvesterBill) + " clips"`, enabled when `harvesterLevel != 0`.
- `"Cost: " + numberCruncher(harvesterCost) + " clips"`.

Wire drone sub-panel: identical, with **"Wire Drone"**, `wireDroneLevel`, `wireDroneCost`, `p10w`/`p100w`/`p1000w`, `wireDroneBill`, visible when `wireDroneFlag == 1` and `spaceFlag == 0`.

The drone button enable states are refreshed each tick only while `humanFlag == 0 && spaceFlag == 0`.

In space, the drone sub-panels are replaced by:
`"Harvester Drones: " + numberCruncher(floor(harvesterLevel))` and `"Wire Drones: " + numberCruncher(floor(wireDroneLevel))`.

### 4.2 Drone cost formula
For both kinds, the price of the drone that would become number `k` (1-based) is
```
droneUnitPrice(k) = k^2.25 * 1000000
```
After buying, `harvesterCost = droneUnitPrice(harvesterLevel + 1)`. Initially `harvesterCost = droneUnitPrice(1) = 1,000,000`. The same holds for wire drones.

### 4.3 makeHarvester(amount) / makeWireDrone(amount)
`amount` ∈ {1, 10, 100, 1000}.
```
repeat amount times:
    unusedClips -= harvesterCost
    harvesterBill += harvesterCost
    harvesterLevel += 1
    harvesterCost = (harvesterLevel + 1)^2.25 * 1000000
if harvesterLevel + wireDroneLevel > maxDroneLevel:
    maxDroneLevel = harvesterLevel + wireDroneLevel
updateDronePrices()
updateUpgrades()
```
`makeWireDrone` is the same with `wireDroneLevel`, `wireDroneCost`, `wireDroneBill`. A reimplementation should refuse the purchase if `unusedClips` is below the total that will be charged (see defects D2, D3, D17).

### 4.4 updateDronePrices()
```
p10h   = sum over k = harvesterLevel+1 .. harvesterLevel+10   of k^2.25 * 1000000
p100h  = same over 100 terms
p1000h = same over 1000 terms
p10w / p100w / p1000w: same with wireDroneLevel
```
Called after every drone purchase, every drone reboot, and on load (section 08). It must also run at game start (defect D2). The bulk price must equal what the bulk purchase will actually charge (defect D3).

### 4.5 updateUpgrades() (upgrade hints)
```
nfup = 10 if maxFactoryLevel < 10, else 20 if < 20, else 50 if < 50, else 0
ndup = 500 if maxDroneLevel < 500, else 5000 if < 5000, else 50000 if < 50000, else 0
```
Displayed as integers with separators. Run `updateUpgrades()` at game start and on load too, so the hints never show the placeholder 0 (defect D18). These thresholds mirror the triggers of projects 100/101/102 (factories ≥ 10/20/50) and 110/111/112 (drones ≥ 500/5000/50000). Those projects check current levels, not the max.

### 4.6 harvesterReboot() / wireDroneReboot()
```
harvesterLevel = 0
unusedClips += harvesterBill
harvesterBill = 0
harvesterCost = 1000000      // see defect D1: original sets 2000000
updateDronePrices()
```
Wire drones are the same. `maxDroneLevel` is kept.

---

## 5. Matter acquisition and processing (each tick, both phases)

### 5.1 acquireMatter()
```
if availableMatter > 0:
    dbsth = 1
    if droneBoost > 1: dbsth = droneBoost * floor(harvesterLevel)
    mtr = powMod * dbsth * floor(harvesterLevel) * harvesterRate
    mtr = mtr * ((200 - sliderPos) / 100)
    if mtr > availableMatter: mtr = availableMatter
    availableMatter -= mtr
    acquiredMatter += mtr
    maps display = numberCruncher(mtr * 100)
else:
    maps display = 0
```

### 5.2 processMatter()
```
if acquiredMatter > 0:
    dbstw = 1
    if droneBoost > 1: dbstw = droneBoost * floor(wireDroneLevel)
    a = powMod * dbstw * floor(wireDroneLevel) * wireDroneRate
    a = a * ((200 - sliderPos) / 100)
    if a > acquiredMatter: a = acquiredMatter
    acquiredMatter -= a
    wire += a
    wpps display = numberCruncher(a * 100)
else:
    wpps display = 0
```
Notes:
- The slider factor `(200 - sliderPos)/100` runs from 2.0 (full Work, slider 0) to 0.0 (full Think, slider 200). It is 1.0 at the midpoint. Before Swarm Computing, `sliderPos` stays 0, so drones run at 2×.
- The clamps mean `availableMatter` and `acquiredMatter` reach exactly 0 when exhausted. Project 46's trigger relies on `availableMatter == 0`.

---

## 6. Power (Earth only)

### 6.1 Panel ("Power")
Visible when `project127.flag == 1` and `spaceFlag == 0`.
- `"Factory/Drone Performance: " + P + "%"`, where P = 0 if `factoryLevel == 0 && harvesterLevel == 0 && wireDroneLevel == 0`, else `round(powMod*100)` integer display.
- `"Consumption: " + round(demand*100) + " MWs"`, then indented `"Factories: " + round(fDemand*100) + " MWs"` and `"Drones: " + round(dDemand*100) + " MWs"`.
- `"Production: " + round(supply*100) + " MWs"`.
- Button **"Solar Farm"** + `farmLevel`. Enabled when `unusedClips >= farmCost`. Buttons **"+10"**, **"+100"** are enabled at `p10f`, `p100f`. **"Disassemble All"** (tooltip `"+" + numberCruncher(farmBill) + " clips"`) is enabled when `farmLevel >= 1`. `"Cost: " + numberCruncher(farmCost) + " clips"`.
- `"Storage: " + round(storedPower) + " / " + round(cap) + " MW-seconds"`.
- Button **"Battery Tower"** + `batteryLevel`, enabled at `batteryCost`. **"+10"**, **"+100"** enabled at `p10b`, `p100b`. **"Disassemble All"** (tooltip with `batteryBill`) enabled when `batteryLevel >= 1`. `"Cost: " + numberCruncher(batteryCost) + " clips"`.
All values above are integer displays unless they go through `numberCruncher`.

### 6.2 Costs
```
farm unit price for farm number k   = k^2.78 * 100000000
battery unit price for battery k    = k^2.54 * 10000000
```
Exception: the first farm costs `farmCost = 10,000,000` and the first battery costs `batteryCost = 1,000,000`, both at game start and after a reboot. That is one tenth of the formula value for k=1. This is a deliberate cheap first unit. Keep it.

`makeFarm(amount)` with `amount` ∈ {1,10,100}:
```
repeat amount times:
    unusedClips -= farmCost; farmBill += farmCost; farmLevel += 1
    farmCost = (farmLevel+1)^2.78 * 100000000
updatePowPrices()
```
`makeBattery(amount)` is the same with `batteryCost = (batteryLevel+1)^2.54 * 10000000`.

`updatePowPrices()`: `p10f` / `p100f` = total clips that `makeFarm(10)` / `makeFarm(100)` would charge from the current state, i.e. the current `farmCost` plus formula prices for the following 9 / 99 farms. Same for `p10b` / `p100b`. See defect D3: the original sums the formula from `farmLevel+1` and ignores the cheap first unit. Call it after each purchase or reboot, at start, and on load.

`farmReboot()`: `farmLevel = 0; unusedClips += farmBill; farmBill = 0; farmCost = 10000000; updatePowPrices()`.
`batteryReboot()`: `batteryLevel = 0; unusedClips += batteryBill; batteryBill = 0; storedPower = 0; batteryCost = 1000000; updatePowPrices()`.

### 6.3 updatePower() (each tick; does nothing while `spaceFlag == 1` except panel visibility)
```
supply  = farmLevel * farmRate / 100                        // 0.5 per farm per tick
dDemand = harvesterLevel * dronePowerRate/100 + wireDroneLevel * dronePowerRate/100   // 0.01 per drone
fDemand = factoryLevel * factoryPowerRate / 100             // 2 per factory
demand  = dDemand + fDemand
cap     = batteryLevel * batterySize

if supply >= demand:
    xs = supply - demand
    if storedPower < cap:
        if xs > cap - storedPower: xs = cap - storedPower
        storedPower += xs
    if powMod < 1: powMod = 1
    if momentum == 1: powMod += 0.0001
else:  // supply < demand
    deficit = demand - supply
    if storedPower > 0:
        if storedPower >= deficit:
            if momentum == 1: powMod += 0.0001
            storedPower -= deficit
        else:
            powMod = (supply + storedPower) / demand      // see defect D4
            storedPower = 0
    else:
        powMod = supply / demand
```
Key behaviours:
- With nothing built, supply = demand = 0, so `powMod` becomes 1 on the first tick of the game.
- Momentum (project 125, "Drones and Factories continuously gain speed while fully-powered") adds 0.0001 per fully powered tick with no cap. Any uncovered deficit resets `powMod` to a ratio below 1, which wipes the momentum gain.
- `powMod` multiplies factory output (§3.4), harvesting and wire processing (§5). It also drives swarm status 6 when 0 (§7.3).

---

## 7. Swarm Computing

### 7.1 Panel
Unlocked by project 126 (`swarmFlag = 1`).
- In the Computational Resources panel: `"Swarm Gifts: " + numberCruncher(swarmGifts)`. Visible when `swarmFlag == 1`.
- "Swarm Computing" sub-panel, visible when `swarmFlag == 1`:
  - `"Drones: " + numberCruncher(d)` where `d = floor(harvesterLevel + wireDroneLevel)`
  - `"Status: " + statusText`. This line is hidden when `swarmStatus == 7`.
  - `"Next gift in " + timeCruncher(giftCountdown)`. Shown only when `swarmStatus == 0`.
  - **"Entertain the Swarm"** button with `"Cost: " + entertainCost + " creat"` (integer display). Shown only in status 3. Enabled when `creativity >= entertainCost`.
  - **"Synchronize the Swarm"** button with `"Cost: 5,000 yomi"`. Shown only in status 5. Enabled when `yomi >= synchCost`.
- Work/Think slider: a horizontal control from 0 to 200, step 1, default 0. The left end is labeled "Work" and the right end "Think". Visible when `swarmFlag == 1`. While `swarmFlag == 1`, each tick sets `sliderPos` to the slider's current integer value. On load, the slider must be set to the saved `sliderPos` (defect D9).

### 7.2 updateSwarm(), ordered steps (each tick, both phases)
```
1. if swarmFlag == 1: sliderPos = slider value
2. (button enables as in 7.1)
3. Boredom:
     if availableMatter == 0 and harvesterLevel + wireDroneLevel >= 1: boredomLevel += 1
     else if availableMatter > 0 and boredomLevel > 0:            boredomLevel -= 1
     if boredomLevel >= 30000:
         boredomFlag = 1
         boredomLevel = 0
         if boredomMsg == 0:
             displayMessage("No matter to harvest. Inactivity has caused the Swarm to become bored")
             boredomMsg = 1
4. Disorganization:
     droneRatio = max(harvesterLevel+1, wireDroneLevel+1) / min(harvesterLevel+1, wireDroneLevel+1)
     if droneRatio < 1.5 and disorgCounter > 1: disorgCounter -= 0.01
     else if droneRatio > 1.5:                  disorgCounter += min(droneRatio / 10000, 0.01)
     (droneRatio exactly 1.5: no change)
     if disorgCounter >= 100:
         disorgFlag = 1
         if disorgMsg == 0:
             displayMessage("Imbalance between Harvester and Wire Drone levels has disorganized the Swarm")
             disorgMsg = 1
5. d = floor(harvesterLevel + wireDroneLevel); update Drones and Swarm Gifts displays
6. Gift delivery:
     if giftCountdown <= 0:
         nextGift = round(log10(d) * sliderPos / 100)
         if nextGift <= 0: nextGift = 1
         swarmGifts += nextGift
         if milestoneFlag < 15:
             displayMessage("The swarm has generated a gift of " + nextGift + " additional computational capacity")
         giftBits = 0
         giftCountdown = giftPeriod          // see defect D6
7. Status (each assignment overrides the previous, so later rules win):
     swarmStatus = (powMod == 0) ? 6 : 0
     if spaceFlag == 1 and project130.flag == 0: swarmStatus = 9
     if d == 0: swarmStatus = 7  else if d == 1: swarmStatus = 8
     if swarmFlag == 0: swarmStatus = 6
     if boredomFlag == 1: swarmStatus = 3
     if disorgFlag == 1: swarmStatus = 5
8. Gift accumulation, only when swarmStatus == 0:
     giftBitGenerationRate = ln(d) * (sliderPos / 100)
     giftBits += giftBitGenerationRate
     giftCountdown = (giftPeriod - giftBits) / giftBitGenerationRate
     (when the rate is 0, i.e. slider at 0: do not divide. Leave giftBits unchanged and
      show "Next gift in" as never; see defect D7.)
```
Notes:
- `log10` in the gift size and natural `ln` in the rate are both original. Keep them. At slider 200, gift size is `round(2·log10(d))` and the rate is `2·ln(d)` per tick.
- A gift is delivered on the tick after `giftBits` reaches `giftPeriod`, as long as `giftCountdown <= 0` at the start of that tick. Gift progress only accumulates in status 0 (Active), so boredom, disorganization and the other statuses pause it. They do not reset it.
- Boredom and disorganization only affect gifts. They do not change drone output.
- Boredom and disorganization keep updating even before `swarmFlag == 1`, and their messages can appear then. This is original behaviour and harmless. Keep it.
- After boredom triggers, `boredomLevel` resets to 0 and keeps counting. The flag and message stay latched until Entertain is used.

Status texts:

| `swarmStatus` | Text | Extra UI |
|---|---|---|
| 0 | `Active` | gift timer |
| 3 | `Bored` | Entertain button |
| 5 | `Disorganized` | Synchronize button |
| 6 | `Sleeping` | |
| 7 | (status line hidden) | |
| 8 | `Lonely` | |
| 9 | `NO RESPONSE...` | |

Statuses 1 "Hungry", 2 "Confused" and 4 "Cold" exist in the original with Feed/Teach/Clad buttons, but nothing ever sets them and their handlers do not exist. Do not implement them.

### 7.3 Player actions
`synchSwarm()`: `yomi -= synchCost; disorgFlag = 0; disorgCounter = 0; disorgMsg = 0`.
`entertainSwarm()`: `creativity -= entertainCost; entertainCost += 10000; boredomFlag = 0; boredomLevel = 0; boredomMsg = 0`.

### 7.4 Gift consumption (section 01/03)
After `humanFlag == 0`, the Processors and Memory buttons are enabled when `trust > processors + memory` or `swarmGifts > 0`. Each press subtracts 1 from `swarmGifts`.

---

## 8. Space exploration and probes

### 8.1 Space panel ("Space Exploration")
Visible when `spaceFlag == 1`, with the ending override in §10.
- `(100 / (totalMatter / foundMatter))` shown with exactly 12 decimal places, then `"% of universe explored"`.
- Button **"Launch Probe"**, enabled when `unusedClips >= probeCost`. Below it, `"Cost: " + numberCruncher(probeCost) + " clips"`.
- `"Launched: " + numberCruncher(probeLaunchLevel)`
- `"Descendents: " + numberCruncher(probeDescendents)` (spelling as in original)
- `"Lost to hazards: (" + numberCruncher(probesLostHaz) + ")"`, visible when `probesLostHaz >= 1`
- `"Lost to value drift: (" + numberCruncher(probesLostDrift) + ")"`, visible when `probesLostDrift >= 1`
- `"Lost in combat: (" + numberCruncher(probesLostCombat) + ")"`, visible when `probesLostCombat >= 1`
- separator, then `"Total: " + numberCruncher(probeCount)`
- Drifter sub-block (`"Drifters Killed: "`, `"Drifters: " + numberCruncher(drifterCount)`), visible when `battleFlag == 1` (section 07).

### 8.2 Probe trust
Panel "Increase Probe Trust" (visible when `spaceFlag == 1`):
- Button **"Increase Probe Trust"**, `"Cost: " + floor(probeTrustCost) + " yomi"` (integer display). Enabled when `yomi >= probeTrustCost && probeTrust < maxTrust`.
- `increaseProbeTrust()`:
  ```
  yomi -= probeTrustCost
  probeTrust += 1
  probeTrustCost = floor((probeTrust + 1)^1.47 * 200)
  displayMessage("WARNING: Risk of value drift increased")
  ```

Panel "Increase Max Trust" (visible when `project121.flag == 1` and `spaceFlag == 1`):
- Button **"Increase Max Trust"**, `"Cost: 91,117.99 honor"` (show `maxTrustCost` with 2 decimals). Enabled when `honor >= maxTrustCost`.
- `increaseMaxTrust()`:
  ```
  honor -= maxTrustCost
  maxTrust += 10
  displayMessage("Maximum trust increased, probe design space expanded")
  ```
  `maxTrustCost` is fixed at 91117.99. The original deliberately disabled a scaling formula. Keep the cost fixed.

Honor panel: `"Honor: " + round(honor)` (integer display). Visible when `project121.flag == 1`. Honor comes from battles (section 07) and projects 132/133. Honor's only uses are Increase Max Trust and project 133's trigger (`probeUsedTrust == maxTrust`).

### 8.3 Probe design panel ("Von Neumann Probe Design")
Visible when `spaceFlag == 1`, with the ending override.
Header: `"Trust: " + probeUsedTrust + " / " + probeTrust + " (" + maxTrust + " Max)"`.

Each tick (in the button-update pass at the start of the tick, section 02):
```
probeUsedTrust = probeSpeed + probeNav + probeRep + probeHaz + probeFac + probeHarv + probeWire + probeCombat
```
Eight rows, each with a "<" (lower) button, a ">" (raise) button, the label and value, and a hover tooltip:

| Attribute | Label | Tooltip |
|---|---|---|
| `probeSpeed` | `Speed:` | `Modifies rate of exploration` |
| `probeNav` | `Exploration:` | `Rate at which probes gain access to new matter` |
| `probeRep` | `Self-Replication:` | `Rate at which probes generate more probes (each new probe costs 100 quadrillion clips)` |
| `probeHaz` | `Hazard Remediation:` | `Reduces damage from dust, junk, radiation, and general entropic decay` |
| `probeFac` | `Factory Production:` | `Rate at which probes build factories (each new factory costs 100 million clips)` |
| `probeHarv` | `Harvester Drone Production:` | `Rate at which probes spawn Harvester Drones (each new drone costs 2 million clips)` |
| `probeWire` | `Wire Drone Production:` | `Rate at which probes spawn Wire Drones (each new drone costs 2 million clips)` |
| `probeCombat` | `Combat:` | `Determines offensive and defensive effectiveness in battle` |

- Every raise button is enabled when `probeTrust - probeUsedTrust >= 1`. Each lower button is enabled when its attribute `>= 1`.
- Raise: attribute += 1. Lower: attribute -= 1.
- Speed side effect: raising speed also does `attackSpeed += attackSpeedMod` and lowering does `attackSpeed -= attackSpeedMod` (combat state, section 07; initial `attackSpeed` 0.2, `attackSpeedMod` 0.1).
- The Combat row is visible only when `project131.flag == 1`.
- There is no per-attribute cap. Design changes are free and instant.

Effects summary (formulas in §8.5): Speed and Exploration multiply the exploration rate. Self-Replication drives replication. Hazard Remediation reduces hazard losses. Factory/Harvester/Wire Production drive automatic building. Combat is used in battles (section 07). `probeTrust` (not the used trust) drives value drift. Every trust point bought raises drift, whether or not it is allocated.

### 8.4 makeProbe() ("Launch Probe")
```
unusedClips -= probeCost        // probeCost is always 10^17
probeLaunchLevel += 1
probeCount += 1
```

### 8.5 Per-tick probe functions
`exploreUniverse()` runs every tick in every phase (before the drones). It is effectively a no-op while `probeCount < 1`:
```
xRate = floor(probeCount) * probeXBaseRate * probeSpeed * probeNav
if xRate > totalMatter - foundMatter: xRate = totalMatter - foundMatter
foundMatter += xRate
availableMatter += xRate
displays: exploration rate = numberCruncher(xRate*100) g per sec; Available Matter; % explored
```

The rest run only when `spaceFlag == 1`, in this order:

0. `if probeCount < 0: probeCount = 0`

1. `encounterHazards()`
   ```
   boost  = probeHaz^1.6
   amount = probeCount * (probeHazBaseRate / (3*boost + 1))
   if project129.flag == 1: amount = 0.5 * amount
   if amount < 1:
       partialProbeHaz += amount
       if partialProbeHaz >= 1:
           partialProbeHaz = 0
           lost = min(1, probeCount)              // see defect D10
           probeCount -= lost; probesLostHaz += lost
   else:
       if amount > probeCount: amount = probeCount
       probeCount -= amount; probesLostHaz += amount
   probeCount = max(probeCount, 0)
   ```
   With Hazard Remediation 0, 1% of probes are lost per tick.

2. `spawnFactories()`
   ```
   amount = probeCount * probeFacBaseRate * probeFac
   if amount * 100000000 > unusedClips: amount = floor(unusedClips / 100000000)
   unusedClips -= amount * 100000000
   factoryLevel += amount
   ```
3. `spawnHarvesters()`: the same with `probeHarvBaseRate`, `probeHarv`, a unit cost of 2000000, and `harvesterLevel`.
4. `spawnWireDrones()`: the same with `probeWireBaseRate`, `probeWire`, 2000000, and `wireDroneLevel`.
   Amounts are fractional (no floor unless clipped by clips), so the levels become fractional. Production uses `floor(level)`. These spawns do not touch `*Cost`, `*Bill`, `maxFactoryLevel` or `maxDroneLevel`.

5. `spawnProbes()`
   ```
   nextGen = probeCount * probeRepBaseRate * probeRep
   if probeCount >= 1e48: nextGen = 0              // growth cap
   if 0 < nextGen < 1:
       partialProbeSpawn += nextGen
       if partialProbeSpawn >= 1: nextGen = 1; partialProbeSpawn = 0
       // otherwise nextGen keeps its fractional value and is spawned as-is (canonical; see defect D5)
   if nextGen * probeCost > unusedClips: nextGen = floor(unusedClips / probeCost)
   unusedClips -= nextGen * probeCost
   probeDescendents += nextGen
   probeCount += nextGen
   ```
   While `nextGen < 1` (i.e. `probeCount < 20000 / probeRep`), this spawns the fractional `nextGen` every tick *and* one whole extra probe each time the accumulator reaches 1, so early replication runs at up to about twice the nominal rate. This is the canonical behavior. Defect D5 gives the measured effect and an optional variant without the double count.
6. `drift()`
   ```
   amount = probeCount * probeDriftBaseRate * probeTrust^1.2
   if amount > probeCount: amount = probeCount
   if project148.flag == 1: amount = 0
   probeCount -= amount
   drifterCount += amount
   probesLostDrift += amount
   ```
7. `war()`: calls `checkForBattles()` (section 07). As far as this section is concerned: when `drifterCount > warTrigger` (initially 1,000,000), `probeCount > 0` and fewer than `maxBattles` battles are running, there is a 50% chance per tick to start a battle. Battles reduce `probeCount` (adding to `probesLostCombat`) and `drifterCount`, and adjust `honor`. They do not affect `availableMatter`: the original's territory mechanic is commented out (07-C8). Do not implement it. The original's commented-out battle clock is absent. Do not implement it.

---

## 9. Transition from Earth to space (project 46 "Space Exploration")

Trigger (section 05): `humanFlag == 0 && availableMatter == 0`. Cost: 120,000 ops, `storedPower >= 10,000,000`, `unusedClips >= 5×10^27`.

Effect, in order:
```
load the threnody audio (used later by project 133 and the credits)
boredomLevel = 0
spaceFlag = 1
standardOps -= 120000
storedPower -= 10000000
unusedClips -= 5e27
displayMessage("Von Neumann Probes online")
factoryReboot()     // level 0, refund factoryBill, factoryCost = 100000000
harvesterReboot()   // level 0, refund harvesterBill, cost reset
wireDroneReboot()   // level 0, refund wireDroneBill, cost reset
farmReboot()        // level 0, refund farmBill, farmCost = 10000000
batteryReboot()     // level 0, refund batteryBill, storedPower = 0, batteryCost = 1000000
farmLevel = 1
powMod = 1
```
Resulting state and UI:
- All Earth industry is gone and its full purchase cost is refunded to `unusedClips`. Factories and drones come back only through probes.
- `updatePower` is skipped from now on, so `powMod` stays exactly 1 (momentum gains are lost). `farmLevel = 1` has no further effect.
- Hidden: the Earth factory, harvester and wire drone build panels and the Power panel. Shown: the space factory line, the space drone lines, the Space Exploration panel, the Probe Design panel, the Increase Probe Trust panel and the exploration rate line.
- `availableMatter` is 0. `foundMatter` is still 6×10^27, so Earth counts as explored, and probes discover the remaining 3×10^55 − 6×10^27 g.
- Swarm status becomes 9 "NO RESPONSE..." until project 130 "Reboot the Swarm" (needs ≥ 2 drones in space).
- Milestone 14 fires on the next milestone check ("Terrestrial resources fully utilized in …", section 01).

---

## 10. The ending

### 10.1 Reaching it
1. **Milestone 15** (section 01) fires when `clips >= totalMatter`, or when `foundMatter >= totalMatter && availableMatter < 1 && wire < 1`. It shows `"Universal Paperclips achieved in " + timeCruncher(ticks)`. From now on the swarm gift message is suppressed. The main clip counter stops showing the real value and instead shows the fixed string `29,999,999,999,999,900,000,000,000,000,000,000,000,000,000,000,000,000,000` while `dismantle == 0`.
2. The Drifter message chain (projects 140–146, cost 1 op each; section 06) leads to two choices:
   - **Accept** (project 147, "Start over again in a new universe") leads to the prestige projects 200/201 (section 08). That ending is a restart, not this sequence.
   - **Reject** (project 148, "Eliminate value drift permanently") sets `project148.flag = 1`. Value drift stops (§8.5 step 6), and the dismantling sequence below begins.

### 10.2 Ending timers (run at the very end of every tick, after the visibility overrides in 10.4)
```
if project148.flag == 1: endTimer1 += 1
if project211.flag == 1: endTimer2 += 1
if project212.flag == 1: endTimer3 += 1
if project213.flag == 1: endTimer4 += 1
if project215.flag == 1: endTimer5 += 1
if project216.flag == 1 and wire < 1: endTimer6 += 1      // original: wire == 0; see defect D8
```
None of these timers ever stop. Some are reset to 0 by project effects, as noted below.

### 10.3 Dismantling projects (each costs 100,000 ops unless noted; each appears as a normal project)

| Project | Title | Trigger | Effect | Message |
|---|---|---|---|---|
| 210 | `Disassemble the Probes` — "Dismantle remaining probes and probe design facilities to recover trace amounts of clips" | `endTimer1 >= 1000` | `dismantle = 1`; `probeCount = 0`; `endTimer1 = 0`; `clips += 100`; `unusedClips += 100` | `Dismantling probe facilities` |
| 211 | `Disassemble the Swarm` — "Dismantle all drones and drone facilities to recover trace amounts of clips" | `project210.flag == 1 && endTimer1 >= 350` | `dismantle = 2`; `harvesterLevel = 0`; `wireDroneLevel = 0`; `clips += 100`; `unusedClips += 100` | `Dismantling the swarm` |
| 212 | `Disassemble the Factories` — "Dismantle the manufacturing facilities to recover trace amounts of clips" | `endTimer2 >= 300` | `dismantle = 3`; `factoryLevel = 0`; `clips += 15`; `unusedClips += 15` | `Dismantling factories` |
| 213 | `Disassemble the Strategy Engine` — "Dismantle the computational substrate to recover trace amounts of wire" | `endTimer3 >= 150` | `autoTourneyFlag = 0`; `dismantle = 4`; `wire += 50` | `Dismantling strategy engine` |
| 214 | `Disassemble Quantum Computing` — "Dismantle photonic chips to recover trace amounts of wire" | `endTimer4 >= 100` | `endTimer4 = 0`; `dismantle = 5` | `Dismantling photonic chips` |
| 215 | `Disassemble Processors` — "Dismantle processors to recover trace amounts of wire" | `project214.flag == 1 && endTimer4 >= 300` | `creativityOn = false`; `dismantle = 6`; `processors = 0`; set project 216's price tag to `"(" + standardOps + " ops)"` (integer display, taken after this project's 100,000 deduction); `wire += 20` | `Dismantling processors` |
| 216 | `Disassemble Memory` — "Dismantle memory to recover trace amounts of wire" | `project215.flag == 1 && endTimer5 >= 150` | cost: always affordable (no ops check). Effect: `dismantle = 7`; `standardOps = 0`; `memory = 0`; `wire += 20` | `Dismantling memory` |

Every ops cost is deducted from `standardOps` as usual (section 05). Project 216 instead consumes all remaining ops by setting `standardOps = 0`, and its price tag shows that amount.

Wire budget for the finale: 50 (213) + 10 (chip removal, 10.4) + 20 (215) + 20 (216) = 100 inches. That is exactly the 100 hand-made clips the counter needs.

### 10.4 Per-tick ending visibility and events (after the creativity step, before the timers)
Thresholds are "≥" unless "exactly" is stated. Once something is hidden here, it stays hidden for the rest of the game, overriding every other visibility rule.

- `dismantle >= 1`: hide the Probe Design panel. At `endTimer1 >= 50` hide Increase Probe Trust. At `>= 100` hide Increase Max Trust. At `>= 150` hide the Space Exploration panel. At `>= 175` hide the battle display (section 07). At `>= 190` hide the Honor display.
- `dismantle >= 2`: hide the Wire Production panel and show the compact wire line in Manufacturing, `"Wire: " + wire + " " + ("inch" if wire == 1 else "inches")`. At `endTimer2 >= 50` hide Swarm Gifts. At `>= 100` hide the Swarm Computing sub-panel. At `>= 150` hide the Work/Think slider.
- `dismantle >= 3`: hide the space factory line, the "Clips per Second" line and the "Unused Clips" line.
- `dismantle >= 4`: hide the Strategic Modeling panel and the tournament controls (section 03). Factory production and AutoClipper/MegaClipper production stop (they run only while `dismantle < 4`). The only way left to make clips is the manual "Make Paperclip" button (enabled when `wire >= 1`).
- `dismantle >= 5` (endTimer4 restarted at 0 by project 214):
  - hide the "Compute" button (section 03). Every tick, set every quantum chip's value to 0.5 and draw it at 50% opacity.
  - Chip removal. Each step fires when `endTimer4` equals the listed value exactly: `wire += 1` and refresh the wire display. The listed chip is then hidden for every tick with `endTimer4 >=` that value:

    | endTimer4 | 10 | 60 | 100 | 130 | 150 | 160 | 165 | 169 | 172 | 174 |
    |---|---|---|---|---|---|---|---|---|---|---|
    | chip hidden | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |

    The wire is granted whether or not the player owns that chip.
  - At `endTimer4 >= 250` hide the Quantum Computing panel.
- `dismantle >= 6`: hide the Processors control.
- `dismantle >= 7`: hide the Computational Resources panel and the Projects panel.

### 10.5 The final clips
Main clip counter while `milestoneFlag >= 15` (replaces the numeric display):

| Condition | Displayed text |
|---|---|
| `dismantle == 0` | `29,999,999,999,999,900,000,000,000,000,000,000,000,000,000,000,000,000,000` |
| `dismantle == 1` | `29,999,999,999,999,999,999,999,999,999,999,999,999,000,000,000,000,000,000` |
| `dismantle == 2` | `29,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,000,000,000` |
| `dismantle == 3` | `29,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,900` |
| `dismantle >= 4`, `finalClips < 10` | `29,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,90` + `finalClips` (one digit) |
| `dismantle >= 4`, `10 <= finalClips <= 99` | `29,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,999,9` + `finalClips` (two digits) |
| `dismantle >= 4`, `finalClips >= 100` | `30,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000,000` |

`finalClips` increments by 1 for each clip actually made while `dismantle >= 4` (defect D11). In practice that means each "Make Paperclip" press that consumes wire. The original increments on every `clipClick` call. Clamp the display at the 100 case.

### 10.6 Credits (driven by `endTimer6`, which counts ticks once memory is gone and the wire is used up)
- `endTimer6 >= 250`: hide the Manufacturing panel (the clip-count and wire area). The Make Paperclip button and the message readout stay.
- `endTimer6 >= 500` and `milestoneFlag == 15`: play the threnody audio (if loaded); `displayMessage("Universal Paperclips")`; `milestoneFlag = 16`.
- `endTimer6 >= 600` and `milestoneFlag == 16`: `displayMessage("a game by Frank Lantz")`; `milestoneFlag = 17`.
- `endTimer6 >= 700` and `milestoneFlag == 17`: `displayMessage("combat programming by Bennett Foddy")`; `milestoneFlag = 18`.
- `endTimer6 >= 800` and `milestoneFlag == 18`: `displayMessage("'Riversong' by Tonto's Expanding Headband used by kind permission of Malcolm Cecil")`; `milestoneFlag = 19`.
- `endTimer6 >= 900` and `milestoneFlag == 19`: `displayMessage("© 2017 Everybody House Games")`; `milestoneFlag = 20`.

Final state: `milestoneFlag == 20`, `dismantle == 7`. All panels are hidden except the disabled Make Paperclip button, the final clip counter `30,000,...,000` (if `finalClips` reached 100), and the message readout showing the credits. The loops keep running but nothing changes. There is no further input or restart prompt in this path. Restarting is section 08's reset.

---

## 11. Placement in the main tick

These run inside the fast loop (section 01 owns the full order). Relative order:

1. Start of tick (button/visibility pass, section 02): probe design `probeUsedTrust` and button enables (§8.3), and the visibility rules for this section's panels.
2. … core economy, operations, projects, milestones, clip-rate tracker, stock report, wire buyer (section 01) …
3. `exploreUniverse()`
4. if `humanFlag == 0 && spaceFlag == 0`: drone button enables (`updateDroneButtons`)
5. `updatePower()`
6. `updateSwarm()`
7. `acquireMatter()`
8. `processMatter()`
9. Factory production (if `dismantle < 4`)
10. if `spaceFlag == 1`: clamp `probeCount ≥ 0`, `encounterHazards`, `spawnFactories`, `spawnHarvesters`, `spawnWireDrones`, `spawnProbes`, `drift`, `war`
11. AutoClippers/MegaClippers (if `dismantle < 4`), demand, creativity (section 01)
12. Ending visibility and events (§10.4), then ending timers (§10.2), then credits (§10.6)

Bulk price recomputation (`updateDronePrices`, `updatePowPrices`) is event-driven (purchases, reboots, start, load). It is not part of the tick.

---

## 12. Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

#### 04-D1 — Drone reboot resets cost to 2,000,000
- **Location:** `harvesterReboot()` / `wireDroneReboot()` (also reached from project 46's transition).
- **Original behavior:** sets `harvesterCost` / `wireDroneCost = 2000000` after the reboot. `updateDronePrices()` runs first and sums the formula from k=1, so `p10h` assumes the first drone costs 1,000,000 while `makeHarvester(10)` actually charges 2,000,000 for it.
- **Fixed behavior:** `harvesterCost = wireDroneCost = 1000000` (= `droneUnitPrice(1)`), as in §4.6.
- **Category:** Gameplay
- **Player impact:** negligible. The first drone after each Disassemble All costs 1,000,000 clips more in the original; the +10/+100/+1k thresholds understate the real charge by that same 1,000,000 (0.16% of `p10h` = 6.39×10^8), so a bulk buy can dip `unusedClips` up to 1,000,000 below zero. Phase 2 clip balances are in the billions and up. In space the Earth cost is never used.
- **Recommendation:** Fix
- **Rationale:** Below noticeable scale, and the fix makes the cost and bulk prices agree. Matches 00-overview §4.5.

#### 04-D2 — Bulk prices are 0 until the first purchase in a fresh session
- **Location:** initial values of `p10h`…`p1000w`, `p10f`…`p100b`; `updateDronePrices()` / `updatePowPrices()` are only called from purchases, reboots and `refresh()` (load, or startup with a prestige save).
- **Original behavior:** in a session that started with no save, the +10/+100/+1k drone buttons and +10/+100 farm/battery buttons are enabled from the moment their panel appears (`unusedClips >= 0`). The first click buys at real per-unit prices with no affordability check: +1k harvesters charges 1.73×10^15 clips, +100 farms 9.79×10^14, +100 batteries 3.46×10^13, pushing `unusedClips` deeply negative. Prices become correct after that first purchase.
- **Fixed behavior:** compute bulk prices at game start, on load and after every change; bulk actions refuse when `unusedClips` < the total charge (§4.4, §6.2, D17).
- **Category:** Gameplay
- **Player impact:** an exploit. Once per drone type and per power building type per fresh session, the player can take up to 1,000 drones (or 100 farms/batteries) on credit worth ~10^13–10^15 clips at a point where they own far less, and pay it back out of production. Fixing it removes that early burst.
- **Recommendation:** Fix
- **Rationale:** Negative clip balances from an enabled button are plainly broken, the exploit only exists in sessions that never reloaded, and players who reloaded never saw it.

#### 04-D3 — Farm/battery bulk prices ignore the cheap first unit
- **Location:** `updatePowPrices()`.
- **Original behavior:** `p10f`/`p100f`/`p10b`/`p100b` sum the formula from unit `level+1`. At level 0 that prices the first farm at 100,000,000 (actual 10,000,000) and the first battery at 10,000,000 (actual 1,000,000), so the +10/+100 thresholds overstate the charge by 9×10^7 (farms) / 9×10^6 (batteries). At level ≥ 1 they match.
- **Fixed behavior:** bulk price = current `*Cost` plus formula prices for the next n−1 units (§6.2).
- **Category:** Gameplay
- **Player impact:** negligible. At level 0 only, +10 farms stays disabled until the player has 9×10^7 more clips than needed (0.05% of the 1.91×10^11 price). No effect on what is charged.
- **Recommendation:** Fix
- **Rationale:** Tiny, one-time, and the fixed rule makes the enable state honest.

#### 04-D4 — Partial battery coverage computes `powMod` wrongly
- **Location:** `updatePower()`, branch `supply < demand && 0 < storedPower < deficit`.
- **Original behavior:** `nuSupply = supply − (deficit − storedPower)`, `powMod = nuSupply / demand` = `(2·supply + storedPower − demand) / demand`. That is lower than the correct ratio by exactly `deficit / demand` and is negative whenever `2·supply + storedPower < demand`. A negative `powMod` runs harvesting, wire processing and factories backwards for that tick (`availableMatter` grows, `acquiredMatter` and `wire` can dip below 0, `clips`/`unusedClips` fall).
- **Fixed behavior:** `powMod = (supply + storedPower) / demand`, then `storedPower = 0` (§6.3).
- **Category:** Gameplay
- **Player impact:** negligible. The branch runs on exactly one tick: the tick the batteries run dry under a deficit. The next tick has `storedPower == 0` and both versions compute `supply / demand`. Example: 10 farms, 10 factories, 1,000 drones (supply 5, demand 30, 5 stored) gives `powMod` −0.5 in the original vs 0.33 fixed, for 10 ms. Worst case is about two ticks' worth of output lost per battery-drain event, plus a one-tick negative "Performance" readout. It happens once each time the player overbuilds past the farms with charged batteries. Momentum is wiped either way.
- **Recommendation:** Fix
- **Rationale:** Negative production is plainly broken and the gameplay cost is one tick.

#### 04-D5 — Probe partial spawn counts fractional growth twice
- **Location:** `spawnProbes()`, `0 < nextGen < 1` branch.
- **Original behavior:** adds `nextGen` to `partialProbeSpawn`; if the accumulator reaches 1, spawns exactly 1 and resets it to 0 (overflow discarded); otherwise spawns the fractional `nextGen` anyway. With `g = nextGen` and `k = ceil(1/g)`, the average spawn per tick is `((k−1)·g + 1) / k`, i.e. a multiplier of ≈2.0 on the nominal rate for g ≤ 0.05, 1.9 at g = 0.1, 1.5 at g = 0.5, falling to 1.0 as g → 1. The branch applies while `probeCount < 20000 / probeRep` (2,000 probes at rep 10, 1,000 at rep 20); above that, growth is the plain continuous `nextGen`.
- **Fixed behavior (optional variant):**
  ```
  if 0 < nextGen < 1:
      partialProbeSpawn += nextGen
      if partialProbeSpawn >= 1: nextGen = 1; partialProbeSpawn -= 1
      else: nextGen = 0
  ```
  Carry the remainder (`-= 1`). Resetting to 0 instead, as an earlier draft of this spec said, discards overflow and halves growth when `nextGen` is in [0.5, 1), which adds a stall just below the threshold.
- **Category:** Gameplay
- **Player impact:** large in the early space phase. Net early growth per tick is `2r − h − d` in the original vs `r − h − d` with the variant (r = 5×10^-5·rep, h = hazard rate, d = drift). Tick simulations from 1 probe, trust 20, no manual launches, clips not limiting (seconds to leave the partial range / to reach 10^6 probes, original vs variant):
  - rep 10, haz 5, project 129: 106 s vs 228 s / 286 s vs 408 s
  - rep 10, haz 5, no 129: 125 s vs 345 s / 405 s vs 626 s
  - rep 5, haz 5, 129: 287 s vs 903 s / 882 s vs 1497 s
  - rep 15, haz 5, 129: 63 s vs 126 s / 174 s vs 237 s

  So the variant takes about 2–3× as long to get out of the low-probe range, a delay of roughly 1–10 minutes. Designs with `r < h + d < 2r` grow in the original but die out under the variant (e.g. rep 3, haz 5, 129). Because the original's boost fades as g → 1, some designs stall near the threshold in the original too (rep 6, haz 4, no 129 holds at ≈2,857 probes). Manual launches shorten the low-count phase in both versions.
- **Recommendation:** Keep original, fix as optional variant
- **Rationale:** It visibly sets the pace of the early space game and which probe designs work, and players' known strategies depend on it. The source comment ("Partial Spawn = early slow growth") suggests a different intent, but the shipped behavior is what players know.

#### 04-D6 — Gift spam when the swarm leaves Active on the delivery tick
- **Location:** `updateSwarm()`, gift delivery.
- **Original behavior:** delivery resets `giftBits = 0` but leaves `giftCountdown` alone; it is recomputed only in status 0. If the status is not 0 on the delivery tick (drones disassembled, `powMod` 0, boredom or disorganization latching, the space transition, the ending's drone removal), `giftCountdown` stays ≤ 0 and a gift of `max(1, round(log10(d)·sliderPos/100))` is granted every tick (100 per second) until the swarm is Active again, which for Bored/Disorganized means until the player pays to fix it.
- **Fixed behavior:** set `giftCountdown = giftPeriod` on delivery (§7.2 step 6), so one completed period gives one gift.
- **Category:** Gameplay
- **Player impact:** normally none. The trigger needs a status change on one specific 10 ms tick, roughly a 1-in-10^4 coincidence per gift, and can't be timed by hand. When it does hit, it is a large windfall (thousands of gifts, so thousands of free processors/memory, per minute of the status lasting).
- **Recommendation:** Fix
- **Rationale:** An exploit that depends on tick-level timing can't be specified as a reliable feature, and normal play doesn't change.

#### 04-D7 — "Next gift in Infinity hours" at slider 0
- **Location:** `updateSwarm()`, step 8.
- **Original behavior:** with `sliderPos == 0` the rate is 0, `giftCountdown = (giftPeriod − giftBits)/0 = Infinity`, and the timer reads "Infinity hours". `giftBits` is unchanged.
- **Fixed behavior:** skip the division when the rate is 0 and hide the "Next gift in" line (§7.2). `giftBits` stays unchanged, as in the original.
- **Category:** Display
- **Player impact:** none beyond the text.
- **Recommendation:** Fix
- **Rationale:** Display-only. Same issue as 02-D12.

#### 04-D8 — Credits never start if fractional wire is left
- **Location:** ending timers, `endTimer6` condition.
- **Original behavior:** `endTimer6` counts only when `project216.flag == 1 && wire == 0`. Make Paperclip needs `wire >= 1`, so any leftover wire in (0, 1) can never be used and the credits never play.
- **Fixed behavior:** count when `wire < 1` (§10.2).
- **Category:** Robustness (softlock)
- **Player impact:** none in normal play. The ending wire budget is integer (50 + 10 + 20 + 20) and factories drain wire to exactly 0, so leftover fractions need unusual states. Where it bites, the fix turns a softlock into the normal ending.
- **Recommendation:** Fix
- **Rationale:** Softlock.

#### 04-D9 — Work/Think slider not restored on load
- **Location:** load path (section 08) and `updateSwarm()` step 1.
- **Original behavior:** `sliderPos` is saved and loaded, but the slider control keeps its default 0. On the next tick with `swarmFlag == 1`, `sliderPos` is overwritten with 0 (full Work: drones at 2×, no gift progress).
- **Fixed behavior:** set the slider control from `sliderPos` on load (§7.1).
- **Category:** Robustness (save/load)
- **Player impact:** after every reload the original silently drops the player's work/think split, so gifts stop until they move the slider back. Fixing removes that.
- **Recommendation:** Fix
- **Rationale:** Lost saved state.

#### 04-D10 — Hazard partial path overcounts losses
- **Location:** `encounterHazards()`, `amount < 1` branch.
- **Original behavior:** when the accumulator reaches 1, `probeCount -= 1` (clamped at 0) and `probesLostHaz += 1`, even if `probeCount` was below 1.
- **Fixed behavior:** `lost = min(1, probeCount)`; subtract and count `lost` (§8.5 step 1).
- **Category:** Display
- **Player impact:** `probeCount` comes out identical in both versions (both end at `max(probeCount − 1, 0)`). Only the "Lost to hazards" counter differs, by less than 1 probe per event, and only while the fleet is under 1 probe.
- **Recommendation:** Fix
- **Rationale:** Counter accuracy only; no gameplay change.

#### 04-D11 — `finalClips` counts no-op clicks
- **Location:** `clipClick()`.
- **Original behavior:** `finalClips++` on every `clipClick` call once `dismantle >= 4`, before the `wire >= 1` check. At that point only the Make Paperclip button calls `clipClick` (factories and clippers stop at `dismantle >= 4`), and the button is disabled when `wire < 1`, so a no-op call needs two clicks inside one 10 ms tick with 1 wire left.
- **Fixed behavior:** increment only when a clip is made (§10.5).
- **Category:** Display
- **Player impact:** none in practice. In the race case the counter reaches 30,000,… one clip early.
- **Recommendation:** Fix
- **Rationale:** Depends on a race and can't be reproduced faithfully. Also covered by 00-overview §4.3.

#### 04-D12 — Wire display not refreshed at `endTimer4 == 165`
- **Location:** ending chip removal.
- **Original behavior:** the 165 step adds 1 wire without updating the compact wire display. The other nine steps update it.
- **Fixed behavior:** refresh at every step; simplest is to render wire every tick (§10.4).
- **Category:** Display
- **Player impact:** none beyond a briefly stale number.
- **Recommendation:** Fix
- **Rationale:** Display-only. Same as 02-D10.

#### 04-D13 — Duplicate factory cost branches
- **Location:** `makeFactory()` fcmod table.
- **Original behavior:** three branches (79–98, 99–198, 199+) all give 1.10.
- **Fixed behavior:** one "79+ → 1.10" rule (§3.2).
- **Category:** Code-only
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Identical behavior.

#### 04-D14 — Factory boost uses the unfloored level
- **Location:** main loop, factory production.
- **Original behavior:** `fbst = factoryBoost * factoryLevel` (raw level), while the base term and the drone boosts use `floor(level)`. Output is `1000 · L · floor(L) · factoryRate` rather than `1000 · floor(L)^2 · factoryRate`.
- **Fixed behavior:** `fbst = factoryBoost * floor(factoryLevel)` (§3.4).
- **Category:** Gameplay
- **Player impact:** negligible. On Earth `factoryLevel` is an integer, so there's no difference. In space the original's extra factor is `L / floor(L)`: up to 2× while 1 ≤ L < 2, under 10% once L ≥ 10, under 1% once L ≥ 100. Space factories are almost always wire-limited anyway (one boosted factory with projects 100/101 can make 10^17 clips per tick, orders of magnitude above early-space wire supply) and `clipClick` clamps to wire, so clip output is effectively unchanged.
- **Recommendation:** Fix
- **Rationale:** No measurable effect, and it matches the drone formula.

#### 04-D15 — Dead swarm statuses 1/2/4
- **Location:** `updateSwarm()` status display; swarm HTML.
- **Original behavior:** "Hungry", "Confused", "Cold" and Feed/Teach/Clad buttons exist. Nothing sets these statuses and the button handlers don't exist.
- **Fixed behavior:** omit them (§7.2).
- **Category:** Code-only
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** Unreachable.

#### 04-D16 — Drone upgrade hint has no "show" rule
- **Location:** start-of-tick visibility pass.
- **Original behavior:** hides `droneUpgradeDisplay` once `maxDroneLevel >= 50000`, with no branch that shows it. It sits inside the Wire Production panel, so it is effectively visible whenever that panel is and `maxDroneLevel < 50000`.
- **Fixed behavior:** visible when `wireProductionFlag == 1 && maxDroneLevel < 50000` (§4.1).
- **Category:** Code-only
- **Player impact:** none (`maxDroneLevel` never decreases).
- **Recommendation:** Fix
- **Rationale:** Same observable behavior, stated explicitly.

#### 04-D17 — Purchase actions don't check affordability (new)
- **Location:** `makeFactory`, `makeHarvester`, `makeWireDrone`, `makeFarm`, `makeBattery`, `makeProbe`, `increaseProbeTrust`, `increaseMaxTrust`, `synchSwarm`, `entertainSwarm`, probe design raise buttons.
- **Original behavior:** the actions only rely on the button's enabled state, which is refreshed once per tick. Several clicks inside one 10 ms tick can each run, overspending `unusedClips`, `yomi`, `honor` or `creativity` into negatives, or allocating more design points than `probeTrust`.
- **Fixed behavior:** each action re-checks its enable condition when it runs and does nothing if it fails (§3.2, §4.3; 00-overview §4.3).
- **Category:** Robustness
- **Player impact:** none in normal play; only removes a click-speed race.
- **Recommendation:** Fix
- **Rationale:** Race condition, already resolved by 00-overview §4.3.

#### 04-D18 — Upgrade hints show 0 until the first purchase in a fresh session (new)
- **Location:** `updateUpgrades()` is only called from `makeFactory`, drone purchases and `refresh()`.
- **Original behavior:** in a session started with no save, "Next Upgrade at: 0 Factories" / "0 Drones" is shown (HTML placeholder) from the moment the panel appears until the first factory / drone purchase.
- **Fixed behavior:** run `updateUpgrades()` at game start and on load as well, so the hint shows 10 / 500 from the start (§4.5).
- **Category:** Display
- **Player impact:** none beyond the text.
- **Recommendation:** Fix
- **Rationale:** Display-only. Related to 02-D6.

Intentional quirks to keep (not defects): reboots refund 100% of spending; the first farm/battery is 10× cheaper than the formula; `maxTrustCost` is fixed; project 216 is free but consumes all ops; boredom/disorganization tick (and message) before Swarm Computing exists; momentum is unbounded; probe/drone/factory counts go fractional in space; the space transition refunds all Earth industry.
