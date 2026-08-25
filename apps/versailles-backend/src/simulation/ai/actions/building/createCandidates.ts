import { WorldAnalysis } from "../../analysis/types.js";
import { BuildIntent, AIScoreReasons } from "../../intents/types.js";
import { reserveSavingBudget, createBuildSaving } from "../../planning/goals/buildSaving.js";
import {
  getNextOpeningBuilding,
  getOptimisticCategoryLevels,
  getOptimisticTotalLevels,
} from "../../planning/queries/buildings.js";
import {
  getResourcePrediction,
  getResourceShortage,
  getNationResourcePrediction,
} from "../../planning/queries/resources.js";
import { AIPlanningState, BuildSavingGoalType } from "../../planning/types.js";
import { getHexesBuildings } from "../../world/buildings.js";
import { getHexesWithRoads } from "../../world/map.js";
import { GameCtx } from "#trpc/index.js";
import {
  building_categoires,
  BUILDINGS_CATEGORY,
  findNeighbors,
  getBuildingConfig,
  getBuildingsByIdMap,
  getHexAxialMap,
  getHexIdMap,
  getNationResource,
  getTopCategoryLevel,
  isBaseResource,
  Nation,
  NATION_RESOURCE,
  NationResourceTable,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import {
  BuildingScoreTable,
  BIOME_SCORE_MULT,
  WAR_DEBUFF_CATEGORIES,
  BUILDING_COMPOSITION,
  MAX_SAVING_TURNS,
} from "./policy";
import { ScoredIntent } from "./types";
import { trySpendBudget } from "../../budget/ledger.js";
import { revalidateBuildSaving } from "./buildSaving";
import { createPlanningBuildIntent } from "../../planning/mutations/buildings.js";
import { selectClosestOpeningHexes } from "./foundation";
import { getOptimisticBuildInHex } from "../../../buildings/queries.js";

type SubmissionStatus = "FAILED" | "SAVING" | "QUEUED";

export function generateBuildCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation,
  buildingBudget: Map<NATION_RESOURCE, number>
): BuildIntent[] {
  const BuildIntents: ScoredIntent[] = [];
  const nationHexes = ctx.mapHexes.filter((h) => h.owner === nation.id);

  const createIntent = (
    category: BUILDINGS_CATEGORY,
    hexId: number,
    score: number,
    cost: NationResourceTable,
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
  const buildingsById = getBuildingsByIdMap(ctx.buildings);

  const borderingHexIds = new Set(analysis.worldData.borderingHexes.map((h) => h.id));

  const buildingStatePredict = getResourcePrediction(ctx, analysis, planning, nation);
  const shortage = getResourceShortage(buildingStatePredict);

  // step 1: score each category in each buildable hex
  for (const hex of nationHexes) {
    const neighbors = findNeighbors(hex, ctx.mapHexes, hexAxialMap);
    const neighborCategories = getHexesBuildings(neighbors, buildingsById).map((b) => b.category);

    const expectedBuilding = getOptimisticBuildInHex(ctx, hex.id, hexIdMap, buildingsById);

    const maxLevel = expectedBuilding ? getTopCategoryLevel(expectedBuilding.category) : 0;

    const isMax = expectedBuilding !== null && expectedBuilding.level === maxLevel;
    if (isMax) continue;

    for (const category of building_categoires) {
      if (expectedBuilding && expectedBuilding.category !== category) continue;

      // --- VALIDATION ---
      const nextBuilding = {
        category: category,
        level: expectedBuilding ? expectedBuilding.level + 1 : 1,
      };
      const config = getBuildingConfig(nextBuilding);
      if (!config) continue;

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
        config?.producing &&
        typedEntries(config.producing).some(
          ([res, amount]) => (amount ?? 0) > 0 && isBaseResource(res) && (shortage[res] ?? 0) > 0
        )
      ) {
        add("shortage_resource", BuildingScoreTable["shortage_resource"]);
      }

      // 8. Small buff if already has a building
      if (expectedBuilding) {
        add("existing_building", BuildingScoreTable["existing_building"]);
      }

      // calculate resource cost
      const cost = { gold: config.buildCost };

      const targetLevel = (expectedBuilding?.level ?? 0) + 1;

      // Create score object
      createIntent(category, hex.id, score, cost, targetLevel, reasons);
    }
  }

  // All submited intents go here
  const approvedIntents: BuildIntent[] = [];
  const submit = (
    intent: ScoredIntent,
    type: BuildSavingGoalType
  ): { status: SubmissionStatus } => {
    // subtract cost from budget
    const res = trySpendBudget(buildingBudget, intent.cost);
    if (!res.ok) {
      // one save goal at a time
      if ([...planning.buildSaving].length > 0) return { status: "FAILED" };

      const created = createBuildSaving(
        planning,
        intent.hexId,
        intent.category,
        intent.targetLevel,
        type
      );
      if (created.ok) {
        reserveSavingBudget(buildingBudget, planning, intent.hexId, intent.cost);
        return { status: "SAVING" };
      }
    } else {
      // approve if sufficient funds
      const { ok } = approveIntent({
        id: crypto.randomUUID(),
        score: intent.score,
        type: "buildIntent",
        reason: intent.reason,
        buildingCategory: intent.category,
        hexId: intent.hexId,
      });
      if (ok) return { status: "QUEUED" };
    }

    return { status: "FAILED" };
  };
  const approveIntent = (intent: BuildIntent) => {
    approvedIntents.push(intent);
    const success = createPlanningBuildIntent(planning, intent.hexId, intent.buildingCategory, 1);

    if (success.ok) return { ok: true };

    return { ok: false };
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
    const res = revalidateBuildSaving(IntentMap, planning, hexId, expectedBuilding);

    if (!res.ok) continue;
    if (!intent) continue;

    const success = trySpendBudget(buildingBudget, intent.cost);
    if (success.ok) {
      // approve building
      const { ok } = approveIntent({
        id: crypto.randomUUID(),
        type: "buildIntent",
        score: intent.score,
        buildingCategory: intent.category,
        hexId: intent.hexId,
      });
      // remove intent from candidate list
      if (ok) {
        IntentMap.delete(key);
      }
    } else {
      // reserve budget and keep saving
      reserveSavingBudget(buildingBudget, planning, hexId, intent.cost);
    }
  }

  // step 3: validate and submit generated candidates
  // check if opening schema is active and select best intents from there
  const nationResPrediction = getNationResourcePrediction(ctx, analysis, planning, nation);

  const nextOpening = getNextOpeningBuilding(ctx, planning, nation.id);
  if (nextOpening) {
    // closest hexes to current opening target
    const closestHexes = selectClosestOpeningHexes(ctx, nextOpening, nation.id);
    for (const intent of [...IntentMap.values()]) {
      if (closestHexes.has(intent.hexId) && intent.category === nextOpening.category) {
        submit(intent, "opening");
        break; // limit to one intent
      }
    }
  } else {
    // select regular intents if no schema is active
    for (const intent of [...IntentMap.values()]) {
      if (planning.intendedBuildings.has(intent.hexId)) continue;

      const isWorthSaving = typedEntries(intent.cost).every(
        ([resource, amount]) =>
          getNationResource(nation, resource) +
            (nationResPrediction.get(resource) ?? 0) * MAX_SAVING_TURNS >=
          (amount ?? 0)
      );

      if (isTopIntent(IntentMap, 0, 10, intent) && isWorthSaving) {
        submit(intent, "regular");
      }
    }
  }

  return approvedIntents;
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
