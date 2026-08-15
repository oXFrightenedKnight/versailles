import {
  Building,
  BuildingConfig,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  BuildingType,
  topLevelsByCategory,
} from "#data/buildings";
import { SupplyContract } from "#data/contracts";
import { Hex } from "#data/hex_map";
import { BASE_RESOURCE } from "#data/resources";
import { typedEntries } from "./tsHelpers";

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

export function calculateNeededResource(
  toBuilding: Building,
  resource: BASE_RESOURCE,
  contracts: SupplyContract[]
) {
  const importing = contracts
    .filter((c) => c.toBuildingId === toBuilding.id && c.resource === resource)
    .reduce((acc, c) => acc + c.amount, 0);

  const config = getBuildingConfig(toBuilding);
  const required = config?.consuming?.[resource]?.amount ?? 0;

  const needed = Math.max(0, required - importing);
  return needed;
}

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
