import { notImplemented } from "./internal/not-implemented";

/**
 * Game state boundary (ARCH-1).
 *
 * Fields in this interface come from the state inventory in spec 01 §2.
 * Fields owned by sections 03-07 that are not listed there are added with
 * those sections' batches, as required by the TDD scaffold phase.
 *
 * Unused, dead and presentation-only variables from the original are omitted
 * (01-D2, 05-D5, 08-P11). Initial values are set by the implementation, not
 * by this type.
 */
export interface GameState {
  // Clips, wire and manufacturing (01 §2.1)
  clips: number;
  unusedClips: number;
  clipRate: number;
  clipRateTemp: number;
  prevClips: number;
  clipRateTracker: number;
  clipmakerLevel: number;
  clipperCost: number;
  unsoldClips: number;
  funds: number;
  margin: number;
  wire: number;
  wireCost: number;
  adCost: number;
  demand: number;
  clipsSold: number;
  avgRev: number;
  income: number;
  incomeTracker: number[];
  ticks: number;
  marketing: number;
  marketingLvl: number;
  processors: number;
  memory: number;
  operations: number;
  trust: number;
  nextTrust: number;
  transaction: number;
  clipperBoost: number;
  blinkCounter: number;
  creativity: number;
  creativityOn: boolean;
  boostLvl: number;
  wirePurchase: number;
  wireSupply: number;
  marketingEffectiveness: number;
  milestoneFlag: number;
  bankroll: number;
  fib1: number;
  fib2: number;
  strategyEngineFlag: number;
  investmentEngineFlag: number;
  revPerSecFlag: number;
  compFlag: number;
  projectsFlag: number;
  autoClipperFlag: number;
  megaClipperFlag: number;
  megaClipperCost: number;
  megaClipperLevel: number;
  megaClipperBoost: number;
  creativitySpeed: number;
  creativityCounter: number;
  wireBuyerFlag: number;
  demandBoost: number;
  humanFlag: number;
  wireProductionFlag: number;
  spaceFlag: number;
  factoryFlag: number;
  harvesterFlag: number;
  wireDroneFlag: number;
  factoryLevel: number;
  factoryBoost: number;
  droneBoost: number;
  availableMatter: number;
  acquiredMatter: number;
  harvesterLevel: number;
  wireDroneLevel: number;
  factoryCost: number;
  harvesterCost: number;
  wireDroneCost: number;
  factoryRate: number;
  harvesterRate: number;
  wireDroneRate: number;
  harvesterBill: number;
  wireDroneBill: number;
  factoryBill: number;
  probeCount: number;
  totalMatter: number;
  foundMatter: number;
  qFlag: number;
  qClock: number;
  qChipCost: number;
  nextQchip: number;
  bribe: number;
  battleFlag: number;
  prestigeU: number;
  prestigeS: number;
  autoTourneyFlag: number;
  tothFlag: number;
  wirePriceCounter: number;
  wireBasePrice: number;
  farmLevel: number;
  batteryLevel: number;
  farmCost: number;
  batteryCost: number;
  storedPower: number;
  powMod: number;
  farmBill: number;
  batteryBill: number;
  momentum: number;
  swarmFlag: number;
  swarmStatus: number;
  swarmGifts: number;
  nextGift: number;
  giftPeriod: number;
  giftCountdown: number;
  honor: number;
  maxTrust: number;
  maxTrustCost: number;
  disorgCounter: number;
  disorgFlag: number;
  synchCost: number;
  disorgMsg: number;
  threnodyCost: number;
  entertainCost: number;
  boredomLevel: number;
  boredomFlag: number;
  boredomMsg: number;
  wireBuyerStatus: number;
  wirePriceTimer: number;
  qFade: number;
  autoTourneyStatus: number;
  driftKingMessageCost: number;
  sliderPos: number;
  tempOps: number;
  standardOps: number;
  opFade: number;
  opFadeTimer: number;
  opFadeDelay: number;
  dismantle: number;
  endTimer1: number;
  endTimer2: number;
  endTimer3: number;
  endTimer4: number;
  endTimer5: number;
  endTimer6: number;
  finalClips: number;
  resetFlag: number;

  // Economy module-level variables (01 §2.2)
  incomeThen: number;
  incomeNow: number;
  incomeLastSecond: number;
  trueAvgRev: number;
  avgSales: number;
  secTimer: number;
  saveTimer: number;
  maxFactoryLevel: number;
  maxDroneLevel: number;
  stockReportCounter: number;
}

/**
 * Fresh state for a new game (spec 01 §2.1–2.2, 01-D5).
 * Returns a new object with its own arrays; no state is shared between games.
 */
export function createInitialState(): GameState {
  return notImplemented("createInitialState");
}
