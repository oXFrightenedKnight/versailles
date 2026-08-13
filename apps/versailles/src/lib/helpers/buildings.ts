import { Building, building_categoires, BUILDINGS_CATEGORY } from "@repo/shared/data/buildings";
import { Hex } from "@repo/shared/data/hex_map";
import { BuildModeType } from "../types/game";
import { BASE_RESOURCE, getBuildingConfig } from "@repo/shared";
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
