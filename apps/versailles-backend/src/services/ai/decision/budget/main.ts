import { clamp } from "#lib/helpers.js";
import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { getNationArmy } from "#services/genNations.js";
import { GameCtx } from "#trpc/index.js";
import { Nation, typeNationResource } from "@repo/shared";
import { AIBudgetCtx, AIPressure, ResourceBudget } from "./types";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { getNationBuildingCount } from "#services/buildings.js";
import { FOUNDATION_MINIMUMS } from "../building/data";
import { getBuildingsShortage } from "../roads/main";
import { calculateGoldBudget } from "./gold/main";

export function getAIBudget(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation): ResourceBudget {
  const pressure = getAIPressure(ctx, analysis, nation);

  const budgetCtx = { ctx, nationId: nation.id };

  return { gold: calculateGoldBudget(budgetCtx, nation.gold, pressure).goldMap };
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

export function hasBuiltFoundation(ctx: GameCtx, nationId: string) {
  const buildingCount = getNationBuildingCount(ctx, nationId);

  return typedEntries(FOUNDATION_MINIMUMS).every(([category, requirement]) => {
    const counts = buildingCount[category] ?? [];

    const amount = counts.reduce((total, building) => total + building.amount * building.level, 0);

    return amount >= (requirement?.amount ?? 0);
  });
}
