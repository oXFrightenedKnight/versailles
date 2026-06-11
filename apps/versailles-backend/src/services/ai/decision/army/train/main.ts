import { GameCtx } from "#trpc/index.js";
import {
  BUILDINGS,
  findBuildingNameByCategory,
  getArmyTrainCost,
  Hex,
  Nation,
  typeNationResource,
} from "@repo/shared";
import { WorldAnalysis } from "../../../types/analyze";
import { ArmyTrain } from "../../../types/intent";
import { getBuildingsByIdMap } from "../../helpers";
import { getOptimisticArmyAtHex } from "../../planning/main";
import { AIPlanningState } from "../../planning/types";
import { analyzeNationBorder } from "../militaryAnalysis/main";
import { BorderNeed } from "../militaryAnalysis/types";
import { BudgetMap } from "../../budget/types";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { sortCandidates } from "../../candidates";

export function generateArmyTrainCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  budget: BudgetMap,
  nation: Nation
): ArmyTrain[] {
  const budgetUsed = new Map(Object.keys(budget).map((key) => [key, 0]));

  const armyTrainIntents: ArmyTrain[] = [];
  const addTrainIntent = (
    barrackId: string,
    amount: number,
    score: number,
    cost: Partial<Record<typeNationResource, number>>
  ) => {
    for (const [resource, amount] of typedEntries(cost)) {
      if (amount === undefined) return null;

      const resBudget = budget.get(resource)?.building;
      if (!resBudget) return null;

      const prevUsed = budgetUsed.get(resource) ?? 0;

      const total = prevUsed + amount;
      if (total > resBudget) return null;

      budgetUsed.set(resource, total);
    }

    armyTrainIntents.push({ id: crypto.randomUUID(), amount, score, type: "armyTrain", barrackId });
  };

  const borderAnalysis = analyzeNationBorder(ctx, analysis, nation, planning);

  // remember to include manpower as a limit
  const deficitTrainIntents = calcArmyTrain(ctx, analysis, planning, borderAnalysis);
  for (const intent of deficitTrainIntents) {
    const goldCost = getArmyTrainCost(intent.amount);
    addTrainIntent(intent.barrackId, intent.amount, intent.score, { gold: goldCost });
  }

  return sortCandidates(armyTrainIntents);
}

// REMEMBER TO INCLUDE MOVING AI ARMY
function calcArmyTrain(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  borderNeed: BorderNeed[]
) {
  const trainIntents: { barrackId: string; score: number; amount: number }[] = [];

  const sortedNeed = borderNeed.sort((a, b) => b.deficit - a.deficit);

  const bfsMap = new Map(analysis.selfData.borderBFS.map((obj) => [obj.startHexId, obj]));
  const buildingIdMap = getBuildingsByIdMap(ctx);

  // for each border with deficit find closest barrack that has space and train
  for (const border of sortedNeed) {
    if (!border.deficit) continue;
    const cameFrom = bfsMap.get(border.hexId)?.cameFrom;
    if (!cameFrom) continue;

    const hexDist: { hex: Hex; dist: number }[] = [];
    for (const hex of ctx.mapHexes) {
      if (!hex || !hex.buildingId) continue;
      const distToBorder = cameFrom.get(hex.id);
      if (!distToBorder) continue;

      const building = buildingIdMap.get(hex.buildingId);
      if (!building || building.category !== "BARRACK") continue;

      hexDist.push({ hex: hex, dist: distToBorder });
    }

    const deficit = calcOptimisticDeficit(border, planning);

    // from lowest dist to highest
    const sorted = hexDist.sort((a, b) => a.dist - b.dist);

    // While loop for training whats in the deficit
    let trained = 0;
    while (deficit > trained && sorted.length > 0) {
      const hexObj = sorted.shift();
      if (!hexObj) continue;

      const hex = hexObj?.hex;
      if (!hex.buildingId) continue;

      const building = buildingIdMap.get(hex.buildingId);
      if (!building) continue;

      const name = findBuildingNameByCategory({
        buildingCategory: building.category,
        level: building.level,
      });
      const max = BUILDINGS[name].maxTraining ?? 0;

      const amount = Math.min(max, deficit);
      trained += amount;

      trainIntents.push({ barrackId: hex.buildingId, score: border.priority, amount: amount });
    }
  }

  return trainIntents;
}

function calcOptimisticDeficit(borderNeed: BorderNeed, planning: AIPlanningState) {
  const desired = borderNeed.desiredArmy;
  const armyInHex = getOptimisticArmyAtHex(planning, borderNeed.hexId);

  return desired - armyInHex;
}
