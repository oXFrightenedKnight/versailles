import { getBuildingHexMap, getNationBuildings } from "../../buildings/queries.js";
import { getBuildingContractsMap } from "../../contracts.js";
import { GameCtx } from "#trpc/index.js";
import { BASE_RESOURCE, baseResources, Building, Nation } from "@repo/shared";

// returns available building-owned resource in producing buildings
export function getProducingBuildings(ctx: GameCtx, nation: Nation) {
  const availableByBuilding: {
    hexId: number;
    buildingId: string;
    available: Record<BASE_RESOURCE, number>;
  }[] = [];

  const buildingContractsMap = getBuildingContractsMap(ctx);
  const buildingHexMap = getBuildingHexMap(ctx);

  const nationBuildings = getNationBuildings(ctx, nation);

  for (const building of nationBuildings) {
    const available = Object.fromEntries([...getAvailableBuildingResources(building)]) as Record<
      BASE_RESOURCE,
      number
    >;

    const hex = buildingHexMap.get(building.id);
    if (!hex) continue;

    const buildingContracts = buildingContractsMap.get(building.id) ?? [];

    for (const contract of buildingContracts) {
      const curr = available[contract.resource];

      available[contract.resource] = Math.max(0, curr - contract.amount);
    }

    availableByBuilding.push({
      hexId: hex.id,
      buildingId: building.id,
      available,
    });
  }

  return availableByBuilding;
}

function getAvailableBuildingResources(building: Building) {
  return new Map(baseResources.map((r) => [r, building.availableResources[r] ?? 0]));
}
