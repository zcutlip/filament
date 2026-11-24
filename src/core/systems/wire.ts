import type { Rng } from "../rng";
import type { GameState } from "../state";

/**
 * Wire price drift (01 §5.1). Runs every 100 ms in the slow loop.
 */
export function adjustWirePrice(state: GameState, rng: Rng): void {
  state.wirePriceTimer += 1;

  if (state.wirePriceTimer > 250 && state.wireBasePrice > 15) {
    state.wireBasePrice = state.wireBasePrice - state.wireBasePrice / 1000;
    state.wirePriceTimer = 0;
  }

  if (rng.next() < 0.015) {
    state.wirePriceCounter += 1;
    state.wireCost = Math.ceil(state.wireBasePrice + 6 * Math.sin(state.wirePriceCounter));
  }
}

/**
 * Buy one spool of wire (01 §5.2). The displayed cost stays fixed until the
 * next price fluctuation.
 */
export function buyWire(state: GameState): void {
  if (state.funds >= state.wireCost) {
    state.wirePriceTimer = 0;
    state.wire += state.wireSupply;
    state.funds -= state.wireCost;
    state.wirePurchase += 1;
    state.wireBasePrice += 0.05;
  }
}
