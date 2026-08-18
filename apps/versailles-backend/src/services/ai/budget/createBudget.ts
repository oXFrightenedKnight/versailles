import { getNationBuildingCount } from "#services/buildings/queries.js";
import { GameCtx } from "#trpc/index.js";
import { getNationResource, Nation } from "@repo/shared";
import { analyzeAIPressure } from "../analysis/pressure";
import { calcNeededRoadCost } from "../analysis/roads";
import { WorldAnalysis } from "../analysis/types";
import { getNextOpeningBuilding } from "../planning/queries/buildings";
import { AIPlanningState } from "../planning/types";
import { calcGoldBudget } from "./allocation/gold";
import { GOLD_ALLOCATION_PRIORITY } from "./policy";
import { BudgetAllocationRequest } from "./types";
import { calcManpowerBudget } from "./allocation/manpower";

export function createAIBudget(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
) {
  const pressure = analyzeAIPressure(ctx, analysis, nation);

  const foundationComplete = getNextOpeningBuilding(ctx, planning, nation.id) === undefined;

  const buildingCount = getNationBuildingCount(ctx, nation.id);

  const barrackLevels =
    buildingCount["BARRACK"]?.reduce((acc, counts) => acc + counts.amount * counts.level, 0) ?? 0;

  const roadGold = calcNeededRoadCost(ctx, nation.id);

  const requests: BudgetAllocationRequest[] = [];

  if (roadGold > 0) {
    requests.push({
      action: "roadBuild",
      amount: roadGold,
      priority: GOLD_ALLOCATION_PRIORITY.roadBuild,
      mode: "exact",
    });
  }

  console.log(`${nation.id} requests`, requests);

  const budgetCtx = { ctx, nationId: nation.id, foundationComplete, barrackLevels };

  return {
    gold: calcGoldBudget(budgetCtx, getNationResource(nation, "gold"), pressure, requests).goldMap,
    manpower: calcManpowerBudget(getNationResource(nation, "manpower")).manpowerMap,
  };
}
