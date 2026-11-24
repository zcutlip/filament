import { notImplemented } from "../internal/not-implemented";
import type { Rng } from "../rng";
import type { GameState } from "../state";

/**
 * Wire price and purchases (spec 01 §5.1–5.2). Stubs only; behavior lands in
 * GREEN.
 */
export function adjustWirePrice(_state: GameState, _rng: Rng): void {
  notImplemented("adjustWirePrice");
}

export function buyWire(_state: GameState): void {
  notImplemented("buyWire");
}
