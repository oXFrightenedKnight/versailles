import {
  Building,
  building_categoires,
  BUILDINGS,
  BUILDINGS_CATEGORY,
} from "@repo/shared/data/buildings";
import { Hex } from "@repo/shared/data/hex_map";
import { BuildModeType } from "../types/game";
import { findBuildingNameByCategory } from "@repo/shared";

// allows to additionally filter by nationId if provided with nationId and hexes
export function allBuildingsPerCategory(
  buildings: Building[],
  nationId?: string,
  mapHexes?: Hex[]
) {
  // accepts strings type of 'buildingId,nationId'
  const ownerBuildingHexMap = new Map<string, Hex>(
    mapHexes?.map((h) => [`${h.buildingId},${h.owner}`, h])
  );

  return building_categoires.map((c) => {
    const category_buildings = buildings.filter((b) => {
      if (b.category === c) {
        if (nationId && mapHexes) {
          const hex = ownerBuildingHexMap.get(`${b.id},${nationId}`);
          if (hex) return b;
        } else {
          return b;
        }
      }
    });

    return { category: c, count: category_buildings.length };
  });
}

export function isBuildingCategory(value: BuildModeType): value is BUILDINGS_CATEGORY {
  return building_categoires.includes(value as BUILDINGS_CATEGORY);
}

export function getBuildingCost(type: BUILDINGS_CATEGORY, level: number) {
  const name = findBuildingNameByCategory({ buildingCategory: type, level });

  return BUILDINGS[name] ? BUILDINGS[name].buildCost : 0;
}
