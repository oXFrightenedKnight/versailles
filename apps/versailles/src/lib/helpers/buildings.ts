import { BuildModeType } from "@/lib/types/game";
import { Building, Hex } from "@repo/shared";
import {
  BUILDINGS_CATEGORY,
  getBuildingConfig,
  ConsumedResource,
  buildingCategories,
} from "@repo/shared/buildings";
import { BASE_RESOURCE } from "@repo/shared/resources";
import { typedEntries } from "@repo/shared/utils";
import { ContractProjection } from "../UI/mergeData/contracts/types";

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

  return buildingCategories.map((c) => {
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
  return buildingCategories.includes(value as BUILDINGS_CATEGORY);
}

export function getBuildingCost(type: BUILDINGS_CATEGORY, level: number) {
  const config = getBuildingConfig({ category: type, level });

  return config ? config.buildCost : 0;
}

// returns the amount of resource a building need for 100% efficiency
export function calcOptimisticResourceShortage(
  contracts: ContractProjection[],
  resource: BASE_RESOURCE,
  toBuilding: Building
) {
  const config = getBuildingConfig(toBuilding);

  const needed = config?.consuming?.[resource]?.amount ?? 0;

  const imported = contracts.reduce(
    (acc, c) =>
      c.toBuildingId === toBuilding.id && c.resource === c.resource ? acc + c.amount : acc,
    0
  );

  return Math.max(0, needed - imported);
}

export function calculateContractAmount(
  contracts: ContractProjection[],
  fromBuilding: Building,
  toBuilding: Building,
  resource: BASE_RESOURCE
) {
  const needed = calcOptimisticResourceShortage(contracts, resource, toBuilding);

  const available = fromBuilding.availableResources[resource] ?? 0;

  return Math.max(0, Math.min(needed, available));
}

export function getResourceEfficiencyMap(
  consumption: Partial<Record<"wheat" | "wood", ConsumedResource>>,
  importedMap: Map<"wheat" | "wood", number>
) {
  const totalWeight = typedEntries(consumption ?? {}).reduce(
    (acc, [_, c]) => (c ? acc + c.weight : acc),
    0
  );
  const efficiencyMap = new Map(
    typedEntries(consumption).flatMap(([r, c]) => {
      if (!c || c.amount <= 0 || totalWeight <= 0) return [];

      const needed = c.amount;
      const weight = c.weight;

      const imported = importedMap.get(r) ?? 0;

      return [[r, (imported / needed) * (weight / totalWeight)]];
    })
  );

  return efficiencyMap;
}
