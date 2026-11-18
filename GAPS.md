# Gaps

Spec gaps, contradictions and undecided details met while implementing. Each
entry follows `AGENTS.md` §4.

## G-001 — Initial values for the revenue-tracker module variables

- **Spec:** 01 §2.2 (`incomeThen` marked "see D5"; `incomeLastSecond`,
  `trueAvgRev`, `avgSales` marked "—"); 01-D5; 01 §6.3; 08 §4.1, §4.3, 08-P10.
- **Issue:** The inventory gives no starting value for these four variables.
  01-D5 fixes only `incomeNow`, and 08-P10 leaves the load path open between
  persisting the trackers and re-initializing `incomeNow`.
- **Decision (01 §2 batch):** `createInitialState()` sets all four to `0`.
- **Reasoning:** `calculateRev()` executes `incomeThen = incomeNow` before
  reading `incomeThen`, then computes `incomeLastSecond`, `trueAvgRev` and
  `avgSales`, so the initializers are overwritten before any read; the computed
  values are what reach the readouts. At a fresh start `income` and `incomeNow`
  are both `0`. The choice is unobservable on the specified tick path, not
  because the values are never displayed.
- **Open:** the post-load initializer for these four variables is still
  unspecified. 08-P10 decides whether the trackers are persisted; this batch
  does not constrain that decision.
- **Recommendation:** keep `0`; resolve the load path with 08-P10 in the 08
  batch.
- **Status:** resolved for 01 §2; 08 batch to confirm.
