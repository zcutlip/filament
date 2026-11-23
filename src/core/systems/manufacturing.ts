import type { GameState } from "../state";

/**
 * Making clips (spec 01 §4).
 */
export interface UpgradeThresholds {
  readonly factories: number;
  readonly drones: number;
}

/**
 * The single clip-production primitive (01 §4.1). Used by the manual button
 * and every automated producer.
 */
export function clipClick(state: GameState, number: number): void {
  if (state.dismantle >= 4) {
    state.finalClips += 1;
  }

  if (state.wire >= 1) {
    const amount = Math.min(number, state.wire);
    state.clips += amount;
    state.unsoldClips += amount;
    state.wire -= amount;
    state.unusedClips += amount;
  }
}

/**
 * Buy one AutoClipper (01 §4.2). The price is recomputed even when the
 * purchase fails.
 */
export function makeClipper(state: GameState): void {
  if (state.funds >= state.clipperCost) {
    state.clipmakerLevel += 1;
    state.funds -= state.clipperCost;
  }
  state.clipperCost = 1.1 ** state.clipmakerLevel + 5;
}

/**
 * Buy one MegaClipper (01 §4.3). The price is recomputed even when the
 * purchase fails.
 */
export function makeMegaClipper(state: GameState): void {
  if (state.funds >= state.megaClipperCost) {
    state.megaClipperLevel += 1;
    state.funds -= state.megaClipperCost;
  }
  state.megaClipperCost = 1.07 ** state.megaClipperLevel * 1000;
}

/**
 * Clip-rate tracker, main tick step 10 (01 §4.4). Publishes once per 100
 * ticks; the reset tick takes no sample and does not update `prevClips`.
 */
export function updateClipRate(state: GameState): void {
  state.clipRateTracker += 1;

  if (state.clipRateTracker < 100) {
    state.clipRateTemp += state.clips - state.prevClips;
    state.prevClips = state.clips;
  } else {
    state.clipRateTracker = 0;
    state.clipRate = state.clipRateTemp;
    state.clipRateTemp = 0;
  }
}

/**
 * Factory and drone upgrade thresholds (01 §4.5). Returns the hint pair; the
 * values are display-only and 01 §2 lists no state fields for them.
 */
export function updateUpgrades(state: GameState): UpgradeThresholds {
  return {
    factories: factoryThreshold(state.maxFactoryLevel),
    drones: droneThreshold(state.maxDroneLevel),
  };
}

function factoryThreshold(level: number): number {
  if (level < 10) {
    return 10;
  }
  if (level < 20) {
    return 20;
  }
  if (level < 50) {
    return 50;
  }
  return 0;
}

function droneThreshold(level: number): number {
  if (level < 500) {
    return 500;
  }
  if (level < 5000) {
    return 5000;
  }
  if (level < 50000) {
    return 50000;
  }
  return 0;
}
