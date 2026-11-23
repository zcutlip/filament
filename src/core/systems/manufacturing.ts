import { notImplemented } from "../internal/not-implemented";
import type { GameState } from "../state";

/**
 * Making clips (spec 01 §4). Stubs only; behavior lands in GREEN.
 */
export interface UpgradeThresholds {
  readonly factories: number;
  readonly drones: number;
}

export function clipClick(_state: GameState, _number: number): void {
  notImplemented("clipClick");
}

export function makeClipper(_state: GameState): void {
  notImplemented("makeClipper");
}

export function makeMegaClipper(_state: GameState): void {
  notImplemented("makeMegaClipper");
}

export function updateClipRate(_state: GameState): void {
  notImplemented("updateClipRate");
}

export function updateUpgrades(_state: GameState): UpgradeThresholds {
  return notImplemented("updateUpgrades");
}
