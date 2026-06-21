import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { AIScoreReasons, BuildIntent } from "#services/ai/types/intent.js";
import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import {
  building_categoires,
  BUILDINGS_CATEGORY,
  findBuildingDataByCategory,
  findNeighbors,
  getTopCategoryLevel,
  Nation,
  topLevelsByCategory,
  typeNationResource,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { BudgetMap } from "../budget/types";
import {
  getBuildingsByIdMap,
  getHexesBuildings,
  getHexesWithRoads,
  getResourcePrediction,
  getResourceShortage,
} from "../helpers";
import { AIPlanningState } from "../planning/types";
import { getOptimisticCategoryLevels, getOptimisticTotalLevels } from "./optimistic";
import { ScoredIntent } from "./types";
import { getOptimisticBuildInHex } from "#services/buildings.js";
import { checkBuildSaving, createBuildSaving, reserveSavingBudget } from "../planning/buildSaving";
import { subtractBudget } from "../budget/main";
import {
  BIOME_SCORE_MULT,
  BUILDING_COMPOSITION,
  BuildingScoreTable,
  FOUNDATION_MINIMUMS,
  WAR_DEBUFF_CATEGORIES,
} from "./data";

export function generateBuildCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation,
  budget: BudgetMap
): BuildIntent[] {
  const buildingBudget = new Map([...budget].map(([res, a]) => [res, a.building]));

  const BuildIntents: ScoredIntent[] = [];
  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  const addBuildIntent = (
    category: BUILDINGS_CATEGORY,
    hexId: number,
    score: number,
    cost: Partial<Record<typeNationResource, number>>,
    targetLevel: number,
    reasons?: AIScoreReasons[]
  ) => {
    BuildIntents.push({
      category,
      hexId,
      cost,
      targetLevel,
      score,
      reason: reasons,
    });
  };

  const hexAxialMap = getHexAxialMap(ctx);
  const hexIdMap = getHexIdMap(ctx);
  const hexesWithRoads = getHexesWithRoads(ctx, hexAxialMap);
  const buildingsById = getBuildingsByIdMap(ctx);

  const borderingHexIds = new Set(analysis.worldData.borderingHexes.map((h) => h.id));

  const buildingStatePredict = getResourcePrediction(ctx, analysis, planning, nation);
  const shortage = getResourceShortage(buildingStatePredict);

  // step 1: score each category in each buildable hex
  for (const hex of nationHexes) {
    const neighbors = findNeighbors(hex, ctx.mapHexes, hexAxialMap);
    const neighborCategories = getHexesBuildings(neighbors, buildingsById, planning).map(
      (b) => b.category
    );

    const expectedBuilding = getOptimisticBuildInHex(ctx, hex.id, hexIdMap, buildingsById);

    const maxLevel = expectedBuilding ? getTopCategoryLevel(expectedBuilding.category) : 0;

    const isMax = expectedBuilding !== null && expectedBuilding.level === maxLevel;
    if (isMax) continue;

    for (const category of building_categoires) {
      if (expectedBuilding && expectedBuilding.category !== category) continue;

      // --- VALIDATION ---
      const nextBuilding = {
        buildingCategory: category,
        level: expectedBuilding ? expectedBuilding.level + 1 : 1,
      };
      const buildingData = findBuildingDataByCategory(nextBuilding);
      if (!buildingData) continue;

      // init scoring
      let score = 0;
      const reasons: AIScoreReasons[] = [];
      const add = (key: string, value: number, reason?: string) => {
        score += value;
        reasons.push({ key, value, description: reason });
      };

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

      // 6. Add score depending total share of this category compared to desired
      const categoryLevels = getOptimisticCategoryLevels(analysis, planning, category);
      const allBuildingLevels = getOptimisticTotalLevels(analysis, planning);

      const totalLevels = Math.max(1, allBuildingLevels);

      const currentShare = categoryLevels / totalLevels;
      const desiredShare = BUILDING_COMPOSITION[category] ?? 0;

      if (currentShare < desiredShare) {
        const shortageRatio = Math.max(desiredShare - currentShare, 0.01) / desiredShare;
        add("composition_shortage", BuildingScoreTable.composition_shortage * (1 + shortageRatio));
      }

      // 7. Buff if this building produces shortaged resource
      if (
        buildingData?.producing &&
        buildingData.producing.some((res) => (shortage[res] ?? 0) < 0)
      ) {
        add("shortage_resource", BuildingScoreTable["shortage_resource"]);
      }

      // 8. Small buff if already has a building
      if (expectedBuilding) {
        add("existing_building", BuildingScoreTable["existing_building"]);
      }

      // 9. Huge buff if this building is first foundational
      const foundation = FOUNDATION_MINIMUMS[category];
      const minimum = foundation?.amount ?? 0;

      if (categoryLevels < minimum) {
        add(
          "missing_foundation_category",
          BuildingScoreTable.missing_foundation_category * (foundation?.priority ?? 0)
        );
      }

      // calculate resource cost
      const cost = { gold: buildingData.buildCost };

      const targetLevel = (expectedBuilding?.level ?? 0) + 1;

      // Create score object
      addBuildIntent(category, hex.id, score, cost, targetLevel, reasons);
    }
  }

  // All submited intents go here
  const submited: BuildIntent[] = [];
  const submit = (intent: BuildIntent) => {
    submited.push(intent);
    planning.intendedBuildings.set(intent.hexId, { category: intent.buildingCategory, levels: 1 });
  };
  // Candidates sorted by score
  const sortedIntents = BuildIntents.sort((a, b) => b.score - a.score);
  const IntentMap = new Map(sortedIntents.map((b) => [`${b.hexId},${b.category}`, b]));

  // step 2: check saved goals and build/reserve respective intents
  for (const [hexId, { category }] of [...planning.buildSaving]) {
    const expectedBuilding = getOptimisticBuildInHex(ctx, hexId, hexIdMap, buildingsById);

    const key = `${hexId},${category}`;
    const intent = IntentMap.get(key);

    // In checkBuildSaving, add condition to drop when targetLevel already hit
    const res = checkBuildSaving(IntentMap, planning, hexId, expectedBuilding);

    if (!res.ok) continue;
    if (!intent) continue;

    const success = subtractBudget(buildingBudget, intent.cost);
    if (success.ok) {
      // push intent to submited
      submit({
        id: crypto.randomUUID(),
        type: "buildIntent",
        score: intent.score,
        buildingCategory: intent.category,
        hexId: intent.hexId,
      });
      // remove intent from candidate map
      IntentMap.delete(key);
    } else {
      // reserve budget
      reserveSavingBudget(buildingBudget, planning, hexId, intent.cost);
    }
  }

  // step 3: submit intents until run out of budget
  for (const intent of [...IntentMap.values()]) {
    if (planning.intendedBuildings.has(intent.hexId)) continue;

    // subtract cost from budget
    const res = subtractBudget(buildingBudget, intent.cost);

    if (!res?.ok) {
      // create saving goal if top 10 and no other goals are there (max 1)
      // and don't make goals if there is less than 1 intent
      if (
        [...planning.buildSaving].length === 0 &&
        isTopIntent(IntentMap, 0, 10, intent) &&
        sortedIntents.length > 1
      ) {
        const created = createBuildSaving(
          planning,
          intent.hexId,
          intent.category,
          intent.targetLevel
        );
        if (created.ok) {
          reserveSavingBudget(buildingBudget, planning, intent.hexId, intent.cost);
        }
      }
      continue;
    }

    submit({
      id: crypto.randomUUID(),
      score: intent.score,
      type: "buildIntent",
      reason: intent.reason,
      buildingCategory: intent.category,
      hexId: intent.hexId,
    });
  }

  return submited;
}

// checks whether intent is in top # of all sorted intents
export function isTopIntent(
  IntentMap: Map<string, ScoredIntent>,
  start: number,
  end: number,
  intent: {
    hexId: number;
    category: BUILDINGS_CATEGORY;
  }
) {
  return [...IntentMap.keys()].slice(start, end).includes(`${intent.hexId},${intent.category}`);
}
