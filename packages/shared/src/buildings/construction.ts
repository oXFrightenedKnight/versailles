import { getBuildingConfig } from "./queries";
import { BUILDINGS_CATEGORY } from "./types";

// returns total amount of gold that was spent on given building
export function calcTotalBuildingCost(category: BUILDINGS_CATEGORY, level: number) {
  let cost = 0;

  for (let i = 1; i < level + 1; i++) {
    const config = getBuildingConfig({ category, level: i });
    if (!config) break;

    const levelCost = config.buildCost;
    cost += levelCost;
  }

  return cost;
}

// returns construction progress on a scale of 0 to 1
export function getConstructionProgress(
  progress: number,
  category: BUILDINGS_CATEGORY,
  currentBuilding?: {
    category: BUILDINGS_CATEGORY;
    level: number;
  }
) {
  const config = getBuildingConfig({
    category: currentBuilding?.category ?? category,
    level: (currentBuilding?.level ?? 0) + 1,
  });
  if (!config) return 0;

  return progress / config.buildTime;
}
