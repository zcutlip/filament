# Gaps

Spec gaps, contradictions and undecided details met while implementing. Each
entry follows `AGENTS.md` §4.

## G-001 — Revenue-tracker initial and load values

- **Spec:** 01 §2.2 (`incomeThen` marked "see D5"; `incomeLastSecond`,
  `trueAvgRev`, `avgSales` marked "—"); 01-D5; 01 §6.3; 08 §4.1, §4.3, 08-P10.
- **Issue:** The inventory gives no starting value for these four variables.
  Two load-path rules also meet here: 01-D5 requires `incomeNow = income` after
  every load, while 08-P10 recommends persisting the revenue trackers. The save
  set persists `incomeTracker` but not `income`, `incomeThen`, `incomeNow`,
  `incomeLastSecond`, `trueAvgRev` or `avgSales` (08 §4.1, §4.3).
- **Decision (01 §2 batch):** `createInitialState()` sets all four to `0`.
- **Reasoning:** `calculateRev()` executes `incomeThen = incomeNow` before
  reading `incomeThen`, then computes `incomeLastSecond`, `trueAvgRev` and
  `avgSales`, so the initializers are overwritten before any read; the computed
  values are what reach the readouts. At a fresh start `income` and `incomeNow`
  are both `0`. The choice is unobservable on the specified tick path, not
  because the values are never displayed.
- **Open (load path):** both readings keep the saved `incomeTracker` (it is in
  the 08 §4.1 save set) and record the first second's revenue as the first new
  sample, because 01 §3.2 runs sales before `calculateRev()` and `secTimer`
  restarts at 0. They differ only in the readouts during that first second.
  - Persist `income` and the five tracker scalars per 08-P10, and still apply
    01-D5 (`incomeNow = income` on load): `avgSales` shows the saved value for
    the first second. Cost: six new fields in the 231-field save set.
  - Keep those six transient and apply 01-D5: `avgSales` starts at 0 for the
    first second; the restored `incomeTracker` and `avgRev` stay. Cost: the
    saved `avgSales` is discarded.
  - After the first `calculateRev()` (~1 s) both compute from the same restored
    tracker, so their readouts converge; its samples then age out one per
    second.
- **Recommendation:** keep `0` for fresh state. The load path needs a ruling:
  persisting adds six fields to 08 §4.1, which 08 §4.3 currently lists as not
  persisted, while 08-P10 recommends persisting. Decide before the 08 batch.
- **Status:** fresh state resolved; load path open, awaiting the save-set ruling.
