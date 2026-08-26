import { Hex } from "../map/types";
import { BASE_RESOURCE } from "../resources/types";
import { typedEntries } from "../utils/object";
import { BUILDINGS, topLevelsByCategory } from "./config";
import { BUILDINGS_CATEGORY, BuildingType, Building } from "./types";

export function getBuildingName(category: BUILDINGS_CATEGORY, level: number) {
  return Object.entries(BUILDINGS).find(
    ([key, value]) => value.category === category && value.level === level
  )?.[0] as BuildingType | undefined;
}

export function getBuildingData(buildingCategory: BUILDINGS_CATEGORY, level: number) {
  return Object.entries(BUILDINGS).find(
    ([key, value]) => value.category === buildingCategory && value.level === level
  )?.[1];
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

export function getBuildingConfig({
  category,
  level,
}: {
  category: BUILDINGS_CATEGORY;
  level: number;
}) {
  const name = getBuildingName(category, level);
  return name ? BUILDINGS[name] : undefined;
}

export function getBuildingsByIdMap(buildings: Building[]) {
  return new Map(buildings.map((b) => [b.id, b]));
}

export function getAvailableByBuildingMap(buildings: Building[]) {
  return new Map<string, Partial<Record<BASE_RESOURCE, number>>>(
    buildings.map((b) => [b.id, b.availableResources])
  );
}

export function getRequiredByBuildingMap(buildings: Building[]) {
  const map = new Map<string, Partial<Record<BASE_RESOURCE, number>>>();

  for (const building of buildings) {
    const config = getBuildingConfig(building);
    if (!config || !config.consuming) continue;

    const required: Partial<Record<BASE_RESOURCE, number>> = {};

    for (const [res, consume] of typedEntries(config.consuming)) {
      if (consume?.amount) {
        required[res] = consume.amount;
      }
    }

    map.set(building.id, required);
  }

  return map;
}
