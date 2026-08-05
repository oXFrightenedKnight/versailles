import { GameCtx } from "#trpc/index.js";
import { calculateRoadCost, getNationResource, Nation } from "@repo/shared";
import { WorldAnalysis } from "../analysis/types";
import { BudgetAllocationRequest, ResourceBudget } from "./types";
import { calcGoldBudget } from "./allocation/gold";
import { analyzeAIPressure } from "../analysis/pressure";
import { calcNeededRoadSegments } from "../analysis/roads";
import { GOLD_ALLOCATION_PRIORITY } from "./policy";
import { AIPlanningState } from "../planning/types";
import { getNextOpeningBuilding } from "../planning/queries/buildings";
import { getNationBuildingCount } from "#services/buildings/queries.js";

export function createAIBudget(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
): ResourceBudget {
  const pressure = analyzeAIPressure(ctx, analysis, nation);

  const foundationComplete = getNextOpeningBuilding(ctx, planning, nation.id) === undefined;

  const buildingCount = getNationBuildingCount(ctx, nation.id);

  const barrackLevels =
    buildingCount["BARRACK"]?.reduce((acc, counts) => acc + counts.amount * counts.level, 0) ?? 0;

  const neededRoadSegments = calcNeededRoadSegments(ctx, nation.id);

  const roadGold = calculateRoadCost(neededRoadSegments);

  const requests: BudgetAllocationRequest[] = [];

  if (roadGold > 0) {
    requests.push({
      action: "roadBuild",
      amount: roadGold,
      priority: GOLD_ALLOCATION_PRIORITY.roadBuild,
      mode: "exact",
    });
  }

  console.log(`${nation.id} needed road segments:`, neededRoadSegments);
  console.log(`${nation.id} requests`, requests);

  const budgetCtx = { ctx, nationId: nation.id, foundationComplete, barrackLevels };

  return {
    gold: calcGoldBudget(budgetCtx, getNationResource(nation, "gold"), pressure, requests).goldMap,
  };
}
