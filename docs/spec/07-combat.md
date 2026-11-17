# 07 — Combat (Drifters vs. Probes)

This section covers the phase-3 battle system: when battles start, how big they are, the ship simulation that decides every casualty, battle resolution and honor, battle naming, and the battle display.

Cross-references:
- Tick cadence, `numberCruncher`, `displayMessage`: section 01.
- Panel layout and general visibility rules: section 02.
- `probeCount`, `drifterCount`, `probesLostCombat`, `probeSpeed`, `probeCombat` allocation buttons, `probeTrust`/`probeUsedTrust`, `drift()`, `spaceFlag`, ending sequence: section 04.
- Projects 120 (The OODA Loop), 121 (Name the battles), 131 (Combat), 132 (Monument to the Driftwar Fallen), 133 (Threnody), 134 (Glory): sections 05/06. This section specifies only how their flags change combat.
- Save/load of combat state: section 08.

`random()` means a uniform draw on [0, 1).

---

## 1. Model overview

Drifters are probes lost to value drift (section 04 moves them from `probeCount` to `drifterCount`). Once there are more than one million drifters, they attack the player's probes in a series of battles, **one at a time**.

Each battle is a small real-time particle simulation: a few hundred "ships" in a 310 x 150 arena. The left team (team 0, white) is the player's probes and the right team (team 1, black) is the drifters. Every ship stands for `unitSize` real probes or drifters. Each time a ship dies in the simulation, `unitSize` is subtracted from the matching global count.

**The simulation is the gameplay.** No closed-form or abstract battle model exists. All casualties, wins, losses and honor come from the per-frame ship simulation (movement included), so the movement rules in §5 count as gameplay. Only the drawing in §9 is presentation.

---

## 2. State

### 2.1 Gameplay state owned by this section

| Name | Initial | Persisted (sec. 08) | Meaning |
|---|---|---|---|
| `probeCombat` | 0 | yes | Probe design attribute "Combat". The player allocates it with the probe-design buttons in section 04. Raise is enabled when `probeTrust - probeUsedTrust >= 1`, lower is enabled when `probeCombat >= 1`, and the row is visible when `project131.flag == 1`. |
| `probeCombatBaseRate` | 0.15 | no (constant) | multiplier for probe attack |
| `drifterCombat` | 1.75 | yes (constant; do not persist, see 08) | drifter attack strength |
| `warTrigger` | 1,000,000 | yes (constant) | `drifterCount` must exceed this for battles to start |
| `maxBattles` | 1 | yes (constant) | maximum simultaneous battles. The ship simulation supports exactly one, so treat this as a hard constant of 1. |
| `battles` | empty list | yes | active battle records, 0 or 1 entries. Only the length matters (see §2.3). |
| `battleID` | 0 | yes | id of the most recently created battle. Incremented before use, so the first battle is 1. |
| `battleFlag` | 0 | yes | set to 1 the first time a battle is created, and never cleared. It reveals the battle panel and the drifter counters. |
| `battleName` | "foo" (overwritten before first display) | yes | name of the current or most recent battle |
| `battleNameFlag` | 0 | yes | 1 after project 121, which switches to historical battle names |
| `battleNumbers` | list of 104 ones (see §8) | yes | per-name sequence counters |
| `unitSize` | 0 | yes | probes or drifters represented by one ship in the current battle |
| `battleLEFTSHIPS` | 200 | no | probe ships at the start of the current battle |
| `battleRIGHTSHIPS` | 200 | no | drifter ships at the start of the current battle |
| `numLeftShips`, `numRightShips`, `numShips` | 0 | no | live counts of the current roster (`numShips` = roster length, dead ships included) |
| `ships` | empty | no | ship roster (§4) |
| `grid` | 15 rows x 31 cols of cells | no | spatial buckets rebuilt every frame |
| `battleClock` | 0 | yes | frames spent with one side at 4 ships or fewer (stalemate clock) |
| `masterBattleClock` | 0 | yes | frames since the battle started (hard cap clock) |
| `battleEndDelay` | 0 | yes | frames since one side was wiped out |
| `battleEndTimer` | 100 | yes | how long the result stays up before the battle is removed. Project 121 sets it to 200. |
| `honor` | 0 | yes | honor currency (spent on "Increase Max Trust" in section 04; also changed by projects 132/133) |
| `honorCount` | 0 | yes | latch: 1 once the current battle's honor has been applied |
| `bonusHonor` | 0 | yes | streak bonus for project 134 |
| `honorReward` | 0 | yes | last victory reward (display only) |
| `threnodyTitle` | "Durenstein 1" | yes | name of the most recent lost battle. Project 133 reads it. |
| `driftersKilled` | 0 | yes | cumulative drifters destroyed |
| `attackSpeedFlag` | 0 | yes | 1 after project 120 (The OODA Loop) |

Owned elsewhere but written here: `probeCount`, `drifterCount`, `probesLostCombat` (section 04).

### 2.2 Constants

| Name | Value |
|---|---|
| `battleWIDTH`, `battleHEIGHT` | 310, 150 (arena units = display pixels) |
| `battleGRID_WIDTH`, `battleGRID_HEIGHT` | 31, 15 (cells are 10 x 10 units) |
| `battleINV_GRID_WIDTH`, `battleINV_GRID_HEIGHT` | 0.1, 0.1 (that is, 1 / (310/31) and 1 / (150/15)) |
| `battleMAXSPEED` | 2 (units per frame, per axis) |
| `battleDEATH_THRESHOLD` | 0.5 (base death threshold) |
| Frame period | 16 ms |
| Stalemate limit | 2000 frames (32 s) |
| Hard cap | 8000 frames (128 s) |
| `battleLEFTCOLOR` | #ffffff |
| `battleRIGHTCOLOR` | #000000 |
| `battleEXPLODECOLOR` | #ffffff |

### 2.3 Legacy state (do not implement)

The original also has an older, non-spatial battle model that is fully commented out: a per-battle report list, `updateBattles` with `attackSpeed`/`battleSpeed`, territory loss reducing `availableMatter`, and `battleCleanUp`. Its leftovers are still declared, and some are saved: `attackSpeed` (0.2), `battleSpeed` (0.2), `attackSpeedMod` (0.1), `battleAlarm` (10), `outcomeTimer` (150), and the battle-record fields `clipProbes`, `drifterProbes`, `victory`, `loss`, `whiteFlag`, `territory`, `reportCount`, `garbageFlag`. **None of these affect gameplay.** In particular, battles never reduce `availableMatter`. The raise/lower Speed buttons still change `attackSpeed` by ±`attackSpeedMod` (section 04), but nothing reads it. A reimplementation should leave all of this out. A battle record needs only its `id`.

---

## 3. Battle start

### 3.1 checkForBattles (called once per main tick)

`war()` runs once per main-loop tick (10 ms), only while `spaceFlag == 1`, after `drift()` (ordering in section 04). It does only this:

```
checkForBattles():
    if drifterCount > warTrigger and probeCount > 0 and length(battles) < maxBattles:
        r = random() * 100
        if r >= 50:
            if battleFlag == 0: battleFlag = 1
            createBattle()
```

Each main tick therefore has a 50% chance to start a battle whenever none is active and the conditions hold. In practice, a new battle starts within a few ticks of the previous one ending.

### 3.2 createBattle

```
createBattle():
    // ship value
    if drifterCount >= probeCount: unitSize = probeCount / 100
    else:                          unitSize = drifterCount / 100
    if unitSize < 1: unitSize = 1
    display "Scale" = numberCruncher(unitSize, 0)          // see §9.3

    rr = random() * drifterCount;  if rr < 1: rr = 1       // drifter force
    ss = random() * probeCount;    if ss < 1: ss = 1       // probe force
    // (original also draws tt = random() * availableMatter here for the dead
    //  territory field; the draw has no effect and may be omitted)

    battleID = battleID + 1

    battleLEFTSHIPS = ceil(ss / 1,000,000)
    if battleLEFTSHIPS > 200: battleLEFTSHIPS = 200
    if battleLEFTSHIPS == 200:                // after the cap, so also when exactly 200
        if random() < 0.5:
            battleLEFTSHIPS = ceil(random() * 175)
    battleLEFTSHIPS = max(battleLEFTSHIPS, 1)  // see defect C9

    battleRIGHTSHIPS = ceil(rr / 1,000,000)
    if battleRIGHTSHIPS > 200: battleRIGHTSHIPS = 200

    initializeRoster()                         // §4; discards any previous ships

    battleName = "Drifter Attack " + battleID
    if battleNameFlag == 1: battleName = generateBattleName()   // §8
    display battle name = battleName

    append { id: battleID } to battles
```

Notes:
- `unitSize` is `min(probeCount, drifterCount) / 100`, with a floor of 1. The ship counts come from separate random fractions of each force at 1 ship per million. Ships × `unitSize` therefore does not equal any real force size. This is intentional abstraction. The most one battle can cost either side is `200 * unitSize`, limited by what that side actually has (§6.3).
- When the probe force is large enough to field 200 ships, there is a 50% "hinder" roll that cuts the probe side to `ceil(random()*175)` ships (1..175). Drifters get no such roll.
- Drifters always have more than 1,000,000 here (`rr` is uniform in [0, drifterCount)), so `battleRIGHTSHIPS` is at least 1.

---

## 4. Ship roster

### 4.1 Ship record

```
Ship { team (0 = probes/left, 1 = drifters/right), x, y, vx, vy, alive = true,
       framesDead = 0, gx = 0, gy = 0, color }
```

### 4.2 initializeRoster

```
initializeRoster():
    numLeftShips = 0; numRightShips = 0; numShips = 0; ships = []
    grid = 15 rows x 31 cols of empty cells
    leftShipTurn = false            // first ship created is a drifter
    while numLeftShips < battleLEFTSHIPS or numRightShips < battleRIGHTSHIPS:
        if leftShipTurn:
            append newShip(0); numLeftShips++; numShips++
            if numRightShips < battleRIGHTSHIPS: leftShipTurn = false
        else:
            append newShip(1); numRightShips++; numShips++
            if numLeftShips < battleLEFTSHIPS: leftShipTurn = true
```

This interleaves the teams (R, L, R, L, ...) until the smaller side runs out, then fills in the rest of the larger side. Interleaving keeps array position from favoring either team, because iteration order matters in §5 and §6.

### 4.3 newShip(team) — random draws in this order

```
team 0 (probes):
    x  = random() * 0.2 * 310              // [0, 62)
    y  = random() * 150
    vx = random() * 2                      // [0, 2), moving right
    vy = random() - 0.5                    // [-0.5, 0.5)
    color = #ffffff
team 1 (drifters):
    x  = (random() * 0.2 + 0.8) * 310      // [248, 310)
    y  = random() * 150
    vx = -(random() * 2)                   // (-2, 0], moving left
    vy = random() - 0.5
    color = #000000
```

---

## 5. Frame step (every 16 ms)

### 5.1 Order within a frame

```
frame():
    clearDisplay()          // presentation
    updateGrid()            // §5.2
    moveShips()             // §5.3 (also draws ships and explosions, §9)
    doCombat()              // §6 (ends with checkForBattleEnd, §7)
```

The original runs this frame on its own 16 ms timer, independent of the 10 ms main loop. It runs from page load onward, whether or not a battle is active or the panel is visible. **Required behavior:** run the gameplay part of the frame (updateGrid, moveShips, doCombat) only while a battle is active (`length(battles) > 0`), and keep the roster empty when no battle is active. See defect C1. Rendering may skip frames when the panel is hidden, but the simulation must not.

Timing: the frame cadence decides battle length, and therefore the casualty rate per unit of game time. Drive it with a fixed 16 ms step from the same game clock as the main loop (accumulate elapsed time and run whole frames), so 5 frames run per 8 main ticks. It should not depend on display refresh. The original uses two independent wall-clock timers, and their ratio changes in a throttled background browser tab (defect C10). Matching that is not required.

### 5.2 updateGrid

```
updateGrid():
    for every cell: clear its ship list
    for i in 0 .. numShips-1:
        p = ships[i]; if not p.alive: continue
        p.gx = clamp(floor(p.x * 0.1), 0, 30)
        p.gy = clamp(floor(p.y * 0.1), 0, 14)
        append p to grid[p.gy][p.gx]       // in roster order
```

The grid holds only ships that are alive at the start of the frame. It is **not** rebuilt after movement, so both movement and combat in this frame use the pre-move cell assignment.

### 5.3 moveShips

```
moveShips():
    c = findCentroid()                      // computed once, before any ship moves
    for i in 0 .. numShips-1:
        p = ships[i]
        if not p.alive:
            if p.framesDead < 10: drawExplosion(p); p.framesDead++     // §9.2
        else:
            moveSingleShip(p, c)
            draw p as a 2x2 square at (p.x-1, p.y-1) in p.color       // after moving
```

Ships update **in place, in roster order**, so a later ship sees the already-updated `x, y, vx, vy` of earlier ships in this frame.

```
findCentroid():
    mean x and mean y over alive ships
    // if no ship is alive, return the arena centre (155, 75); see defect C7
    cx = 0.8 * meanX + 0.2 * 155
    cy = 0.8 * meanY + 0.2 * 75
```

```
moveSingleShip(p, c):
    // cohesion toward the biased centroid of ALL alive ships (both teams)
    p.vx += (c.x - p.x) * 0.001
    p.vy += (c.y - p.y) * 0.001

    teammatesConsidered = 0
    for row in max(p.gy-1, 0) .. min(p.gy+1, 14):          // inclusive
        for col in max(p.gx-1, 0) .. min(p.gx+1, 30):
            cell = grid[row][col]
            if count(cell) < 2: continue                   // quirk Q2
            for each o in cell, in cell order:
                if not o.alive: continue
                if o.team == p.team:                       // includes p itself (quirk Q1)
                    teammatesConsidered++
                    if teammatesConsidered > 3: continue
                    p.vx += o.vx * 0.01;  p.vy += o.vy * 0.01      // align
                    p.vx -= (o.x - p.x) * 0.1                       // separate
                    p.vy -= (o.y - p.y) * 0.1
                else:
                    p.vx += o.vx * 0.2;   p.vy += o.vy * 0.2        // match enemy
                    p.vx += (o.x - p.x) * 0.2                       // charge enemy
                    p.vy += (o.y - p.y) * 0.2

    // per-axis speed clamp
    if |p.vx| > 2: p.vx = sign(p.vx) * 2
    if |p.vy| > 2: p.vy = sign(p.vy) * 2

    p.x += p.vx;  p.y += p.vy

    // bounce
    if p.x > 310:   p.x = 310; p.vx = -2
    else if p.x < 0: p.x = 0;  p.vx = 2
    if p.y > 150:   p.y = 150; p.vy = -2
    else if p.y < 0: p.y = 0;  p.vy = 2
```

"alive" checks on neighbors read current values. During movement every ship in the grid is still alive, because deaths only happen in `doCombat`.

Design quirks to **reproduce**. Both look accidental, but they shape how battles move and how fast casualties pile up. Changing either would rebalance combat.
- **Q1**: a ship counts itself as a teammate. It uses up one of its 3 "considered teammate" slots and adds `0.01 * its own velocity` (its separation term is zero).
- **Q2**: neighbor cells holding exactly one ship are skipped entirely, even when that ship is an enemy. A lone enemy in an adjacent cell does not attract.

---

## 6. Combat resolution

### 6.1 doCombat

```
doCombat():
    pX = probeCombat * probeCombatBaseRate          // probeCombat * 0.15
    dX = drifterCombat                              // 1.75
    ooda = (attackSpeedFlag == 1) ? probeSpeed * 0.2 : 0

    for row in 0 .. 14:
        for col in 0 .. 30:
            cell = grid[row][col]
            if count(cell) < 2: continue
            L = number of alive team-0 ships in cell     // counted once, before any rolls
            R = number of alive team-1 ships in cell
            if L == 0 or R == 0: continue
            for each p in cell, in cell order:
                if p.team == 0:
                    roll = random() * dX * ((R / L) * 0.5)
                    threshold = 0.5 + ooda
                else:
                    roll = ((random() * pX) + (probeCombat * 0.1)) * ((L / R) * 0.5)
                    threshold = 0.5
                if roll > threshold:                 // strictly greater
                    killShip(p)
    checkForBattleEnd()                              // §7
```

`L` and `R` are fixed for the whole cell pass. Ships killed earlier in the pass still count for the rest of it, so both sides take losses at once. Each ship in a contested cell gets exactly one roll per frame. Cells are visited row-major (row 0 first), and ships within a cell in grid insertion (roster) order. That order only matters for how the random stream is consumed, not for any rule.

### 6.2 Kill probabilities (informative, derived from §6.1)

With `C = probeCombat` and `u = random()`:
- **Probe ship dies** when `u > (0.5 + ooda) * L / (0.875 * R)`. So `P = clamp(1 - (0.5 + 0.2*probeSpeed*[OODA]) * L / (0.875 R), 0, 1)`. At even odds without OODA that is about 0.4286 per frame. With OODA, a probe ship becomes immune once `0.5 + 0.2*probeSpeed >= 0.875 * R/L`.
- **Drifter ship dies** when `0.15*C*u + 0.1*C > R/L`. So `P = clamp(1 - (R/L - 0.1*C) / (0.15*C), 0, 1)` for `C > 0`, and `P = 0` for `C == 0`. At even odds: C=5 gives 1/3, and C ≥ 10 gives certain death every frame.
- Before project 131, `probeCombat` is 0 and cannot be raised, so drifters never die and every battle is lost. Losing a probe in combat (`probesLostCombat >= 1`) is what triggers project 131.

### 6.3 killShip — effect on global counts

```
killShip(p):
    p.alive = false                          // framesDead stays 0; explosion starts next frame
    if p.team == 0:
        numLeftShips -= 1
        if unitSize > probeCount: unitSize = probeCount      // overwrites the shared value (C5)
        probeCount       -= unitSize
        probesLostCombat += unitSize
        refresh "Lost in combat" display     // numberCruncher(probesLostCombat)
    else:
        numRightShips -= 1
        if unitSize > drifterCount: unitSize = drifterCount  // overwrites the shared value (C5)
        drifterCount   -= unitSize
        driftersKilled += unitSize
        refresh "Drifters Killed" and "Drifters" displays (numberCruncher)
```

The clamp overwrites `unitSize` itself, so once either side's global count falls below `unitSize`, every later kill in that battle, on **both** sides, is worth the shrunken value. The floor of 1 from §3.2 is not reapplied, so `unitSize` can reach 0. `createBattle` recomputes `unitSize` from scratch, so the shrink never carries into the next battle. The "Scale" display is not refreshed and keeps showing the battle-start value. This is canonical; defect C5 describes it and gives an optional variant that clamps each kill locally.

In practice the clamp fires whenever the smaller force (the one `unitSize` was sized from) loses about 100 or more ships. That wipes the smaller side's whole population, and the other side's remaining losses in that battle become nearly free. The usual case is a won battle against a drifter force smaller than the probe force.

---

## 7. Battle end and honor

### 7.1 checkForBattleEnd (end of every frame)

```
checkForBattleEnd():
    if length(battles) == 0: return

    if numLeftShips == 0 or numRightShips == 0:
        if project121.flag == 1:
            show result display
            if numLeftShips == 0:                                    // DEFEAT (takes precedence, C2)
                if honorCount == 0:
                    bonusHonor = 0
                    honor = honor - battleLEFTSHIPS
                    honorCount = 1
                result text = "DEFEAT"; sign = "-"; amount = battleLEFTSHIPS
                threnodyTitle = battleName
            else:                                                     // numRightShips == 0: VICTORY
                if honorCount == 0:
                    honorReward = battleRIGHTSHIPS + bonusHonor
                    honor = honor + honorReward
                    if project134.flag == 1: bonusHonor = bonusHonor + 10
                    honorCount = 1
                result text = "VICTORY"; sign = "+"; amount = honorReward
            refresh honor display = round(honor) with thousands separators
        battleEndDelay += 1
    else if numLeftShips <= 4 or numRightShips <= 4:
        battleClock += 1
        if battleClock > 2000: endBattle(); return

    if battleEndDelay >= battleEndTimer: endBattle(); return

    masterBattleClock += 1
    if masterBattleClock >= 8000: endBattle(); return
```

The `return`s after `endBattle()` are required. The original keeps going, so after a wipe-out or stalemate ending the next battle's `masterBattleClock` starts at 1 (defect C6).

Outcomes:
- **Wipe-out with project 121:** honor is applied once per battle (the `honorCount` latch) on the first frame a side reaches 0. The result shows for `battleEndTimer` frames (200 after project 121, about 3.2 s), then the battle ends. Survivors keep flying during that time. They cannot fight, because no enemy is left.
- **Wipe-out without project 121:** no honor change, nothing shown, and the battle ends after `battleEndTimer` frames (100, about 1.6 s).
- **Stalemate:** once either side is at 4 ships or fewer (and neither is at 0), `battleClock` counts frames. It never resets mid-battle. When it exceeds 2000 the battle ends with no honor change and `bonusHonor` untouched, so a streak survives a stalemate.
- **Hard cap:** 8000 frames after the start (`masterBattleClock`), the battle ends with no honor change.
- `honor` can go negative after defeats. That is allowed.
- Honor only moves during battles once project 121 is complete. Before that, battles only trade probes for drifters.

### 7.2 endBattle

```
endBattle():
    hide result display
    honorCount = 0; battleClock = 0; masterBattleClock = 0; battleEndDelay = 0
    remove battles[0]
    clear the roster (ships = [], counts = 0)     // required; see C1
```

---

## 8. Battle naming

Before project 121, battles are named `"Drifter Attack " + battleID` (for example "Drifter Attack 1"). After project 121 (`battleNameFlag == 1`), each new battle uses `generateBattleName()`:

```
generateBattleName():
    x = floor(random() * length(battleNames))
    name = battleNames[x] + " " + battleNumbers[x]
    battleNumbers[x] += 1
    return name
```

`battleNumbers` starts as one `1` per name and is persisted. `battleNames`, in order (104 entries; the original lists "Jena-Auerstedt" twice, see C4):

Aboukir, Abensberg, Acre, Alba de Tormes, la Albuera, Algeciras Bay, Amstetten, Arcis-sur-Aube, Aspern-Essling, Jena-Auerstedt, Arcole, Austerlitz, Badajoz, Bailen, la Barrosa, Bassano, Bautzen, Berezina, Bergisel, Borodino, Burgos, Bucaco, Cadiz, Caldiero, Castiglione, Castlebar, Champaubert, Chateau-Thierry, Copenhagen, Corunna, Craonne, Dego, Dennewitz, Dresden, Durenstein, Eckmuhl, Elchingen, Espinosa de los Monteros, Eylau, Cape Finisterre, Friedland, Fuentes de Onoro, Gevora River, Gerona, Hamburg, Haslach-Jungingen, Heilsberg, Hohenlinden, Kaihona, Kolberg, Landshut, Leipzig, Ligny, Lodi, Lubeck, Lutzen, Marengo, Maria, Medellin, Medina de Rioseco, Millesimo, Mincio River, Mondovi, Montebello, Montenotte, Montmirail, Mount Tabor, The Nile, Novi, Ocana, Cape Ortegal, Orthez, Pancorbo, Piave River, The Pyramids, Quatre Bras, Raab, Raszyn, Rivoli, Rolica, La Rothiere, Rovereto, Saalfeld, Schongrabern, Salamanca, Smolensk, Somosierra, Talavera, Tamames, Trafalgar, Trebbia, Tudela, Ulm, Valls, Valmaseda, Valutino, Vauchamps, Vimeiro, Vitoria, Wagram, Waterloo, Wavre, Wertingen, Zaragoza

(Capitalization as listed: "la Albuera" and "la Barrosa" are lowercase, "La Rothiere" is uppercase.)

`threnodyTitle` (initially "Durenstein 1") is set to `battleName` on each defeat (§7.1). Project 133's title reads it (sections 05/06).

---

## 9. Presentation (visual only)

Nothing in this subsection affects gameplay.

### 9.1 Battle panel

- A display area of 310 x 150 pixels, centered, background color #808080. It is cleared to the background every frame.
- Visible when `battleFlag == 1`, hidden otherwise. The ending sequence hides it (section 04, `endTimer1 >= 175`).
- Overlaid at the top-left (inset about 15 px from the left and 8 px from the top), stacked:
  1. Bold label `Combat`
  2. The battle name (`battleName`)
  3. Result display (hidden unless shown by §7.1; **hidden initially**, see C3), centered in a 289 px wide block:
     - line 1: `VICTORY` or `DEFEAT`
     - line 2: sign + amount + ` honor`, for example `+200 honor` or `-37 honor`. The amount is a plain integer.
  4. `Scale = ` + numberCruncher(unitSize, 0) + `:1`

### 9.2 Ships and explosions

Draw in roster order during `moveShips` (§5.3):
- Alive ship: a filled 2 x 2 square with top-left at (x-1, y-1) in the team color. Probes are #ffffff and drifters are #000000.
- Dead ship, for `framesDead` = 0 .. 9 (10 frames, starting the frame after death), in #ffffff:
  - `framesDead == 0`: a 7 x 7 square at (x-3, y-3)
  - `framesDead == 1`: a 3 x 3 square at (x-1, y-1)
  - every one of the 10 frames: four 1 x 1 pixels at (x+f, y+f), (x-f, y+f), (x+f, y-f), (x-f, y-f), where f = `framesDead`
  - then increment `framesDead`. After 10 frames the dead ship is no longer drawn.

Coordinates are fractional. Fill using the platform's normal rectangle rasterization; anti-aliasing is acceptable.

### 9.3 Related displays

- Probe panel (section 04): `Drifters Killed: ` numberCruncher(`driftersKilled`) and `Drifters: ` numberCruncher(`drifterCount`), visible when `battleFlag == 1`. `Lost in combat: (` numberCruncher(`probesLostCombat`) `)`, visible when `probesLostCombat >= 1`. Kills refresh these immediately (§6.3). The main-loop display refresh covers them otherwise.
- Honor line: `Honor: ` + round(`honor`) with thousands separators (en-US style "12,345"). Visible when `project121.flag == 1`. The ending sequence hides it (`endTimer1 >= 190`).
- Combat design row: `Combat: ` + `probeCombat`, with `<` / `>` buttons and the tooltip `Determines offensive and defensive effectiveness in battle`. Visible when `project131.flag == 1` (section 04).

---

## 10. Combat-related project effects (summary)

| Project | Effect on combat |
|---|---|
| 131 "Combat" | Makes the `probeCombat` allocation available. Before it, drifters cannot die. |
| 120 "The OODA Loop" | `attackSpeedFlag = 1`. The probe death threshold becomes `0.5 + 0.2*probeSpeed`. |
| 121 "Name the battles" | `battleNameFlag = 1` (historical names), `battleEndTimer = 200`. Enables honor gain/loss, the result display, and the honor line. |
| 134 "Glory" | Each victory with honor adds 10 to `bonusHonor`. A defeat resets it to 0. |
| 132, 133 | Add honor directly (sections 05/06). 133 uses `threnodyTitle`. |

---

## 11. Known defects in original: recommendations

Recommendations follow 00-overview §4 policy; Gameplay items marked Keep original are canonical.

Magnitudes below come from a port of the §4–§7 simulation (seeded, 1,500–2,400 battles per configuration) and from a coarse one-hour model of the space phase: 10 ms ticks with probe replication and value drift, the battle simulation on a 16 ms frame, project 121 and 134 done, no hazards, no matter or clip limits. Treat the hourly numbers as order-of-magnitude.

#### 07-C1 — Phantom battles outside an active battle
- **Location:** combat.js `Battle` constructor and `Update` timer (started once at script load by `app.initialize`), `endBattle`.
- **Original behavior:** the 16 ms frame (`UpdateGrid`, `MoveShips`, `DoCombat`) runs from page load onward whether or not a battle is active. At script load `battleRestart` builds a 200 v 200 roster from the default `battleLEFTSHIPS`/`battleRIGHTSHIPS`. `endBattle` does not clear the roster, so after a stalemate or hard-cap ending the survivors keep flying and fighting. Every phantom kill applies §6.3 normally (subtracts `unitSize`, adds to `probesLostCombat`/`driftersKilled`), but `checkForBattleEnd` returns at once when `battles` is empty, so honor never changes. The phantom roster is replaced only when `createBattle` runs.
- **Fixed behavior:** run updateGrid/moveShips/doCombat only while `length(battles) > 0`; start with an empty roster; clear the roster in `endBattle` (§5.1, §7.2).
- **Category:** Gameplay
- **Player impact:** none measurable in normal play. While a new battle can start, `checkForBattles` replaces the leftover roster after about 2 main ticks (about 1 frame), and the opposing lines need at least 47 frames (about 0.75 s) to make contact. The startup roster never meets either: `load()` → `refresh()` empties `battles`, and a new battle replaces the roster long before contact. The model recorded 0 phantom kills in 15 simulated hours, and honor is never affected. Phantom kills happen only when no new battle can start (`drifterCount <= warTrigger`, `probeCount == 0`, or during the ending): leftover survivors, or the startup roster after a load, fight to the end, costing at most 200 × `unitSize` on each side as a one-off. With `drifterCount <= 1,000,000`, `unitSize` is normally at most 10,000 (the original's C5 shrink usually leaves it tiny after a drifter wipe-out), so that is at most about 2,000,000 probes. With `probeCount == 0`, the first phantom probe death clamps `unitSize` to 0 and every later kill is worth 0.
- **Recommendation:** Fix
- **Rationale:** in normal play the impact is nil, and the edge cases (casualties with no battle on screen) are plainly broken. Matches 00-overview §4 item 8. Fixing C1 also matters if anyone adopts the C5 variant: without the shrink, a phantom roster after a load could cost up to 2 × the previous battle's smaller force.

#### 07-C2 — Simultaneous annihilation shows the wrong result
- **Location:** `checkForBattleEnd`.
- **Original behavior:** if both sides reach 0 in the same frame, the defeat block runs (when `honorCount == 0`: `bonusHonor = 0`, `honor -= battleLEFTSHIPS`, `honorCount = 1`; text "DEFEAT", "-", amount `battleLEFTSHIPS`; `threnodyTitle = battleName`). Then the victory block also runs. Its honor part is skipped because `honorCount` is already 1, but it overwrites the text with "VICTORY" and "+". The screen shows "VICTORY +`battleLEFTSHIPS` honor" while honor dropped by that amount.
- **Fixed behavior:** the victory block runs only when `numLeftShips != 0` (the `else` in §7.1). Effects are unchanged, and the display reads "DEFEAT -N honor".
- **Category:** Display
- **Player impact:** honor, streak and `threnodyTitle` are identical either way; only the result text differs. Frequency is about 1 battle in 1,500 at the most even matchup (probeCombat 5 vs 200 ships each), and 0 in 1,500 at other settings.
- **Recommendation:** Fix
- **Rationale:** display-only, and the fixed text matches what actually happened to honor.

#### 07-C3 — Stale placeholder result on a fresh game
- **Location:** index2.html default content of the result display; `refresh()` is the only code that hides it at startup.
- **Original behavior:** the result block's markup reads "VICTORY / +200 honor" and is visible by default. `refresh()` hides it, but at startup it runs only after `load()` or when a prestige save exists. So in a first-universe game that has never been reloaded, the placeholder shows on the battle panel from the first battle (even before project 121) until the first `endBattle` hides it. That happens at the end of battle 1.
- **Fixed behavior:** the result display starts hidden (§9.1).
- **Category:** Display
- **Player impact:** none on state; removes a misleading "+200 honor" during the first battle of a first game.
- **Recommendation:** Fix
- **Rationale:** display-only.

#### 07-C4 — Duplicate battle name
- **Location:** `battleNames`, `battleNumbers`, `generateBattleName`.
- **Original behavior:** a 105-entry list with "Jena-Auerstedt" at index 9 and at index 48, each with its own counter. Jena-Auerstedt is picked 2/105 of the time, and the same name with the same number (for example "Jena-Auerstedt 1") can appear twice.
- **Fixed behavior:** the 104-name list in §8 (the original with index 48 removed), one counter per name.
- **Category:** Display
- **Player impact:** cosmetic only. Battle names also feed `threnodyTitle` and project 133's title, which are text only. If original saves are imported (optional, 00-overview §4 item 9), map the original `battleNumbers` by name: drop index 48 (or merge it with index 9 by taking the larger value), and shift indices 49–104 down by one.
- **Recommendation:** Fix
- **Rationale:** no gameplay effect, and repeated names look like a bug.

#### 07-C5 — Casualty clamp shrinks `unitSize` for the rest of the battle
- **Location:** `DoCombat`, kill handling (§6.3).
- **Original behavior:** as specified in §6.3: before each subtraction, `if unitSize > count: unitSize = count` on the dying ship's side, overwriting the shared `unitSize`. Once either side's global count falls below `unitSize`, every later kill on both sides is worth the shrunken value (possibly 0) until `createBattle` recomputes it. It does not compound across battles. The shrunken value is saved, but nothing reads it before the next `createBattle` (with C1 fixed and 08's discard-on-load).
- **Fixed behavior (optional variant):** leave `unitSize` untouched during the battle and clamp each kill locally: `loss = min(unitSize, probeCount)` for a probe ship, or `loss = min(unitSize, drifterCount)` for a drifter ship, then subtract `loss` and add `loss` to `probesLostCombat`/`driftersKilled`.
- **Category:** Gameplay
- **Player impact:** the clamp fires when the smaller force loses about 100+ ships, which wipes it out in either version. The difference is what the rest of that battle costs the other side. Typical case: a won battle against drifters smaller than the probe force. After the 100th drifter ship dies, the probe force loses another 34–61 ships on average (probeCombat 5–10, with or without OODA). The original charges almost nothing for them; the variant charges `drifterCount_at_start/100` each, about 0.35–0.6 × the drifter force per such battle. In the one-hour model (about 400 battles), the variant ends with 19–33% fewer probes when replication is running. Without replication, combat probe losses rise 8–24% and drifters killed fall 4–10%. The reverse case (probes smaller and wiped, so drifters' later losses become free in the original) adds 15–80 drifter ship kills to the variant, but the player has already lost all probes. Honor: no direct effect, since honor depends only on ship counts. With identical random streams the two versions earned identical honor.
- **Recommendation:** Keep original, fix as optional variant
- **Rationale:** the variant noticeably slows late space-phase probe growth, and the original's result looks fine to players: no negative counts, and nothing visible beyond a stale "Scale".

#### 07-C6 — `masterBattleClock` off by one after a battle ends
- **Location:** `checkForBattleEnd`.
- **Original behavior:** after `endBattle()` resets the clocks, the same call continues and runs `masterBattleClock++` (and the 8000 test). After a wipe-out or stalemate ending, the clock is therefore 1 when the next battle starts, and that battle hits the hard cap after 7,999 frames instead of 8,000. After a hard-cap ending, the clock stays 0. `endBattle` runs at most once per frame: the later checks see the freshly reset counters and cannot fire.
- **Fixed behavior:** return immediately after each `endBattle()` (§7.1).
- **Category:** Gameplay
- **Player impact:** negligible: the hard cap moves by one 16 ms frame out of 128 s, and fewer than 1% of simulated battles reached the hard cap at all.
- **Recommendation:** Fix
- **Rationale:** impact is negligible, and the fixed control flow is cleaner.

#### 07-C7 — Centroid divide by zero
- **Location:** `FindCentroid`.
- **Original behavior:** with no live ships, the centroid is 0/0 = NaN. It is computed only when every ship is dead (mutual annihilation), so no ship moves using it.
- **Fixed behavior:** with no live ships, use the arena center (155, 75) before the 0.8/0.2 blend (§5.3).
- **Category:** Code-only
- **Player impact:** none.
- **Recommendation:** Fix
- **Rationale:** avoids NaN with no behavior change.

#### 07-C8 — Dead legacy battle model
- **Location:** `updateBattles`, `battleWrite`, `battleCleanUp`, `updateBattleDisplay` (all commented out); `attackSpeed`, `battleSpeed`, `attackSpeedMod`, `battleAlarm`, `outcomeTimer`, battle-record fields, the `tt = random() * availableMatter` territory draw in `createBattle`.
- **Original behavior:** declared, partly saved and partly mutated (the Speed buttons change `attackSpeed`), never read. Battles never reduce `availableMatter`. The territory draw only consumes one random number.
- **Fixed behavior:** leave all of it out (§2.3). A battle record holds only its `id`.
- **Category:** Code-only
- **Player impact:** none, apart from the order of the random stream, which 00-overview §3 does not require reproducing.
- **Recommendation:** Fix
- **Rationale:** dead code. Section 04's `war()` summary already says territory never reduces `availableMatter`.

#### 07-C9 — Zero-ship probe side
- **Location:** `createBattle`, hinder roll.
- **Original behavior:** `battleLEFTSHIPS = ceil(random() * 175)` gives 0 when `random()` returns exactly 0. The roster then has no probe ships, and the first frame scores a DEFEAT: honor −0, but `bonusHonor` is reset to 0 (a Glory streak is lost) and `threnodyTitle` is set.
- **Fixed behavior:** `battleLEFTSHIPS = max(battleLEFTSHIPS, 1)` (§3.2).
- **Category:** Gameplay
- **Player impact:** negligible: odds about 2^-53 per hinder roll.
- **Recommendation:** Fix
- **Rationale:** a battle lost before it starts is plainly broken, and the odds make the change invisible.

#### 07-C10 — Battle frames on an independent wall-clock timer
- **Location:** `app.initialize` (`setInterval(Update, 16)`) vs. the main loop `setInterval(…, 10)` in main.js.
- **Original behavior:** frames and main ticks run on separate browser timers. In a foreground tab that gives 5 frames per 8 ticks. When a browser throttles a background tab, both timers are clamped by the browser (typically to 1 per second), so the ratio drifts toward 1:1 and battles run up to 1.6× faster relative to the economy. The exact ratio depends on the browser.
- **Fixed behavior:** run frames on a fixed 16 ms step of the same game clock as the main loop, with the 01 §3 ordering (§5.1).
- **Category:** Gameplay
- **Player impact:** none in a foreground tab. In a throttled tab the original's battles (casualties and honor per unit of game time) run relatively faster, by an amount that depends on the browser.
- **Recommendation:** Fix
- **Rationale:** the original's throttled behavior depends on host timer policy and cannot be specified well enough to reproduce. The foreground behavior, which players know, is preserved. Consistent with 00-overview §3 and §4 item 8.

**Not defects (reproduce as specified):** Q1 and Q2 in §5.3. The 50% hinder roll on the probe side only. Honor going negative. Stalemates keeping a Glory streak alive. `drifterCombat`, `warTrigger` and `maxBattles` being constants.
