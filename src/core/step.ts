import type { Game } from "./game";
import { notImplemented } from "./internal/not-implemented";

/**
 * Advances the simulation by `ticks` fixed base steps of 10 ms each (ARCH-6).
 * The host chooses pacing; the core never reads wall-clock time (ARCH-1).
 */
export function step(_game: Game, _ticks: number): void {
  notImplemented("step");
}
