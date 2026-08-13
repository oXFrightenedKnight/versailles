import { analyzeNationBorder } from "#services/ai/analysis/military/analyzeBorders.js";
import { BorderNeed } from "#services/ai/analysis/military/types.js";
import { WorldAnalysis } from "#services/ai/analysis/types.js";
import { sortCandidates } from "#services/ai/generateCandidates.js";
import { ArmyTrain } from "#services/ai/intents/types.js";
import { AIPlanningState } from "#services/ai/planning/types.js";
import { GameCtx } from "#trpc/index.js";
import {
  NATION_RESOURCE,
  Nation,
  getArmyTrainCost,
  Hex,
  BUILDINGS,
  getBuildingName,
  getBuildingConfig,
  NationResourceTable,
  getBuildingsByIdMap,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { proposalPriority } from "../armyMove/policy";
import { calcOptimisticDeficit } from "#services/ai/planning/queries/army.js";

export function generateArmyTrainCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  budget: Map<NATION_RESOURCE, number>,
  nation: Nation
): ArmyTrain[] {
  const budgetUsed = new Map(Object.keys(budget).map((key) => [key, 0]));

  const armyTrainIntents: ArmyTrain[] = [];
  const addTrainIntent = (
    barrackId: string,
    amount: number,
    score: number,
    cost: NationResourceTable
  ) => {
    for (const [resource, amount] of typedEntries(cost)) {
      if (amount === undefined) return null;

      const resBudget = budget.get(resource) ?? 0;
      if (!resBudget) return null;

      const prevUsed = budgetUsed.get(resource) ?? 0;

      const total = prevUsed + amount;
      if (total > resBudget) return null;

      budgetUsed.set(resource, total);
    }

    armyTrainIntents.push({ id: crypto.randomUUID(), amount, score, type: "armyTrain", barrackId });
  };

  const borderAnalysis = analyzeNationBorder(ctx, analysis, planning, nation);

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
  const buildingIdMap = getBuildingsByIdMap(ctx.buildings);

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

      const config = getBuildingConfig({
        category: building.category,
        level: building.level,
      });
      const max = config?.systems?.armyTraining?.maxTraining ?? 0;

      const amount = Math.min(max, deficit);
      trained += amount;

      trainIntents.push({
        barrackId: hex.buildingId,
        score: proposalPriority[border.category],
        amount: amount,
      });
    }
  }

  return trainIntents;
}
