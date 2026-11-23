import { describe, expect, test } from "bun:test";
import { createInitialState } from "../../src/core/state";
import {
  clipClick,
  makeClipper,
  makeMegaClipper,
  updateClipRate,
  updateUpgrades,
} from "../../src/core/systems/manufacturing";

describe("01 §4.1 clipClick", () => {
  test("produces one clip and spends one inch of wire", () => {
    const state = createInitialState();

    clipClick(state, 1);

    expect(state.clips).toBe(1);
    expect(state.unsoldClips).toBe(1);
    expect(state.unusedClips).toBe(1);
    expect(state.wire).toBe(999);
  });

  test("produces fractional amounts", () => {
    const state = createInitialState();

    clipClick(state, 0.01);

    expect(state.clips).toBeCloseTo(0.01, 10);
    expect(state.unsoldClips).toBeCloseTo(0.01, 10);
    expect(state.unusedClips).toBeCloseTo(0.01, 10);
    expect(state.wire).toBeCloseTo(999.99, 10);
  });

  test("caps production at the wire on hand", () => {
    const state = createInitialState();
    state.wire = 1.5;

    clipClick(state, 5);

    expect(state.clips).toBe(1.5);
    expect(state.unsoldClips).toBe(1.5);
    expect(state.unusedClips).toBe(1.5);
    expect(state.wire).toBe(0);
  });

  test("produces nothing while wire is below one inch, even fractionally", () => {
    const state = createInitialState();
    state.wire = 0.99;

    clipClick(state, 1);

    expect(state.clips).toBe(0);
    expect(state.unsoldClips).toBe(0);
    expect(state.unusedClips).toBe(0);
    expect(state.wire).toBe(0.99);
  });

  test("produces the final inch when wire is exactly one", () => {
    const state = createInitialState();
    state.wire = 1;

    clipClick(state, 1);

    expect(state.clips).toBe(1);
    expect(state.wire).toBe(0);
  });

  test("increments finalClips during the dismantle stage", () => {
    const state = createInitialState();
    state.dismantle = 4;
    state.wire = 0;

    clipClick(state, 1);

    expect(state.finalClips).toBe(1);
    expect(state.clips).toBe(0);
  });

  test("increments finalClips on every manual call while dismantling", () => {
    const state = createInitialState();
    state.dismantle = 5;

    clipClick(state, 1);
    clipClick(state, 1);

    expect(state.finalClips).toBe(2);
  });

  test("does not increment finalClips before the dismantle stage", () => {
    const state = createInitialState();
    state.dismantle = 3;

    clipClick(state, 1);

    expect(state.finalClips).toBe(0);
    expect(state.clips).toBe(1);
  });
});

describe("01 §4.2 AutoClippers", () => {
  test("buys the first AutoClipper at the initial $5 and recomputes the price", () => {
    const state = createInitialState();
    state.funds = 5;

    makeClipper(state);

    expect(state.clipmakerLevel).toBe(1);
    expect(state.funds).toBe(0);
    expect(state.clipperCost).toBeCloseTo(6.1, 10);
  });

  test("buys the second AutoClipper at $6.10", () => {
    const state = createInitialState();
    state.funds = 5;
    makeClipper(state);
    state.funds = 6.1;

    makeClipper(state);

    expect(state.clipmakerLevel).toBe(2);
    expect(state.funds).toBeCloseTo(0, 10);
    expect(state.clipperCost).toBeCloseTo(6.21, 10);
  });

  test("does not buy while funds are short", () => {
    const state = createInitialState();
    state.funds = 4.99;

    makeClipper(state);

    expect(state.clipmakerLevel).toBe(0);
    expect(state.funds).toBe(4.99);
  });

  test("recomputes the price even when the purchase fails", () => {
    const state = createInitialState();
    state.clipmakerLevel = 1;
    state.clipperCost = 999;
    state.funds = 0;

    makeClipper(state);

    expect(state.clipmakerLevel).toBe(1);
    expect(state.funds).toBe(0);
    expect(state.clipperCost).toBeCloseTo(6.1, 10);
  });

  test("01-D1: two clicks in one tick never overdraw funds", () => {
    const state = createInitialState();
    state.funds = 10;

    makeClipper(state);
    makeClipper(state);

    expect(state.clipmakerLevel).toBe(1);
    expect(state.funds).toBe(5);
    expect(state.clipperCost).toBeCloseTo(6.1, 10);
  });
});

describe("01 §4.3 MegaClippers", () => {
  test("buys the first MegaClipper at $500 and recomputes the price", () => {
    const state = createInitialState();
    state.funds = 500;

    makeMegaClipper(state);

    expect(state.megaClipperLevel).toBe(1);
    expect(state.funds).toBe(0);
    expect(state.megaClipperCost).toBeCloseTo(1070, 10);
  });

  test("buys the second MegaClipper at $1,070 and recomputes the price", () => {
    const state = createInitialState();
    state.funds = 500;
    makeMegaClipper(state);
    state.funds = 1070;

    makeMegaClipper(state);

    expect(state.megaClipperLevel).toBe(2);
    expect(state.funds).toBeCloseTo(0, 10);
    expect(state.megaClipperCost).toBeCloseTo(1144.9, 10);
  });

  test("does not buy while funds are short", () => {
    const state = createInitialState();
    state.funds = 499.99;

    makeMegaClipper(state);

    expect(state.megaClipperLevel).toBe(0);
    expect(state.funds).toBe(499.99);
  });

  test("recomputes the price even when the purchase fails", () => {
    const state = createInitialState();
    state.megaClipperLevel = 1;
    state.megaClipperCost = 999;
    state.funds = 0;

    makeMegaClipper(state);

    expect(state.megaClipperLevel).toBe(1);
    expect(state.funds).toBe(0);
    expect(state.megaClipperCost).toBeCloseTo(1070, 10);
  });
});

describe("01 §4.4 clip-rate tracker", () => {
  test("accumulates every tick before the reset", () => {
    const state = createInitialState();

    for (let tick = 1; tick <= 99; tick += 1) {
      state.clips = tick;
      updateClipRate(state);
    }

    expect(state.clipRateTracker).toBe(99);
    expect(state.clipRateTemp).toBe(99);
    expect(state.prevClips).toBe(99);
    expect(state.clipRate).toBe(0);
  });

  test("publishes the accumulated count on the 100th tick without sampling it", () => {
    const state = createInitialState();

    for (let tick = 1; tick <= 100; tick += 1) {
      state.clips = tick;
      updateClipRate(state);
    }

    expect(state.clipRate).toBe(99);
    expect(state.clipRateTracker).toBe(0);
    expect(state.clipRateTemp).toBe(0);
    expect(state.prevClips).toBe(99);
  });

  test("includes the reset tick's production in the next sample", () => {
    const state = createInitialState();

    for (let tick = 1; tick <= 101; tick += 1) {
      state.clips = tick;
      updateClipRate(state);
    }

    expect(state.clipRate).toBe(99);
    expect(state.clipRateTracker).toBe(1);
    expect(state.clipRateTemp).toBe(2);
    expect(state.prevClips).toBe(101);
  });

  test("publishes exactly 100 clips for 100 ticks of one clip each", () => {
    const state = createInitialState();

    for (let tick = 1; tick <= 200; tick += 1) {
      state.clips = tick;
      updateClipRate(state);
    }

    expect(state.clipRate).toBe(100);
  });

  test("counts manual clipClick production", () => {
    const state = createInitialState();
    state.wire = 1000;

    for (let tick = 1; tick <= 100; tick += 1) {
      clipClick(state, 1);
      updateClipRate(state);
    }

    expect(state.clipRate).toBe(99);
  });

  test("holds the published rate between resets", () => {
    const state = createInitialState();

    for (let tick = 1; tick <= 100; tick += 1) {
      state.clips = tick;
      updateClipRate(state);
    }
    const published = state.clipRate;

    for (let tick = 101; tick <= 150; tick += 1) {
      state.clips = tick;
      updateClipRate(state);
    }

    expect(state.clipRate).toBe(published);
  });
});

describe("01 §4.5 factory and drone upgrade thresholds", () => {
  test("factories below 10 need 10", () => {
    const state = createInitialState();
    state.maxFactoryLevel = 0;
    expect(updateUpgrades(state).factories).toBe(10);

    state.maxFactoryLevel = 9;
    expect(updateUpgrades(state).factories).toBe(10);
  });

  test("factories below 20 need 20", () => {
    const state = createInitialState();
    state.maxFactoryLevel = 10;
    expect(updateUpgrades(state).factories).toBe(20);

    state.maxFactoryLevel = 19;
    expect(updateUpgrades(state).factories).toBe(20);
  });

  test("factories below 50 need 50", () => {
    const state = createInitialState();
    state.maxFactoryLevel = 20;
    expect(updateUpgrades(state).factories).toBe(50);

    state.maxFactoryLevel = 49;
    expect(updateUpgrades(state).factories).toBe(50);
  });

  test("factories at 50 have no next upgrade", () => {
    const state = createInitialState();
    state.maxFactoryLevel = 50;

    expect(updateUpgrades(state).factories).toBe(0);
  });

  test("drones below 500 need 500", () => {
    const state = createInitialState();
    state.maxDroneLevel = 0;
    expect(updateUpgrades(state).drones).toBe(500);

    state.maxDroneLevel = 499;
    expect(updateUpgrades(state).drones).toBe(500);
  });

  test("drones below 5000 need 5000", () => {
    const state = createInitialState();
    state.maxDroneLevel = 500;
    expect(updateUpgrades(state).drones).toBe(5000);

    state.maxDroneLevel = 4999;
    expect(updateUpgrades(state).drones).toBe(5000);
  });

  test("drones below 50000 need 50000", () => {
    const state = createInitialState();
    state.maxDroneLevel = 5000;
    expect(updateUpgrades(state).drones).toBe(50000);

    state.maxDroneLevel = 49999;
    expect(updateUpgrades(state).drones).toBe(50000);
  });

  test("drones at 50000 have no next upgrade", () => {
    const state = createInitialState();
    state.maxDroneLevel = 50000;

    expect(updateUpgrades(state).drones).toBe(0);
  });
});
