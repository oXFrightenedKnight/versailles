import { AIIntent, AIScoreReasons, BuildIntent } from "#services/ai/types/intent.js";
import {
  building_categoires,
  BUILDINGS_CATEGORY,
  findBuildingDataByCategory,
  findNeighbors,
  Nation,
  topLevelsByCategory,
  typeNationResource,
} from "@repo/shared";
import {
  getBuildingsByIdMap,
  getHexesBuildings,
  getHexesWithRoads,
  getResourcePrediction,
  getResourceShortage,
} from "../helpers";
import { getHexAxialMap } from "#services/map.js";
import { AIBudget, BudgetMap } from "../budget/types";
import { AIPlanningState } from "../planning/types";
import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { GameCtx } from "#trpc/index.js";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import {
  BIOME_SCORE_MULT,
  BUILDING_RATIO,
  BuildingScoreTable,
  WAR_DEBUFF_CATEGORIES,
} from "./types";
import { getOptimisticCategoryLevels } from "./optimistic";
import { sortCandidates } from "../candidates";

export function generateBuildCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation,
  budget: BudgetMap
): BuildIntent[] {
  const budgetUsed = new Map(Object.keys(budget).map((key) => [key, 0]));

  const BuildIntents: BuildIntent[] = [];
  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  const addBuildIntent = (
    category: BUILDINGS_CATEGORY,
    hexId: number,
    score: number,
    cost: Partial<Record<typeNationResource, number>>,
    reasons?: AIScoreReasons[]
  ) => {
    // subtract cost from budget
    for (const [resource, amount] of typedEntries(cost)) {
      if (amount === undefined) return null;

      const resBudget = budget.get(resource)?.building;
      if (!resBudget) return null;

      const prevUsed = budgetUsed.get(resource) ?? 0;

      const total = prevUsed + amount;
      if (total > resBudget) return null;

      budgetUsed.set(resource, total);
    }

    BuildIntents.push({
      id: crypto.randomUUID(),
      type: "buildIntent",
      buildingCategory: category,
      hexId,
      score,
      reason: reasons,
    });

    planning.intendedBuildings.set(hexId, { category, levels: 1 });
  };

  const hexAxialMap = getHexAxialMap(ctx);
  const hexesWithRoads = getHexesWithRoads(ctx, hexAxialMap);
  const buildingsById = getBuildingsByIdMap(ctx);

  const borderingHexIds = new Set(analysis.worldData.borderingHexes.map((h) => h.id));

  const buildingStatePredict = getResourcePrediction(ctx, analysis, planning, nation);
  const shortage = getResourceShortage(buildingStatePredict);

  // assign score to each hex for each category
  for (const hex of nationHexes) {
    const neighbors = findNeighbors(hex, ctx.mapHexes, hexAxialMap);
    const neighborCategories = getHexesBuildings(neighbors, buildingsById, planning).map(
      (b) => b.category
    );

    const existing = hex.buildingId ? buildingsById.get(hex.buildingId) : undefined;

    const maxLevel = topLevelsByCategory.find((c) => c.category === existing?.category) ?? 0;
    const isMax = existing && existing.level === maxLevel;
    if (isMax) continue;

    for (const category of building_categoires) {
      let score = 0;
      const reasons: AIScoreReasons[] = [];
      const add = (key: string, value: number, reason?: string) => {
        score += value;
        reasons.push({ key, value, description: reason });
      };

      // --- VALIDATION ---
      const expectedBuilding = {
        buildingCategory: category,
        level: existing ? existing.level + 1 : 1,
      };
      const buildingData = findBuildingDataByCategory(expectedBuilding);
      if (!buildingData) continue;

      if (existing && existing.category !== category) continue;

      if (planning.intendedBuildings.has(hex.id)) continue;

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
      const totalCategoryLevels = getOptimisticCategoryLevels(analysis, planning, category);
      const allBuildingLevels = building_categoires.reduce(
        (acc, c) => acc + getOptimisticCategoryLevels(analysis, planning, c),
        0
      );
      const ratio = totalCategoryLevels / Math.max(1, allBuildingLevels);
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

      // calculate resource cost
      const cost = { gold: buildingData.buildCost };

      // Create score object
      addBuildIntent(category, hex.id, score, cost, reasons);
    }
  }

  return sortCandidates(BuildIntents);
}
