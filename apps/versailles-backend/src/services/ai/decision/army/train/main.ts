import { Nation } from "@repo/shared";
import { GameCtx } from "#trpc/index.js";
import { WorldAnalysis } from "../../../types/analyze";
import { AIScoreReasons, ArmyTrain, ArmyTrainTable, BorderNeed } from "../../../types/intent";
import { analyzeNationBorder } from "../move/analyze";
import { findClosestHexFromHexes, getBuildingsByIdMap, getDistanceScore } from "../../helpers";
import { AIPlanningState } from "../../planning/types";

function generateArmyTrainCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): ArmyTrain[] {
  const armyTrainIntents: ArmyTrain[] = [];
  const addTrainIntent = (barrackId: string, score: number) => {
    armyTrainIntents.push({ id: crypto.randomUUID(), score, type: "armyTrain", barrackId });
  };

  const buildingIdHexMap = new Map(ctx.mapHexes.map((h) => [h.buildingId, h]));

  const missingArmyHexes = analyzeNationBorder(ctx, analysis, nation);

  for (const building of ctx.buildings) {
    if (building.category !== "BARRACK") continue;
    const hex = buildingIdHexMap.get(building.id);
    if (!hex) continue;

    let score = 0;
    const reasons: AIScoreReasons[] = [];
    const add = (key: string, value: number, reason?: string) => {
      score += value;
      reasons.push({ key, value, description: reason });
    };

    // 1. Buff score depending on how close barrack is to frontline
    const frontlineHexIds = analysis.worldData.currentFrontlines.flatMap((f) =>
      f.hexIds.flatMap((id) => id)
    );
    const frontlineDistance = findClosestHexFromHexes(ctx, frontlineHexIds, hex);
    if (frontlineDistance) {
      const distScore = getDistanceScore({
        max: ctx.mapHexes.length,
        softness: 10,
        distance: frontlineDistance.dist,
      });
      add("distance_to_frontline", distScore, "Score based on distance to frontlines");
    }

    // 2. Higher level buff
    add("higher_level", ArmyTrainTable["higher_level"] * building.level);

    addTrainIntent(building.id, score);

    // GENERAL SUGGESTIONS - most logic in dynamic threshold, amount based on enemies/strehgth ratios, put logic in budget calculation.
    // Budget is what you use to control how much and on what ai will spend its resources. So allocate more budget to training when at war.
    // Only put rules that allow intents to compete here.
  }
  return armyTrainIntents;
}

// REMEMBER TO INCLUDE MOVING AI ARMY
function calcMissingArmy(ctx: GameCtx, analysis: WorldAnalysis, borderNeed: BorderNeed[]) {
  const sortedNeed = borderNeed.sort((a, b) => b.deficit - a.deficit);

  const bfsMap = new Map(analysis.selfData.borderBFS.map((obj) => [obj.startHexId, obj]));
  const buildingIdMap = getBuildingsByIdMap(ctx);

  // for each border find closest barrack that has space and train
  for (const border of sortedNeed) {
    if (!border.deficit) continue;
    const cameFrom = bfsMap.get(border.hexId)?.cameFrom;
    if (!cameFrom) continue;

    const hexDist: { hexId: number; dist: number }[] = [];
    for (const hex of ctx.mapHexes) {
      if (!hex || !hex.buildingId) continue;
      const distToBorder = cameFrom.get(hex.id);
      if (!distToBorder) continue;

      const building = buildingIdMap.get(hex.buildingId);
      if (!building || building.category !== "BARRACK") continue;

      hexDist.push({ hexId: hex.id, dist: distToBorder });
    }

    // from lowest dist to highest
    const sorted = hexDist.sort((a, b) => a.dist - b.dist);

    // While loop for training whats in the deficit
  }
}

function calcOptimisticDeficit(
  ctx: GameCtx,
  borderNeed: BorderNeed,
  analysis: WorldAnalysis,
  planning: AIPlanningState
) {}
