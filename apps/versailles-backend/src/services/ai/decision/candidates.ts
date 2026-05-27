import {
  building_categoires,
  BUILDINGS_CATEGORY,
  findBuildingDataByCategory,
  findNeighbors,
  getHexByAxial,
  HEX_DIRECTIONS,
  Nation,
} from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { getHexAxialMap, getHexById, getHexIdMap } from "../../map";
import { WorldAnalysis } from "../types/analyze";
import {
  AIIntent,
  AIScoreReasons,
  AnswerMail,
  ArmyTrain,
  ArmyTrainTable,
  BIOME_SCORE_MULT,
  BUILDING_RATIO,
  BuildingScoreTable,
  BuildIntent,
  BuildRoad,
  CreateContract,
  DeclareWarIntent,
  MoveArmy,
  SignPeaceReqIntent,
  WAR_DEBUFF_CATEGORIES,
} from "../types/intent";
import {
  calculateFrontlineDistances,
  findClosestHexFromHexes,
  getAITrainingAmount,
  getBuildingsByIdMap,
  getDistanceScore,
  getHexesBuildings,
  getHexesWithRoads,
  getResourcePrediction,
  getResourceShortage,
} from "./helpers";

{
  /*export function getCandidates(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation): AIIntent[] {
  return [
    ...generateBuildCandidates(ctx, analysis, nation),
    ...generateArmyTrainCandidates(ctx, analysis, nation),
    ...generateArmyMoveCandidates(ctx, analysis, nation),
    ...generateBuildRoadCandidates(ctx, analysis, nation),
    ...generateCreateContractCandidates(ctx, analysis, nation),
    ...generateDeclareWarCandidates(ctx, analysis, nation),
    ...generateAnswerMailCandidates(ctx, analysis, nation),
    ...generateSignPeaceReqCandidates(ctx, analysis, nation),
  ];
}*/
}

function generateBuildCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): BuildIntent[] {
  const BuildIntents: BuildIntent[] = [];
  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  const addBuildIntent = (
    category: BUILDINGS_CATEGORY,
    hexId: number,
    score: number,
    reasons?: AIScoreReasons[]
  ) => {
    BuildIntents.push({
      id: crypto.randomUUID(),
      type: "buildIntent",
      buildingCategory: category,
      hexId,
      score,
      reason: reasons,
    });
  };

  const hexAxialMap = getHexAxialMap(ctx);
  const hexesWithRoads = getHexesWithRoads(ctx, hexAxialMap);
  const buildingsById = getBuildingsByIdMap(ctx);

  const borderingHexIds = new Set(analysis.worldData.borderingHexes.map((h) => h.id));

  const buildingStatePredict = getResourcePrediction(ctx, analysis, nation);
  const shortage = getResourceShortage(buildingStatePredict);

  // assign score to each hex for each building
  for (const hex of nationHexes) {
    const neighbors = findNeighbors(hex, ctx.mapHexes, hexAxialMap);
    const neighborCategories = getHexesBuildings(neighbors, buildingsById).map((b) => b.category);

    const existing = hex.buildingId ? buildingsById.get(hex.buildingId) : undefined;

    for (const category of building_categoires) {
      let score = 0;
      const reasons: AIScoreReasons[] = [];
      const add = (key: string, value: number, reason?: string) => {
        score += value;
        reasons.push({ key, value, description: reason });
      };

      const expectedBuilding = {
        buildingCategory: category,
        level: existing ? existing.level + 1 : 1,
      };
      const buildingData = findBuildingDataByCategory(expectedBuilding);

      // 1. Biome score
      add(
        "base_biome_score",
        BuildingScoreTable["base_biome_score"] * BIOME_SCORE_MULT[hex.biome ?? "plains"]
      );

      // 2. Has road bonus
      if (hexesWithRoads.has(hex.id)) {
        add("road_bonus", BuildingScoreTable["road_bonus"]);
      }

      // 3. If neighboring hexes already have same category building - debuff
      if (neighborCategories.includes(category)) {
        add("neighbor_category_debuff", BuildingScoreTable["neighbor_category_debuff"]);
      }

      // 4. Building on the border - debuff
      if (neighbors.some((h) => borderingHexIds.has(h.id))) {
        add("building_on_border", BuildingScoreTable["building_on_border"]);
      }

      // 5. Building at war debuff
      if (nation.atWar.length > 0) {
        const addScore =
          (BuildingScoreTable["building_at_war"] / (WAR_DEBUFF_CATEGORIES[category] ?? 0.5)) *
          (1 + nation.atWar.length / 4);
        add("building_at_war", addScore);
      }

      // 6. Add score depending on amount of this category compared to civilian
      const categoryObj = analysis.selfData.buildingCounts[category];
      const categoryLevels = categoryObj
        ? Object.entries(categoryObj).reduce((acc, obj) => {
            return acc + obj[1];
          }, 0)
        : 0;
      const allBuildingLevels = Object.values(analysis.selfData.buildingCounts).reduce(
        (acc, obj) => {
          return acc + obj[1];
        },
        0
      );
      const ratio = categoryLevels / Math.max(1, allBuildingLevels);
      const addScore =
        BuildingScoreTable["base_ratio_score"] * ((BUILDING_RATIO[category] ?? 1) / ratio);
      add("skewed_ratio", addScore, "Not enough buildings of this type for every civilian");

      // 7. Buff if this building produces shortaged resource
      if (buildingData?.producing && buildingData.producing.some((res) => shortage[res] ?? 0 < 0)) {
        add("shortage_resource", BuildingScoreTable["shortage_resource"]);
      }

      // 8. Small buff if existing building of this category
      if (existing && existing.category === category) {
        add("same_existing_category", BuildingScoreTable["same_existing_category"]);
      }

      // Create score object
      addBuildIntent(category, hex.id, score, reasons);
    }
  }

  return BuildIntents;
}

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

function generateArmyMoveCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): MoveArmy[] {
  // Split army amount based on how many high-score intents this hex receives
  const armyMoveIntents: MoveArmy[] = [];
  const addMoveIntent = (fromHexId: number, toHexId: number, score: number) => {
    armyMoveIntents.push({ id: crypto.randomUUID(), fromHexId, toHexId, type: "moveArmy", score });
  };

  const hexIdMap = getHexIdMap(ctx);
  const hexAxialMap = getHexAxialMap(ctx);

  for (const obj of analysis.selfData.armyInHexes) {
    const hex = hexIdMap.get(obj.hexId);
    if (!hex) continue;

    // calculate distance to each frontline and find closest one
    const startHexDist = calculateFrontlineDistances(ctx, analysis, hex, hexIdMap);
    const closestHexDist = Object.entries(startHexDist).sort(
      ([, distA], [, distB]) => distB - distA
    )[0];

    for (const dir of HEX_DIRECTIONS) {
      const neighbor = hexAxialMap.get(`${hex.q + dir.dq},${hex.r + dir.dr}`);
      if (!neighbor) continue;

      // add score based on how much closer this hex brings us towards closest frontline
      const neighborHexDist = calculateFrontlineDistances(ctx, analysis, neighbor, hexIdMap);

      const distanceToClosest = neighborHexDist[closestHexDist[0]];

      // consider adding a multiplier based on war state at that frontline
      // find closest frontline hex for now
      // make sure to include above/below 0 logic

      // --- Same logic applies to peace time - more score to borders ---

      // 1. Apply distance score

      // 2. Army size multiplier (army/total army)

      // --- IF already at border logic ---
    }
  }

  return armyMoveIntents;
}

{
  /*function generateBuildRoadCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): BuildRoad[] {}

function generateCreateContractCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): CreateContract[] {}

function generateDeclareWarCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): DeclareWarIntent[] {}

function generateAnswerMailCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): AnswerMail[] {}

function generateSignPeaceReqCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): SignPeaceReqIntent[] {}
*/
}
