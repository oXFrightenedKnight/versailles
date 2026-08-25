import { EARLY_BUILDING_TARGET_SCHEMA } from "../../actions/building/policy.js";
import { OpeningTarget } from "../../actions/building/types.js";
import { WorldAnalysis } from "../../analysis/types.js";
import { GameCtx } from "#trpc/index.js";
import { building_categoires, BUILDINGS_CATEGORY, getBuildingsByIdMap } from "@repo/shared";
import { AIPlanningState } from "../types";

export function getOptimisticCategoryLevels(
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  category: BUILDINGS_CATEGORY
) {
  const countObj = analysis.selfData.buildingCounts[category];
  const currCategoryLevels = countObj
    ? countObj.reduce((acc, levelObj) => acc + levelObj.amount * levelObj.level, 0)
    : 0;

  const queuedCategoryLevels = analysis.selfData.constructing
    .filter((c) => c.category === category)
    .reduce((acc, c) => acc + c.levels, 0);

  const plannedCategory = [...planning.intendedBuildings]
    .map(([_, p]) => p)
    .filter((p) => p.category === category);
  const plannedLevels = plannedCategory.reduce((acc, p) => acc + p.levels, 0);

  return currCategoryLevels + queuedCategoryLevels + plannedLevels;
}

export function getOptimisticTotalLevels(analysis: WorldAnalysis, planning: AIPlanningState) {
  const currentLevels = Object.entries(analysis.selfData.buildingCounts).reduce((acc, category) => {
    return acc + category[1].reduce((acc, levelObj) => acc + levelObj.amount * levelObj.level, 0);
  }, 0);

  const queuedCategoryLevels = analysis.selfData.constructing.reduce((acc, c) => acc + c.levels, 0);

  const plannedCategory = [...planning.intendedBuildings].map(([_, p]) => p);
  const plannedLevels = plannedCategory.reduce((acc, p) => acc + p.levels, 0);

  return currentLevels + queuedCategoryLevels + plannedLevels;
}

// returns optimistic building count in nation
export function getOptimisticBuildingCounts(
  ctx: GameCtx,
  nationId: string,
  planning: AIPlanningState
) {
  const buildingIdMap = getBuildingsByIdMap(ctx.buildings);

  const countMap = new Map<BUILDINGS_CATEGORY, Map<number, number>>(); // <category, Map<level, amount>>

  for (const hex of ctx.mapHexes) {
    if (hex.owner !== nationId) continue;

    const building = hex.buildingId ? buildingIdMap.get(hex.buildingId) : undefined;
    const existingLevels = building?.level ?? 0;

    // get constructing
    const constructingLevels = hex.build_queue ? hex.build_queue.levels : 0;

    // get planned
    const plannedBuilding = planning.intendedBuildings.get(hex.id);
    const plannedLevels = plannedBuilding?.levels ?? 0;

    const totalLevel = existingLevels + constructingLevels + plannedLevels;
    const category = building?.category ?? hex.build_queue?.building ?? plannedBuilding?.category;

    if (!category) continue;

    const existingCategoryCount = countMap.get(category) ?? new Map<number, number>();
    const existingLevelCount = existingCategoryCount.get(totalLevel) ?? 0; // total buildings of this level

    existingCategoryCount.set(totalLevel, existingLevelCount + 1);

    countMap.set(category, existingCategoryCount);
  }

  for (const category of building_categoires) {
    if (!countMap.has(category)) {
      countMap.set(category, new Map());
    }
  }

  return countMap;
}

// returns the next building ai should consider
// counts all buildings of target level or above
export function getNextOpeningBuilding(
  ctx: GameCtx,
  planning: AIPlanningState,
  nationId: string
): OpeningTarget | undefined {
  const optimisticBuildings = getOptimisticBuildingCounts(ctx, nationId, planning);

  for (const target of EARLY_BUILDING_TARGET_SCHEMA) {
    const categoryLvlMap = optimisticBuildings.get(target.category);
    if (!categoryLvlMap) continue;

    // find suitable buildings of this category
    const suitable = [...categoryLvlMap]
      .filter(([level, amount]) => level >= target.level && amount > 0)
      .sort(([a], [b]) => a - b)[0];

    if (!suitable) {
      return target;
    }

    const [suitableLevel, buildingAmount] = suitable;

    // update category map to avoid double-counting
    categoryLvlMap.set(suitableLevel, buildingAmount - 1);
  }
}

export function hasBuiltFoundation(ctx: GameCtx, planning: AIPlanningState, nationId: string) {
  const nextOpening = getNextOpeningBuilding(ctx, planning, nationId);
  return nextOpening ? false : true;
}
