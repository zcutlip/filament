/**
 * Every stub fails through this helper so RED tests see a "not implemented"
 * failure instead of a collection error (docs/product/TDD.md, Phase 0).
 */
export function notImplemented(feature: string): never {
  throw new Error(`not implemented: ${feature}`);
}
