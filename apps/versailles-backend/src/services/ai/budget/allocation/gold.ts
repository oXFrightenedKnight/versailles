import { AIPressure } from "#services/ai/analysis/types.js";
import { BASE_GOLD_WEIGHTS, GOLD_PRESSURE_MULTIPLIERS } from "../policy";
import { ActionWeight, AIBudgetCtx, BudgetAllocationRequest } from "../types";
import { allocateResource } from "./shared";

// return map of gold distrubution over budget actions
export function calcGoldBudget(
  budgetCtx: AIBudgetCtx,
  gold: number,
  pressure: AIPressure,
  requests: BudgetAllocationRequest[] = []
) {
  const weights = calcGoldWeights(budgetCtx, pressure);

  const goldMap = allocateResource(gold, weights, requests);

  return { total: gold, goldMap };
}

// this function is only suitable for calculating gold
function calcGoldWeights(budgetCtx: AIBudgetCtx, pressure: AIPressure): ActionWeight[] {
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
  train *= budgetCtx.barrackLevels > 0 ? 1 : 0;
  reserve *= budgetCtx.foundationComplete ? 1 : 0.25;
  build *= budgetCtx.foundationComplete ? 1.5 : 1;

  return [
    { action: "train", weight: train },
    { action: "build", weight: build },
    { action: "roadBuild", weight: roadBuild },
    { action: "reserve", weight: reserve },
  ];
}
