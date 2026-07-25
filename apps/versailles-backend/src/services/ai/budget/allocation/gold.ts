import { hasBuiltFoundation } from "#services/ai/analysis/economy.js";
import { AIPressure } from "#services/ai/analysis/types.js";
import { getNationBuildingCount } from "#services/buildings.js";
import { BASE_GOLD_WEIGHTS, GOLD_PRESSURE_MULTIPLIERS } from "../policy";
import { ActionWeight, AIBudgetCtx, BudgetAction } from "../types";

// return map of gold distrubution over budget actions
export function calcGoldBudget(budgetCtx: AIBudgetCtx, gold: number, pressure: AIPressure) {
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

function calcGoldWeights(budgetCtx: AIBudgetCtx, pressure: AIPressure): ActionWeight[] {
  const buildingCount = getNationBuildingCount(budgetCtx.ctx, budgetCtx.nationId);

  // move to budget ctx
  const barrackLevels =
    buildingCount["BARRACK"]?.reduce((acc, counts) => acc + counts.amount * counts.level, 0) ?? 0;

  const weights = BASE_GOLD_WEIGHTS;
  const mults = GOLD_PRESSURE_MULTIPLIERS;

  let train =
    weights["train"] +
    pressure.enemyStrengthPressure * mults["enemyStrengthToTraining"] +
    pressure.expansionOpportunity * mults["expansionToTraining"];

  let build =
    weights["build"] +
    pressure.economyPressure * mults["economyPressureToBuilding"] -
    pressure.enemyStrengthPressure * mults["enemyStrengthToBuilding"];

  let roadBuild = 0.2;
  let reserve = 0.15;

  // conditions
  train *= barrackLevels > 0 ? 1 : 0;
  reserve *= hasBuiltFoundation(budgetCtx.ctx, budgetCtx.nationId) ? 1 : 0.25;
  build *= hasBuiltFoundation(budgetCtx.ctx, budgetCtx.nationId) ? 1.5 : 1;

  return [
    { action: "train", weight: train },
    { action: "build", weight: build },
    { action: "roadBuild", weight: roadBuild },
    { action: "reserve", weight: reserve },
  ];
}
