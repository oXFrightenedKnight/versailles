import {
  Building,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  BuildingType,
  topLevelsByCategory,
} from "#data/buildings";
import { Hex } from "#data/hex_map";

export function findBuildingNameByCategory({
  buildingCategory,
  level,
}: {
  buildingCategory: BUILDINGS_CATEGORY;
  level: number;
}) {
  return Object.entries(BUILDINGS).find(
    ([key, value]) => value.category === buildingCategory && value.level === level
  )?.[0] as BuildingType;
}

export function findBuildingDataByCategory({
  buildingCategory,
  level,
}: {
  buildingCategory: BUILDINGS_CATEGORY;
  level: number;
}) {
  return Object.entries(BUILDINGS).find(
    ([key, value]) => value.category === buildingCategory && value.level === level
  )?.[1];
}

export function createBuildingMap() {
  // create a map to avoid O(n) lookup
  const BUILDINGS_BY_CATEGORY_LEVEL = new Map<
    string,
    { name: BuildingType; data: (typeof BUILDINGS)[BuildingType] }
  >();

  // add every building to map
  for (const [name, data] of Object.entries(BUILDINGS)) {
    const key = `${data.category}_${data.level}`; // create a key like CIVILIAN_1
    BUILDINGS_BY_CATEGORY_LEVEL.set(key, {
      name: name as BuildingType,
      data,
    });
  }
  return BUILDINGS_BY_CATEGORY_LEVEL;
}

export function getBuilding({ buildings, id }: { buildings: Building[]; id: string }) {
  return buildings.find((b) => b.id === id);
}

export function hasBuilding(key: string, mapHexes: Hex[]) {
  const point = key.split(",");

  const hex = mapHexes.find((hex) => hex.q === Number(point[0]) && hex.r === Number(point[1]));
  return hex?.buildingId ? true : false;
}

export function getTopCategoryLevel(category: BUILDINGS_CATEGORY) {
  return topLevelsByCategory.find((c) => c.category === category)?.level ?? 0;
}
