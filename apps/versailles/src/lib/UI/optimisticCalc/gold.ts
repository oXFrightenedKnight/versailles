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

    for (let level = 1; level < building.levelsToUpgrade + 1; level++) {
      const totalLevel = existingLevel + level;

      const name = findBuildingNameByCategory({
        buildingCategory: building.buildingType,
        level: totalLevel,
      });

      const cost = BUILDINGS[name] ? BUILDINGS[name].buildCost : 0;
      if (cost) {
        totalCost += cost;
      }
    }
  }
  return playerNation?.gold !== undefined ? playerNation.gold - totalCost : 0;
}

export function hasEnoughGold(effectiveGold: number, cost: number) {
  return effectiveGold >= cost;
}
