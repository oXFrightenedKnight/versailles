import { newBuilding } from "@/lib/types/game";
import { Building, BUILDINGS } from "@repo/shared/data/buildings";
import { Hex } from "@repo/shared/data/hex_map";
import { Nation } from "@repo/shared/data/nations";
import { findBuildingNameByCategory, getBuilding } from "@repo/shared/helpers/buildings";

export function calculateOptimisticGold(
  mapHexes: Hex[],
  buildBuildings: newBuilding[],
  buildings: Building[],
  playerNation: Nation | null
) {
  let totalCost = 0;
  for (const building of buildBuildings) {
    const hex = mapHexes?.find((h) => h.id === building.hexId);
    if (!hex) continue;
    const existingLevel = hex.buildingId
      ? (getBuilding({ buildings, id: hex.buildingId })?.level ?? 0)
      : 0;
    const totalLevel = existingLevel + building.levelsToUpgrade;
    const name = findBuildingNameByCategory({
      buildingCategory: building.buildingType,
      level: totalLevel,
    });
    const cost = BUILDINGS[name].buildCost;
    totalCost += cost;
  }
  return playerNation?.gold ? playerNation.gold - totalCost : 0;
}
