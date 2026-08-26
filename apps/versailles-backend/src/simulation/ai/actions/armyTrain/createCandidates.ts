import { analyzeNationBorder } from "../../analysis/military/analyzeBorders.js";
import { BorderNeed } from "../../analysis/military/types.js";
import { WorldAnalysis } from "../../analysis/types.js";
import { sortCandidates } from "../../generateCandidates.js";
import { ArmyTrain } from "../../intents/types.js";
import { calcOptimisticDeficit } from "../../planning/queries/army.js";
import { AIPlanningState } from "../../planning/types.js";
import { reconstructPath } from "../../../algorithms/bfs.js";
import { getMaxAffordableAmount } from "#lib/helpers";
import { proposalPriority } from "#simulation/ai/actions/armyMove/policy";
import { GameCtx } from "#trpc";
import { Nation, Hex } from "@repo/shared";
import { getBuildingsByIdMap, getBuildingConfig } from "@repo/shared/buildings";
import { NATION_RESOURCE } from "@repo/shared/resources";
import { getArmyTrainCost, getTrainingResourceCost } from "@repo/shared/training";
import { typedEntries } from "@repo/shared/utils";

export function generateArmyTrainCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  budget: Map<NATION_RESOURCE, number>,
  nation: Nation
): ArmyTrain[] {
  const budgetUsed = new Map<NATION_RESOURCE, number>();

  const armyTrainIntents: ArmyTrain[] = [];

  const getEffectiveResource = (res: NATION_RESOURCE) => {
    const resBudget = budget.get(res) ?? 0;
    const resUsed = budgetUsed.get(res) ?? 0;
    return Math.max(0, resBudget - resUsed);
  };
  const addTrainIntent = (barrackId: string, amount: number, score: number) => {
    // adjust intent amount by gold and manpower
    const effectiveGold = getEffectiveResource("gold");
    const effectiveManpower = getEffectiveResource("manpower");

    const affordableArmy = Math.floor(
      Math.min(amount, getMaxAffordableAmount(effectiveGold, getArmyTrainCost), effectiveManpower)
    );
    if (affordableArmy <= 0) return null;

    const cost = getTrainingResourceCost(affordableArmy);

    // validate all resources
    for (const [resource, amount] of typedEntries(cost)) {
      if (amount === undefined) return null;

      const effectiveRes = getEffectiveResource(resource);

      if (amount > effectiveRes) return null;
    }
    // apply resource usage
    for (const [resource, amount] of typedEntries(cost)) {
      const prevUsed = budgetUsed.get(resource) ?? 0;
      budgetUsed.set(resource, prevUsed + (amount ?? 0));
    }

    armyTrainIntents.push({
      id: crypto.randomUUID(),
      amount: affordableArmy,
      score,
      type: "armyTrain",
      barrackId,
    });
  };

  const borderAnalysis = analyzeNationBorder(ctx, analysis, planning, nation);

  // remember to include manpower as a limit
  const deficitTrainIntents = calcArmyTrain(ctx, nation, analysis, planning, borderAnalysis);
  for (const intent of deficitTrainIntents) {
    addTrainIntent(intent.barrackId, intent.amount, intent.score);
  }

  return sortCandidates(armyTrainIntents);
}

// REMEMBER TO INCLUDE MOVING AI ARMY
function calcArmyTrain(
  ctx: GameCtx,
  nation: Nation,
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
      if (!hex || !hex.buildingId || hex.owner !== nation.id) continue;
      const distToBorder = reconstructPath(cameFrom, hex.id)?.length;
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

      const amount = Math.min(max, deficit - trained);
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
