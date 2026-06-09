import { clamp } from "#lib/helpers.js";
import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { getNationArmy } from "#services/genNations.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { AIPressure, GoldBudget, ResourceBudget } from "./types";

export function getAIBudget(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation): ResourceBudget {
  const pressure = getAIPressure(ctx, analysis, nation);

  return { gold: calculateGoldBudget(nation.gold, pressure) };
}

// calculates total enemy army
function getEnemyStrengthPressure(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const ownArmy = analysis.selfData.totalArmy;
  const enemyArmy = nation.atWar.reduce((acc, n) => acc + (getNationArmy(ctx, n) ?? 0), 0);

  const ratio = enemyArmy / Math.max(1, ownArmy);

  return clamp((ratio - 1) / 2, 0, 1);
}

function getEconomyPressure(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const economyRatios = analysis.worldData.neighborEconomyRatio.map((e) => e.ratio);
  return getNeighborEconomyPressure(economyRatios);
}
function getNeighborEconomyPressure(neighborRatios: number[]) {
  if (neighborRatios.length === 0) return 0;

  const sorted = [...neighborRatios].sort((a, b) => b - a);

  let weightedTotal = 0;
  let weightTotal = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ratio = sorted[i];

    // strongest neighbor matters most
    const weight = 1 / (i + 1);

    // ratio 1.0 = equal economy
    // ratio 2.0 = neighbor has double economy
    // ratio 3.0+ = max pressure
    const pressure = clamp((ratio - 1) / 2, 0, 1);

    weightedTotal += pressure * weight;
    weightTotal += weight;
  }

  return weightedTotal / weightTotal;
}

function getExpansionOpportunity() {
  // compare neighbor army + economy to nation army & economy
  return 0;
}

function getAIPressure(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation): AIPressure {
  const enemyStrengthPressure = getEnemyStrengthPressure(ctx, analysis, nation);
  const economyPressure = getEconomyPressure(ctx, analysis, nation);
  const expansionOpportunity = getExpansionOpportunity();

  return { enemyStrengthPressure, economyPressure, expansionOpportunity };
}

// this function is only suitable for calculating gold
function calculateBudgetWeights(pressure: AIPressure) {
  const training =
    0.35 + pressure.enemyStrengthPressure * 1.2 + pressure.expansionOpportunity * 0.3;

  const building = 0.65 + pressure.economyPressure * 0.8 - pressure.enemyStrengthPressure * 0.6;

  // ENSURE AI SAVES ENOUGH MONEY FOR A BUILDING
  const reserve = 0.15;

  return {
    training: Math.max(0.05, training),
    building: Math.max(0.05, building),
    reserve: Math.max(0.05, reserve),
  };
}
function calculateGoldBudget(gold: number, pressure: AIPressure): GoldBudget {
  const weights = calculateBudgetWeights(pressure);

  const totalWeight = weights.training + weights.building + weights.reserve;

  return {
    total: gold,
    training: gold * (weights.training / totalWeight),
    building: gold * (weights.building / totalWeight),
    reserve: gold * (weights.reserve / totalWeight),
  };
}
