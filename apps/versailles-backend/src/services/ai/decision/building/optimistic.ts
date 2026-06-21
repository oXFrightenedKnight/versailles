import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { BUILDINGS_CATEGORY } from "@repo/shared";
import { AIPlanningState } from "../planning/types";

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
