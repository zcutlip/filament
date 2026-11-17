import type { Game } from "./game";
import { notImplemented } from "./internal/not-implemented";

/** Who produced the save (G7). */
export interface Provenance {
  readonly play: "human" | "agent" | "mixed";
  readonly pacing: "real-time" | "stepped";
  readonly debug: boolean;
  /** Manual actions per game second (G2). */
  readonly agentInputLimit: number;
}

/**
 * Metadata stored alongside the game state (ARCH-7). Timestamps are supplied
 * by the host so the core never reads a clock (ARCH-1).
 */
export interface SaveMetadata {
  readonly formatVersion: number;
  readonly sessionId: string;
  readonly provenance: Provenance;
  /** Individually enabled optional variants (00 §4 item 0). */
  readonly variants: Readonly<Record<string, boolean>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LoadedSave {
  readonly game: Game;
  readonly metadata: SaveMetadata;
}

/** Serializes state, RNG state and metadata into one versioned document. */
export function serializeSave(_game: Game, _metadata: SaveMetadata): string {
  return notImplemented("serializeSave");
}

/** Refuses unknown future versions rather than loading them partially. */
export function deserializeSave(_serialized: string): LoadedSave {
  return notImplemented("deserializeSave");
}
