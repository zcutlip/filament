import type { Game } from "./game";
import { notImplemented } from "./internal/not-implemented";

/**
 * A player action (ARCH-4). The catalog of concrete command types is derived
 * from the buttons, sliders and selectors in spec 02 and is added with those
 * batches; this is the transport envelope every command shares.
 */
export interface Command {
  readonly type: string;
  readonly args?: Readonly<Record<string, unknown>>;
}

/** Result of executing a command (ARCH-4). */
export type CommandResult =
  | { readonly status: "accepted" }
  | { readonly status: "rejected"; readonly reason: string };

/**
 * Validates and executes one command at the moment it runs (00 §4 item 3).
 * UI input, API calls and replays all use this path (ARCH-4).
 */
export function executeCommand(_game: Game, _command: Command): CommandResult {
  return notImplemented("executeCommand");
}
