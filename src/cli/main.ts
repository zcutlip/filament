import { notImplemented } from "../core/internal/not-implemented";

/**
 * Command-line harness (milestone 1). It will create a game, apply a scripted
 * command log and step it deterministically. Not implemented yet.
 */
export async function main(_args: readonly string[]): Promise<number> {
  return notImplemented("cli");
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
