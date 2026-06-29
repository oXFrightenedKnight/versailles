import { getNationBuildingCount } from "#services/buildings.js";
import { hasBuiltFoundation } from "../main";
import { AIBudgetCtx, AIPressure, BudgetAction } from "../types";

// return map of gold distrubution over budget actions
export function calculateGoldBudget(budgetCtx: AIBudgetCtx, gold: number, pressure: AIPressure) {
  const weights = calcGoldWeights(budgetCtx, pressure);

  const totalWeight = Object.values(weights).reduce((acc, n) => acc + n.weight, 0);

  const goldMap = new Map<BudgetAction, number>(
    weights.map((w) => [w.action, getNormalizedAmount(w.weight, totalWeight, gold)])
  );

  return { total: gold, goldMap };
}
function getNormalizedAmount(weight: number, totalWeight: number, resource: number) {
  return resource * (weight / totalWeight);
}

// this function is only suitable for calculating gold
type ActionWeight = { action: BudgetAction; weight: number };
function calcGoldWeights(budgetCtx: AIBudgetCtx, pressure: AIPressure): ActionWeight[] {
  const buildingCount = getNationBuildingCount(budgetCtx.ctx, budgetCtx.nationId);

  const barrackLevels =
    buildingCount["BARRACK"]?.reduce((acc, counts) => acc + counts.amount * counts.level, 0) ?? 0;

  let train = 0.35 + pressure.enemyStrengthPressure * 1.2 + pressure.expansionOpportunity * 0.3;

  let build = 0.65 + pressure.economyPressure * 0.8 - pressure.enemyStrengthPressure * 0.6;

  let roadBuild = 0.2;
  let reserve = 0.15;

  // conditions
  train *= barrackLevels > 0 ? 1 : 0;
  reserve *= hasBuiltFoundation(budgetCtx.ctx, budgetCtx.nationId) ? 1 : 0;

  return [
    { action: "train", weight: train },
    { action: "build", weight: build },
    { action: "roadBuild", weight: roadBuild },
    { action: "reserve", weight: reserve },
  ];
}
