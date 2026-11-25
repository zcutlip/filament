import { describe, expect, test } from "bun:test";
import { createInitialState } from "../../src/core/state";
import {
  buyAds,
  calculateRev,
  lowerPrice,
  raisePrice,
  sellClips,
  updateDemand,
} from "../../src/core/systems/sales";

describe("01 §6.1 demand curve", () => {
  test("computes the initial 3.2 demand at margin 0.25", () => {
    const state = createInitialState();

    updateDemand(state);

    expect(state.demand).toBeCloseTo(3.2, 10);
  });

  test("uses the marketing level to scale demand", () => {
    const state = createInitialState();
    state.marketingLvl = 3;

    updateDemand(state);

    expect(state.demand).toBeCloseTo(3.872, 10);
  });

  test("uses margin, effectiveness and demand boost", () => {
    const state = createInitialState();
    state.margin = 0.5;
    state.marketingEffectiveness = 2;
    state.demandBoost = 3;

    updateDemand(state);

    expect(state.demand).toBeCloseTo(9.6, 10);
  });

  test("adds the prestige bonus after the base demand", () => {
    const state = createInitialState();
    state.prestigeU = 0.5;

    updateDemand(state);

    expect(state.demand).toBeCloseTo(3.36, 10);
  });

  test("applies the prestige bonus to the scaled base demand", () => {
    const state = createInitialState();
    state.marketingEffectiveness = 2;
    state.demandBoost = 3;
    state.prestigeU = 0.5;

    updateDemand(state);

    expect(state.demand).toBeCloseTo(20.16, 10);
  });
});

describe("01 §6.2 selling clips", () => {
  test("sells part of the inventory and records the transaction", () => {
    const state = createInitialState();
    state.unsoldClips = 100;
    state.margin = 0.25;

    sellClips(state, 10);

    expect(state.transaction).toBeCloseTo(2.5, 10);
    expect(state.funds).toBeCloseTo(2.5, 10);
    expect(state.income).toBeCloseTo(2.5, 10);
    expect(state.clipsSold).toBe(10);
    expect(state.unsoldClips).toBe(90);
  });

  test("sells the whole inventory when the batch is larger", () => {
    const state = createInitialState();
    state.unsoldClips = 5;
    state.margin = 0.25;
    state.funds = 1.234;

    sellClips(state, 10);

    expect(state.transaction).toBeCloseTo(1.25, 10);
    expect(state.funds).toBeCloseTo(2.48, 10);
    expect(state.income).toBeCloseTo(1.25, 10);
    expect(state.clipsSold).toBe(5);
    expect(state.unsoldClips).toBe(0);
  });

  test("sells exactly the inventory when the batch matches", () => {
    const state = createInitialState();
    state.unsoldClips = 10;
    state.margin = 0.25;

    sellClips(state, 10);

    expect(state.clipsSold).toBe(10);
    expect(state.unsoldClips).toBe(0);
  });

  test("truncates funds to whole cents after a sale", () => {
    const state = createInitialState();
    state.unsoldClips = 10;
    state.margin = 0.25;
    state.funds = 1.239;

    sellClips(state, 10);

    expect(state.funds).toBeCloseTo(3.73, 10);
  });

  test("truncates funds even when the batch size is zero", () => {
    const state = createInitialState();
    state.unsoldClips = 10;
    state.margin = 0.25;
    state.funds = 1.239;

    sellClips(state, 0);

    expect(state.transaction).toBe(0);
    expect(state.funds).toBeCloseTo(1.23, 10);
    expect(state.income).toBe(0);
    expect(state.clipsSold).toBe(0);
    expect(state.unsoldClips).toBe(10);
  });

  test("does nothing while unsold clips are zero", () => {
    const state = createInitialState();
    state.funds = 1.239;

    sellClips(state, 10);

    expect(state.funds).toBe(1.239);
    expect(state.income).toBe(0);
    expect(state.clipsSold).toBe(0);
  });

  test("handles fractional unsold inventory", () => {
    const state = createInitialState();
    state.unsoldClips = 2.5;
    state.margin = 0.25;

    sellClips(state, 1);

    expect(state.clipsSold).toBe(1);
    expect(state.unsoldClips).toBeCloseTo(1.5, 10);
    expect(state.income).toBeCloseTo(0.25, 10);
  });

  test("adds the transaction to existing income", () => {
    const state = createInitialState();
    state.unsoldClips = 100;
    state.margin = 0.25;
    state.income = 5;

    sellClips(state, 10);

    expect(state.income).toBeCloseTo(7.5, 10);
  });
});

describe("01 §6.3 revenue tracker", () => {
  test("records the first second and uses the tracker average", () => {
    const state = createInitialState();
    state.income = 2.5;
    state.demand = 3.2;
    state.unsoldClips = 0;
    state.margin = 0.25;

    calculateRev(state);

    expect(state.incomeThen).toBe(0);
    expect(state.incomeNow).toBe(2.5);
    expect(state.incomeLastSecond).toBeCloseTo(2.5, 10);
    expect(state.incomeTracker).toEqual([0, 2.5]);
    expect(state.trueAvgRev).toBeCloseTo(1.25, 10);
    expect(state.avgRev).toBeCloseTo(1.25, 10);
    expect(state.avgSales).toBeCloseTo(5, 10);
  });

  test("moves the previous income into incomeThen", () => {
    const state = createInitialState();
    state.incomeNow = 2.5;
    state.income = 5;
    state.unsoldClips = 10;

    calculateRev(state);

    expect(state.incomeThen).toBe(2.5);
    expect(state.incomeNow).toBe(5);
    expect(state.incomeLastSecond).toBeCloseTo(2.5, 10);
  });

  test("keeps only the ten newest samples", () => {
    const state = createInitialState();
    state.incomeTracker = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    state.incomeNow = 10;
    state.income = 11;
    state.demand = 0;
    state.unsoldClips = 10;

    calculateRev(state);

    expect(state.incomeTracker).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 1]);
    expect(state.trueAvgRev).toBeCloseTo(5.5, 10);
  });

  test("rounds each running sum to whole cents", () => {
    const state = createInitialState();
    state.incomeTracker = [0.125, 0.125];
    state.demand = 0;
    state.unsoldClips = 10;

    calculateRev(state);

    expect(state.incomeTracker).toEqual([0.125, 0.125, 0]);
    expect(state.trueAvgRev).toBeCloseTo(0.26 / 3, 10);
  });

  test("rounds the last second's revenue to whole cents", () => {
    const state = createInitialState();
    state.income = 0.125;

    calculateRev(state);

    expect(state.incomeLastSecond).toBeCloseTo(0.13, 10);
  });

  test("clamps the purchase chance at one", () => {
    const state = createInitialState();
    state.demand = 150;
    state.unsoldClips = 1e9;
    state.margin = 0.25;

    calculateRev(state);

    expect(state.avgSales).toBeCloseTo(0.7 * 150 ** 1.15 * 10, 6);
    expect(state.avgRev).toBeCloseTo(0.7 * 150 ** 1.15 * 0.25 * 10, 6);
  });

  test("uses the demand rate while inventory is not limiting", () => {
    const state = createInitialState();
    state.demand = 3.2;
    state.unsoldClips = 3.2;
    state.margin = 0.25;

    calculateRev(state);

    expect(state.avgSales).toBeCloseTo(0.032 * 0.7 * 3.2 ** 1.15 * 10, 10);
    expect(state.avgRev).toBeCloseTo(0.032 * 0.7 * 3.2 ** 1.15 * 0.25 * 10, 10);
  });

  test("overrides the averages when demand exceeds unsold clips", () => {
    const state = createInitialState();
    state.demand = 3.2;
    state.unsoldClips = 1;
    state.margin = 0.25;
    state.incomeTracker = [2];

    calculateRev(state);

    expect(state.trueAvgRev).toBeCloseTo(1, 10);
    expect(state.avgRev).toBeCloseTo(1, 10);
    expect(state.avgSales).toBeCloseTo(4, 10);
  });

  test("zeroes the purchase chance at zero demand", () => {
    const state = createInitialState();
    state.demand = 0;
    state.unsoldClips = 0.5;
    state.margin = 0.25;

    calculateRev(state);

    expect(state.avgRev).toBe(0);
    expect(state.avgSales).toBe(0);
  });
});

describe("01 §6.4 price controls", () => {
  test("raises the margin by one cent", () => {
    const state = createInitialState();
    state.margin = 0.25;

    raisePrice(state);

    expect(state.margin).toBeCloseTo(0.26, 10);
  });

  test("raises a low margin without floating-point drift", () => {
    const state = createInitialState();
    state.margin = 0.07;

    raisePrice(state);

    expect(state.margin).toBeCloseTo(0.08, 10);
  });

  test("raises without an upper limit", () => {
    const state = createInitialState();
    state.margin = 1000;

    raisePrice(state);

    expect(state.margin).toBeCloseTo(1000.01, 10);
  });

  test("lowers the margin by one cent", () => {
    const state = createInitialState();
    state.margin = 0.25;

    lowerPrice(state);

    expect(state.margin).toBeCloseTo(0.24, 10);
  });

  test("lowers to the one-cent minimum", () => {
    const state = createInitialState();
    state.margin = 0.02;

    lowerPrice(state);

    expect(state.margin).toBeCloseTo(0.01, 10);
  });

  test("01-D3: does not lower below one cent", () => {
    const state = createInitialState();
    state.margin = 0.01;

    lowerPrice(state);

    expect(state.margin).toBeCloseTo(0.01, 10);
  });

  test("01-D4: price controls leave demand untouched", () => {
    const state = createInitialState();
    state.demand = 3.2;
    state.margin = 0.25;

    raisePrice(state);
    lowerPrice(state);

    expect(state.demand).toBe(3.2);
    expect(state.margin).toBeCloseTo(0.25, 10);
  });
});

describe("01 §6.5 marketing", () => {
  test("buys marketing when funds equal the cost", () => {
    const state = createInitialState();
    state.funds = 100;
    state.adCost = 100;

    buyAds(state);

    expect(state.marketingLvl).toBe(2);
    expect(state.funds).toBe(0);
    expect(state.adCost).toBe(200);
  });

  test("buys marketing with extra funds", () => {
    const state = createInitialState();
    state.funds = 250;
    state.adCost = 100;

    buyAds(state);

    expect(state.marketingLvl).toBe(2);
    expect(state.funds).toBeCloseTo(150, 10);
    expect(state.adCost).toBe(200);
  });

  test("does nothing when funds are short", () => {
    const state = createInitialState();
    state.funds = 99.99;
    state.adCost = 100;

    buyAds(state);

    expect(state.marketingLvl).toBe(1);
    expect(state.funds).toBe(99.99);
    expect(state.adCost).toBe(100);
  });

  test("floors the doubled ad cost", () => {
    const state = createInitialState();
    state.funds = 101;
    state.adCost = 101;

    buyAds(state);

    expect(state.marketingLvl).toBe(2);
    expect(state.funds).toBe(0);
    expect(state.adCost).toBe(202);
  });

  test("doubles from a fractional ad cost with floor", () => {
    const state = createInitialState();
    state.funds = 100.9;
    state.adCost = 100.9;

    buyAds(state);

    expect(state.marketingLvl).toBe(2);
    expect(state.funds).toBe(0);
    expect(state.adCost).toBe(201);
  });

  test("doubles the cost on each purchase", () => {
    const state = createInitialState();
    state.funds = 300;
    state.adCost = 100;

    buyAds(state);
    expect(state.marketingLvl).toBe(2);
    expect(state.funds).toBeCloseTo(200, 10);
    expect(state.adCost).toBe(200);

    buyAds(state);
    expect(state.marketingLvl).toBe(3);
    expect(state.funds).toBe(0);
    expect(state.adCost).toBe(400);
  });
});
