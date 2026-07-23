import { WorldAnalysis } from "#services/ai/types/analyze.js";
import {
  BASE_RESOURCE,
  BUILDINGS_CATEGORY,
  isBaseResource,
  isNationResource,
  isResource,
  Nation,
  NATION_RESOURCE,
} from "@repo/shared";
import { AIPlanningState } from "../planning/types";
import { getResourcePrediction } from "../helpers";
import { GameCtx } from "#trpc/index.js";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";

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

export function getNationResourcePrediction(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
) {
  const prediction = getResourcePrediction(ctx, analysis, planning, nation);

  const nationResMap = new Map<NATION_RESOURCE, number>();
  for (const [r, amount] of typedEntries(prediction.totalResourceProduced)) {
    if (isResource(r) && isNationResource(r) && amount && amount > 0) {
      nationResMap.set(r, amount);
    }
  }

  return nationResMap;
}
