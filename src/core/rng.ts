import { notImplemented } from "./internal/not-implemented";

/**
 * Persistable state of the injected PRNG (ARCH-3). The algorithm is recorded
 * with its state so a save from an older build can be rejected or migrated.
 */
export interface RngState {
  readonly algorithm: string;
  readonly state: readonly number[];
}

/**
 * Uniform random source injected into the core (ARCH-1, ARCH-3). The core
 * must never use Math.random or another global source.
 */
export interface Rng {
  /** Returns a uniform real in [0, 1). */
  next(): number;
  /** Returns the current state for the save (ARCH-3, ARCH-7). */
  snapshot(): RngState;
}

export function createRng(_seed: number): Rng {
  return notImplemented("createRng");
}

export function restoreRng(_state: RngState): Rng {
  return notImplemented("restoreRng");
}
