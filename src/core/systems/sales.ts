import type { GameState } from "../state";

/**
 * Demand curve (01 §6.1), main tick step 19.
 */
export function updateDemand(state: GameState): void {
  state.marketing = 1.1 ** (state.marketingLvl - 1);

  let demand =
    (0.8 / state.margin) * state.marketing * state.marketingEffectiveness * state.demandBoost;

  demand = demand + (demand / 10) * state.prestigeU;

  state.demand = demand;
}

/**
 * Sell a batch of clips (01 §6.2). Funds are truncated to whole cents after
 * every sale.
 */
export function sellClips(state: GameState, number: number): void {
  if (state.unsoldClips > 0) {
    if (number > state.unsoldClips) {
      state.transaction = Math.floor(state.unsoldClips * state.margin * 1000) / 1000;
      state.funds = Math.floor((state.funds + state.transaction) * 100) / 100;
      state.income += state.transaction;
      state.clipsSold += state.unsoldClips;
      state.unsoldClips = 0;
    } else {
      state.transaction = Math.floor(number * state.margin * 1000) / 1000;
      state.funds = Math.floor((state.funds + state.transaction) * 100) / 100;
      state.income += state.transaction;
      state.clipsSold += number;
      state.unsoldClips -= number;
    }
  }
}

/**
 * Revenue tracker (01 §6.3), once per second in the slow loop.
 */
export function calculateRev(state: GameState): void {
  state.incomeThen = state.incomeNow;
  state.incomeNow = state.income;
  state.incomeLastSecond = Math.round((state.incomeNow - state.incomeThen) * 100) / 100;

  state.incomeTracker.push(state.incomeLastSecond);
  if (state.incomeTracker.length > 10) {
    state.incomeTracker.shift();
  }

  let sum = 0;
  for (const value of state.incomeTracker) {
    sum = Math.round((sum + value) * 100) / 100;
  }
  state.trueAvgRev = sum / state.incomeTracker.length;

  let chanceOfPurchase = state.demand / 100;
  if (chanceOfPurchase > 1) {
    chanceOfPurchase = 1;
  }
  if (state.unsoldClips < 1) {
    chanceOfPurchase = 0;
  }

  const saleRate = 0.7 * state.demand ** 1.15;
  state.avgSales = chanceOfPurchase * saleRate * 10;
  state.avgRev = chanceOfPurchase * saleRate * state.margin * 10;

  if (state.demand > state.unsoldClips) {
    state.avgRev = state.trueAvgRev;
    state.avgSales = state.avgRev / state.margin;
  }
}

/**
 * Raise the price by one cent (01 §6.4). No upper limit.
 */
export function raisePrice(state: GameState): void {
  state.margin = Math.round((state.margin + 0.01) * 100) / 100;
}

/**
 * Lower the price by one cent (01 §6.4, 01-D3). The price never goes below
 * one cent; the guard is compared in whole cents.
 */
export function lowerPrice(state: GameState): void {
  if (Math.round(state.margin * 100) > 1) {
    state.margin = Math.round((state.margin - 0.01) * 100) / 100;
  }
}

/**
 * Buy one marketing level (01 §6.5).
 */
export function buyAds(state: GameState): void {
  if (state.funds >= state.adCost) {
    state.marketingLvl += 1;
    state.funds -= state.adCost;
    state.adCost = Math.floor(state.adCost * 2);
  }
}
