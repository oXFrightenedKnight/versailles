import {
  building_categoires,
  BUILDINGS_CATEGORY,
  findBuildingDataByCategory,
  findNeighbors,
  Nation,
} from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { getHexAxialMap } from "../../map";
import { WorldAnalysis } from "../types/analyze";
import {
  AIScoreReasons,
  BIOME_SCORE_MULT,
  BUILDING_RATIO,
  BuildingScoreTable,
  BuildIntent,
  WAR_DEBUFF_CATEGORIES,
} from "../types/intent";
import { generateArmyMoveCandidates } from "./army/move/main";
import { generateArmyTrainCandidates } from "./army/train/main";
import {
  getBuildingsByIdMap,
  getHexesBuildings,
  getHexesWithRoads,
  getResourcePrediction,
  getResourceShortage,
} from "./helpers";
import { createPlanningState } from "./planning/main";

export function getCandidates(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const planning = createPlanningState(ctx, nation.id);

  // 1. Run building (w Score)
  const buildIntents = generateBuildCandidates(ctx, analysis, nation);

  // 2. Run army movement
  const moveIntents = generateArmyMoveCandidates(ctx, analysis, nation, planning);

  // 3. Run army training
  const trainIntents = generateArmyTrainCandidates(ctx, analysis, planning, nation);
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
