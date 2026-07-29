import { BuildingProductionNode } from "#services/ai/actions/road/types.js";
import { WorldAnalysis } from "#services/ai/analysis/types.js";
import { getProducingBuildings } from "#services/ai/world/resources.js";
import { GameCtx } from "#trpc/index.js";
import {
  Nation,
  BASE_RESOURCE,
  PRODUCIBLE_RESOURCE,
  Building,
  findBuildingNameByCategory,
  estimateConsumption,
  BUILDINGS,
  NATION_RESOURCE,
  isResource,
  isNationResource,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { AIPlanningState } from "../types";
import { getBuildingsByIdMap } from "#services/buildings/queries.js";
import { calculateResourceOutput } from "#services/resources/production.js";

// returns estimated producible resource production and consumption
export function getResourcePrediction(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
) {
  const buildingIdMap = getBuildingsByIdMap(ctx.buildings);

  const constructingLevels = new Map(analysis.selfData.constructing.map((c) => [c.hexId, c]));

  const totalResourceConsumed: Partial<Record<BASE_RESOURCE, number>> = {};
  const totalResourceProduced: Partial<Record<PRODUCIBLE_RESOURCE, number>> = {};

  for (const hex of ctx.mapHexes) {
    if (hex.owner !== nation.id) continue;
    if (!hex.buildingId) continue;

    // existing building in hex
    const existing = buildingIdMap.get(hex.buildingId);
    const existingLevel = existing?.level ?? 0;

    // building in progress
    const inProgress = constructingLevels.get(hex.id);
    const levelsInProgress = inProgress?.levels ?? 0;

    // ai planning to build
    const planned = planning.intendedBuildings.get(hex.id);
    const plannedLevels = planned?.levels ?? 0;

    const estCategory = existing?.category ?? inProgress?.category ?? planned?.category;
    const estLevel = existingLevel + levelsInProgress + plannedLevels;

    if (!estCategory || !estLevel) continue;

    const estimatedBuilding: Building = {
      id: crypto.randomUUID(),
      category: estCategory,
      level: estLevel,
      statistics: {
        produced: [],
        consumed: [],
      },
    };

    const name = findBuildingNameByCategory({
      buildingCategory: estimatedBuilding.category,
      level: estimatedBuilding.level,
    });

    // calculate consumed resources
    const consume = estimateConsumption({ building: estimatedBuilding, mapHexes: ctx.mapHexes });
    if (consume) {
      for (const [res, amount] of typedEntries(consume)) {
        if (!amount) continue;
        totalResourceConsumed[res] = (totalResourceConsumed[res] ?? 0) + amount;
      }
    }

    // calculate produced resources
    const producing = BUILDINGS[name].producing ?? [];
    for (const res of producing) {
      const estProduced = calculateResourceOutput(hex, res);
      totalResourceProduced[res] = (totalResourceProduced[res] ?? 0) + estProduced;
    }
  }

  return { totalResourceConsumed, totalResourceProduced };
}

export function getResourceShortage(prediction: {
  totalResourceConsumed: Partial<Record<BASE_RESOURCE, number>>;
  totalResourceProduced: Partial<Record<PRODUCIBLE_RESOURCE, number>>;
}) {
  const shortage: Partial<Record<BASE_RESOURCE, number>> = {};
  for (const [resource, amount] of typedEntries(prediction.totalResourceConsumed)) {
    if (amount === undefined) continue;
    const diff = (prediction.totalResourceProduced[resource] ?? 0) - amount;
    shortage[resource] = shortage[resource] ?? 0 + diff;
  }

  return shortage;
}

export function getNationResourcePrediction(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
) {
  const prediction = getResourcePrediction(ctx, analysis, planning, nation);

  const nationResMap = new Map<NATION_RESOURCE, number>();
  for (const [r, amount] of typedEntries(prediction.totalResourceProduced)) {
    if (isResource(r) && isNationResource(r) && amount && amount > 0) {
      nationResMap.set(r, amount);
    }
  }

  return nationResMap;
}

// returns all resources available by producing buildings including planning
export function availableResourcesInBuildings(
  ctx: GameCtx,
  planning: AIPlanningState,
  nation: Nation
) {
  const producing = getProducingBuildings(ctx, nation);
  console.log("producing in buildings (no plan):", producing);

  const updated: BuildingProductionNode[] = [];
  for (const building of producing) {
    const occupied = planning.occupiedResources.get(building.buildingId);
    console.log(`occupied at ${building.hexId}:`, occupied);

    if (!occupied) {
      updated.push(building);
      continue;
    }

    const resources: Partial<Record<BASE_RESOURCE, number>> = {};

    typedEntries(building.available).forEach(([res, available]) => {
      if (!available) return;

      const occupiedRes = occupied[res] ?? 0;
      const freeRes = Math.max(available - occupiedRes, 0);
      resources[res] = freeRes;
    });

    updated.push({ ...building, available: resources });
    console.log(`final available resources at ${building.hexId}:`, resources);
  }

  return updated;
}
