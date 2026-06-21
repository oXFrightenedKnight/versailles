import { clamp } from "#lib/helpers.js";
import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { getNationArmy } from "#services/genNations.js";
import { GameCtx } from "#trpc/index.js";
import { Nation, typeNationResource } from "@repo/shared";
import { AIBudgetCtx, AIPressure, BudgetMap, GoldBudget, ResourceBudget } from "./types";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { getNationBuildingCount } from "#services/buildings.js";
import { FOUNDATION_MINIMUMS } from "../building/data";

export function getAIBudget(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation): ResourceBudget {
  const pressure = getAIPressure(ctx, analysis, nation);

  const budgetCtx = { ctx, nationId: nation.id };

  return { gold: calculateGoldBudget(budgetCtx, nation.gold, pressure) };
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
function calculateBudgetWeights(budgetCtx: AIBudgetCtx, pressure: AIPressure) {
  const barrackLevels =
    getNationBuildingCount(budgetCtx.ctx, budgetCtx.nationId)["BARRACK"]?.reduce(
      (acc, counts) => acc + counts.amount * counts.level,
      0
    ) ?? 0;

  let training = 0.35 + pressure.enemyStrengthPressure * 1.2 + pressure.expansionOpportunity * 0.3;

  let building = 0.65 + pressure.economyPressure * 0.8 - pressure.enemyStrengthPressure * 0.6;

  let reserve = 0.15;

  // --- CONDITIONS ---
  training *= barrackLevels > 0 ? 1 : 0;
  reserve *= hasBuiltFoundation(budgetCtx.ctx, budgetCtx.nationId) ? 1 : 0;

  return {
    training,
    building,
    reserve,
  };
}
function calculateGoldBudget(
  budgetCtx: AIBudgetCtx,
  gold: number,
  pressure: AIPressure
): GoldBudget {
  const weights = calculateBudgetWeights(budgetCtx, pressure);

  const totalWeight = weights.training + weights.building + weights.reserve;

  return {
    total: gold,
    training: gold * (weights.training / totalWeight),
    building: gold * (weights.building / totalWeight),
    reserve: gold * (weights.reserve / totalWeight),
  };
}

export function subtractBudget(
  buildingBudget: Map<typeNationResource, number>,
  cost: Partial<Record<"gold" | "manpower", number>>
) {
  const setResources: { resource: typeNationResource; total: number }[] = [];
  for (const [resource, amount] of typedEntries(cost)) {
    if (amount === undefined) return { ok: false };

    const resBudget = buildingBudget.get(resource);
    if (resBudget === undefined) return { ok: false };

    const total = resBudget - amount;
    if (total < 0) return { ok: false };

    setResources.push({ resource, total });
  }

  for (const { resource, total } of setResources) {
    buildingBudget.set(resource, total);
  }

  return { ok: true };
}

function hasBuiltFoundation(ctx: GameCtx, nationId: string) {
  const buildingCount = getNationBuildingCount(ctx, nationId);

  return typedEntries(FOUNDATION_MINIMUMS).every(([category, requirement]) => {
    const counts = buildingCount[category] ?? [];

    const amount = counts.reduce((total, building) => total + building.amount * building.level, 0);

    return amount >= (requirement?.amount ?? 0);
  });
}
