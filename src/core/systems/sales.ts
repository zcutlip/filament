import { notImplemented } from "../internal/not-implemented";
import type { GameState } from "../state";

/**
 * Selling (spec 01 §6). Stubs only; behavior lands in GREEN.
 */
export function updateDemand(_state: GameState): void {
  notImplemented("updateDemand");
}

export function sellClips(_state: GameState, _number: number): void {
  notImplemented("sellClips");
}

export function calculateRev(_state: GameState): void {
  notImplemented("calculateRev");
}

export function raisePrice(_state: GameState): void {
  notImplemented("raisePrice");
}

export function lowerPrice(_state: GameState): void {
  notImplemented("lowerPrice");
}

export function buyAds(_state: GameState): void {
  notImplemented("buyAds");
}
