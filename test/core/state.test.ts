import { describe, expect, test } from "bun:test";
import type { GameState } from "../../src/core/state";
import { createInitialState } from "../../src/core/state";

// Spec 01 §2.1: values marked "unused", omitted fields (01-D2, 05-D5, 08-P2)
// and the 04-owned power constants are not part of the state object.

const manufacturing = {
  clips: 0,
  unusedClips: 0,
  clipRate: 0,
  clipRateTemp: 0,
  prevClips: 0,
  clipRateTracker: 0,
  clipmakerLevel: 0,
  clipperCost: 5,
  unsoldClips: 0,
  funds: 0,
  margin: 0.25,
  wire: 1000,
  wireCost: 20,
  transaction: 1,
  wirePurchase: 0,
  wireSupply: 1000,
  wirePriceCounter: 0,
  wireBasePrice: 20,
  wireBuyerStatus: 1,
  wirePriceTimer: 0,
  wireBuyerFlag: 0,
} satisfies Partial<GameState>;

const salesAndMarketing = {
  adCost: 100,
  demand: 5,
  clipsSold: 0,
  avgRev: 0,
  income: 0,
  incomeTracker: [0],
  marketing: 1,
  marketingLvl: 1,
  marketingEffectiveness: 1,
  demandBoost: 1,
} satisfies Partial<GameState>;

const progression = {
  ticks: 0,
  processors: 1,
  memory: 1,
  operations: 0,
  standardOps: 0,
  tempOps: 0,
  trust: 2,
  nextTrust: 3000,
  creativity: 0,
  creativityOn: false,
  creativitySpeed: 1,
  creativityCounter: 0,
  opFade: 0,
  opFadeTimer: 0,
  opFadeDelay: 800,
  compFlag: 0,
  projectsFlag: 0,
  milestoneFlag: 0,
  fib1: 2,
  fib2: 3,
} satisfies Partial<GameState>;

const upgrades = {
  clipperBoost: 1,
  boostLvl: 0,
  autoClipperFlag: 0,
  megaClipperFlag: 0,
  megaClipperCost: 500,
  megaClipperLevel: 0,
  megaClipperBoost: 1,
  revPerSecFlag: 0,
  strategyEngineFlag: 0,
  investmentEngineFlag: 0,
  bankroll: 0,
  autoTourneyFlag: 0,
  autoTourneyStatus: 1,
  tothFlag: 0,
  humanFlag: 1,
  blinkCounter: 0,
  qFade: 1,
} satisfies Partial<GameState>;

const industry = {
  wireProductionFlag: 0,
  spaceFlag: 0,
  factoryFlag: 0,
  harvesterFlag: 0,
  wireDroneFlag: 0,
  factoryLevel: 0,
  factoryBoost: 1,
  droneBoost: 1,
  availableMatter: 6e27,
  acquiredMatter: 0,
  harvesterLevel: 0,
  wireDroneLevel: 0,
  factoryCost: 1e8,
  harvesterCost: 1e6,
  wireDroneCost: 1e6,
  factoryRate: 1e9,
  harvesterRate: 26180337,
  wireDroneRate: 16180339,
  harvesterBill: 0,
  wireDroneBill: 0,
  factoryBill: 0,
  probeCount: 0,
  totalMatter: 3e55,
  foundMatter: 6e27,
} satisfies Partial<GameState>;

const powerAndSwarm = {
  farmLevel: 0,
  batteryLevel: 0,
  farmCost: 1e7,
  batteryCost: 1e6,
  storedPower: 0,
  powMod: 0,
  farmBill: 0,
  batteryBill: 0,
  momentum: 0,
  swarmFlag: 0,
  swarmStatus: 7,
  swarmGifts: 0,
  nextGift: 0,
  giftPeriod: 125000,
  giftCountdown: 125000,
  sliderPos: 0,
} satisfies Partial<GameState>;

const lateGame = {
  qFlag: 0,
  qClock: 0,
  qChipCost: 10000,
  nextQchip: 0,
  bribe: 1000000,
  battleFlag: 0,
  honor: 0,
  maxTrust: 20,
  maxTrustCost: 91117.99,
  prestigeU: 0,
  prestigeS: 0,
  stockReportCounter: 0,
  threnodyCost: 50000,
  entertainCost: 10000,
  boredomLevel: 0,
  boredomFlag: 0,
  boredomMsg: 0,
  disorgCounter: 0,
  disorgFlag: 0,
  synchCost: 5000,
  disorgMsg: 0,
  driftKingMessageCost: 1,
  dismantle: 0,
  endTimer1: 0,
  endTimer2: 0,
  endTimer3: 0,
  endTimer4: 0,
  endTimer5: 0,
  endTimer6: 0,
  finalClips: 0,
  resetFlag: 2,
} satisfies Partial<GameState>;

const economyModule = {
  secTimer: 0,
  saveTimer: 0,
  maxFactoryLevel: 0,
  maxDroneLevel: 0,
} satisfies Partial<GameState>;

describe("01 §2.1 initial globals", () => {
  test("clips, wire and manufacturing", () => {
    expect(createInitialState()).toMatchObject(manufacturing);
  });

  test("sales and marketing", () => {
    expect(createInitialState()).toMatchObject(salesAndMarketing);
  });

  test("operations, trust and progression", () => {
    expect(createInitialState()).toMatchObject(progression);
  });

  test("upgrades and panel flags", () => {
    expect(createInitialState()).toMatchObject(upgrades);
  });

  test("industry and space", () => {
    expect(createInitialState()).toMatchObject(industry);
  });

  test("power and swarm", () => {
    expect(createInitialState()).toMatchObject(powerAndSwarm);
  });

  test("quantum, combat and ending", () => {
    expect(createInitialState()).toMatchObject(lateGame);
  });
});

describe("01 §2.2 economy module variables", () => {
  test("starts the slow-loop counters and factory/drone high-water marks at 0", () => {
    expect(createInitialState()).toMatchObject(economyModule);
  });
});

describe("01-D5 revenue tracker", () => {
  test("incomeNow starts equal to income", () => {
    const state = createInitialState();
    expect(state.incomeNow).toBe(state.income);
    expect(state.incomeNow).toBe(0);
  });
});

describe("01 §2.2 fresh state", () => {
  test("returns a new object each call", () => {
    expect(createInitialState()).not.toBe(createInitialState());
  });

  test("does not share the incomeTracker array between games", () => {
    const first = createInitialState();
    const second = createInitialState();
    first.incomeTracker.push(12);
    expect(second.incomeTracker).toEqual([0]);
  });
});
