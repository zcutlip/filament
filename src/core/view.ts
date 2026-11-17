import type { Game } from "./game";
import { notImplemented } from "./internal/not-implemented";

/**
 * Renderer- and input-neutral view of the game (ARCH-5). Panels, fields,
 * enabled controls, console lines and active effects are added with the
 * section 02 batch.
 */
export interface ViewModel {
  /** Tick the view was produced at (API-3). */
  readonly tick: number;
}

/** Pure function of state (ARCH-5). */
export function getViewModel(_game: Game): ViewModel {
  return notImplemented("getViewModel");
}
