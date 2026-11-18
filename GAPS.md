# Gaps

Spec gaps, contradictions and undecided details met while implementing. Each
entry follows `AGENTS.md` §4.

## G-001 — Initial values for the revenue-tracker module variables

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
- **Open (load path):** two readings of the rules produce different output.
  - Persist the six scalars per 08-P10 and still apply 01-D5 ("persisting is
    recommended"): the saved averages are shown until the first
    `calculateRev()`, then the first sample is 0.
  - Keep the six scalars transient and re-initialize on load per 01-D5: the
    restored `incomeTracker` is averaged with a 0 first sample, so the saved
    averages are lost for up to 10 s.
  - Both readings fix the original `NaN`; they differ in whether the two
    revenue readouts resume the saved averages or restart from the restored
    tracker.
- **Recommendation:** keep `0` for fresh state. For the load path, persist the
  six scalars per 08-P10 and still set `incomeNow = income` on load per 01-D5;
  that satisfies both texts and preserves the readouts. Decide it in the 08
  batch.
- **Status:** fresh state resolved; load path decided at 08.
