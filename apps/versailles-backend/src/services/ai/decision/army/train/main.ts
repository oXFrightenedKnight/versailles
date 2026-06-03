import { GameCtx } from "#trpc/index.js";
import { BUILDINGS, findBuildingNameByCategory, Hex, Nation } from "@repo/shared";
import { WorldAnalysis } from "../../../types/analyze";
import { ArmyTrain, BorderNeed } from "../../../types/intent";
import { getBuildingsByIdMap } from "../../helpers";
import { getOptimisticArmyAtHex } from "../../planning/main";
import { AIPlanningState } from "../../planning/types";
import { analyzeNationBorder } from "../move/analyze";

export function generateArmyTrainCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
): ArmyTrain[] {
  const armyTrainIntents: ArmyTrain[] = [];
  const addTrainIntent = (barrackId: string, score: number) => {
    armyTrainIntents.push({ id: crypto.randomUUID(), score, type: "armyTrain", barrackId });
  };

  // WHAT IF BORDER STATE CHANGES AFTER PLAYER MAKES MOVES?
  // MAYBE USE PLANNING WHEN CALCULATING BORDER ANALYSIS
  const borderAnalysis = analyzeNationBorder(ctx, analysis, nation);

  // remember to include manpower as a limit
  const deficitTrainIntents = calcArmyTrain(ctx, analysis, planning, borderAnalysis);
  for (const intent of deficitTrainIntents) {
    addTrainIntent(intent.barrackId, intent.amount);
  }

  return armyTrainIntents;
}

// REMEMBER TO INCLUDE MOVING AI ARMY
function calcArmyTrain(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  borderNeed: BorderNeed[]
) {
  const trainIntents: { barrackId: string; amount: number }[] = [];

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
    while (deficit > trained || sorted.length > 0) {
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

      trainIntents.push({ barrackId: hex.buildingId, amount: amount });
    }
  }

  return trainIntents;
}

function calcOptimisticDeficit(borderNeed: BorderNeed, planning: AIPlanningState) {
  const desired = borderNeed.desiredArmy;
  const armyInHex = getOptimisticArmyAtHex(planning, borderNeed.hexId);

  return desired - armyInHex;
}
