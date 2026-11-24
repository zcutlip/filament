import { describe, expect, test } from "bun:test";
import type { Rng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/state";
import { adjustWirePrice, buyWire } from "../../src/core/systems/wire";

function fixedRng(...values: readonly number[]): Rng {
  let index = 0;
  return {
    next(): number {
      const value = values[index] ?? 0;
      index += 1;
      return value;
    },
    snapshot() {
      return { algorithm: "fixed", state: [] };
    },
  };
}

describe("01 §5.1 wire price drift", () => {
  test("increments the timer without decaying at 250", () => {
    const state = createInitialState();
    state.wirePriceTimer = 249;
    state.wireBasePrice = 20;

    adjustWirePrice(state, fixedRng(0.5));

    expect(state.wirePriceTimer).toBe(250);
    expect(state.wireBasePrice).toBe(20);
    expect(state.wireCost).toBe(20);
  });

  test("decays the base price by 0.1% after the timer passes 250", () => {
    const state = createInitialState();
    state.wirePriceTimer = 250;
    state.wireBasePrice = 20;

    adjustWirePrice(state, fixedRng(0.5));

    expect(state.wirePriceTimer).toBe(0);
    expect(state.wireBasePrice).toBeCloseTo(19.98, 10);
  });

  test("keeps decaying while the base price is above 15", () => {
    const state = createInitialState();
    state.wirePriceTimer = 250;
    state.wireBasePrice = 15.01;

    adjustWirePrice(state, fixedRng(0.5));

    expect(state.wirePriceTimer).toBe(0);
    expect(state.wireBasePrice).toBeCloseTo(14.99499, 10);
  });

  test("stops decaying once the base price is 15", () => {
    const state = createInitialState();
    state.wirePriceTimer = 250;
    state.wireBasePrice = 15;

    adjustWirePrice(state, fixedRng(0.5));

    expect(state.wirePriceTimer).toBe(251);
    expect(state.wireBasePrice).toBe(15);
  });

  test("leaves the displayed cost alone without a fluctuation", () => {
    const state = createInitialState();
    state.wirePriceCounter = 3;
    state.wireBasePrice = 20;
    state.wireCost = 20;

    adjustWirePrice(state, fixedRng(0.5));

    expect(state.wirePriceCounter).toBe(3);
    expect(state.wireCost).toBe(20);
  });

  test("updates the cost when the random draw is below 0.015", () => {
    const state = createInitialState();
    state.wirePriceCounter = 3;
    state.wireBasePrice = 20;
    state.wireCost = 20;

    adjustWirePrice(state, fixedRng(0));

    expect(state.wirePriceCounter).toBe(4);
    expect(state.wireCost).toBe(16);
  });

  test("does not update the cost at exactly 0.015", () => {
    const state = createInitialState();
    state.wirePriceCounter = 3;
    state.wireBasePrice = 20;
    state.wireCost = 20;

    adjustWirePrice(state, fixedRng(0.015));

    expect(state.wirePriceCounter).toBe(3);
    expect(state.wireCost).toBe(20);
  });

  test("takes a new sinusoid sample on each fluctuation", () => {
    const state = createInitialState();
    state.wirePriceCounter = 3;
    state.wireBasePrice = 20;
    state.wireCost = 20;

    adjustWirePrice(state, fixedRng(0));
    expect(state.wirePriceCounter).toBe(4);
    expect(state.wireCost).toBe(16);

    adjustWirePrice(state, fixedRng(0));
    expect(state.wirePriceCounter).toBe(5);
    expect(state.wireCost).toBe(15);
  });

  test("uses the decayed base price for the same call's cost", () => {
    const state = createInitialState();
    state.wirePriceTimer = 250;
    state.wirePriceCounter = 3;
    state.wireBasePrice = 20;
    state.wireCost = 20;

    adjustWirePrice(state, fixedRng(0));

    expect(state.wirePriceTimer).toBe(0);
    expect(state.wireBasePrice).toBeCloseTo(19.98, 10);
    expect(state.wirePriceCounter).toBe(4);
    expect(state.wireCost).toBe(
      Math.ceil(state.wireBasePrice + 6 * Math.sin(state.wirePriceCounter)),
    );
  });
});

describe("01 §5.2 buying wire", () => {
  test("buys a spool when funds equal the cost", () => {
    const state = createInitialState();
    state.funds = 20;
    state.wireCost = 20;
    state.wirePriceTimer = 123;

    buyWire(state);

    expect(state.wire).toBe(2000);
    expect(state.funds).toBe(0);
    expect(state.wirePurchase).toBe(1);
    expect(state.wireBasePrice).toBeCloseTo(20.05, 10);
    expect(state.wirePriceTimer).toBe(0);
  });

  test("buys a spool with extra funds", () => {
    const state = createInitialState();
    state.funds = 25.5;
    state.wireCost = 20;

    buyWire(state);

    expect(state.wire).toBe(2000);
    expect(state.funds).toBeCloseTo(5.5, 10);
  });

  test("does nothing when funds are short", () => {
    const state = createInitialState();
    state.funds = 19.99;
    state.wireCost = 20;
    state.wirePriceTimer = 123;

    buyWire(state);

    expect(state.wire).toBe(1000);
    expect(state.funds).toBe(19.99);
    expect(state.wirePurchase).toBe(0);
    expect(state.wireBasePrice).toBe(20);
    expect(state.wirePriceTimer).toBe(123);
  });

  test("leaves the displayed cost unchanged after a purchase", () => {
    const state = createInitialState();
    state.funds = 100;
    state.wireCost = 20;

    buyWire(state);
    buyWire(state);

    expect(state.wire).toBe(3000);
    expect(state.funds).toBe(60);
    expect(state.wirePurchase).toBe(2);
    expect(state.wireBasePrice).toBeCloseTo(20.1, 10);
    expect(state.wireCost).toBe(20);
  });

  test("uses the state's wire supply", () => {
    const state = createInitialState();
    state.funds = 20;
    state.wireCost = 20;
    state.wireSupply = 500;

    buyWire(state);

    expect(state.wire).toBe(1500);
  });
});
