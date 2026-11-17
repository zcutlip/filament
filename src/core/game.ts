import { notImplemented } from "./internal/not-implemented";
import type { Rng } from "./rng";
import type { GameState } from "./state";

/**
 * The running simulation: state plus the injected random source (ARCH-1).
 * The host owns the instance and chooses pacing (ARCH-6).
 */
export interface Game {
  readonly state: GameState;
  readonly rng: Rng;
}

export interface NewGameOptions {
  /** Seed for the injected PRNG (ARCH-3). */
  readonly seed: number;
}

export function createGame(_options: NewGameOptions): Game {
  return notImplemented("createGame");
}
