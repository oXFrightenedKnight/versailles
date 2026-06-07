import {
  axialToCube,
  Building,
  BUILDINGS,
  cubeDistance,
  estimateConsumption,
  findBuildingNameByCategory,
  Hex,
  Nation,
  RESOURCES,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { GameCtx } from "../../../trpc";
import { calculateResourceOutput } from "../../buildings";
import { WorldAnalysis } from "../types/analyze";
import { AIPlanningState } from "./planning/types";

export function getHexesWithRoads(ctx: GameCtx, hexAxialMap: Map<string, Hex>) {
  const hexesWithRoads = new Set<number>();

  for (const road of ctx.roads) {
    for (const point of road.points) {
      const hex = hexAxialMap.get(`${point.q},${point.r}`);
      if (hex) hexesWithRoads.add(hex.id);
    }
  }
  return hexesWithRoads;
}

export function getBuildingsByIdMap(ctx: GameCtx) {
  return new Map(ctx.buildings.map((b) => [b.id, b]));
}

// returns all buildings in given list of hexes
export function getHexesBuildings(
  hexes: Hex[],
  buildingsById: Map<string, Building>,
  planning?: AIPlanningState
) {
  return hexes
    .map((h) => (h.buildingId ? buildingsById.get(h.buildingId) : undefined))
    .filter((b): b is Building => b !== undefined);
}

export function getResourcePrediction(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
) {
  const buildingIdMap = getBuildingsByIdMap(ctx);

  const constructingLevels = new Map(analysis.selfData.constructing.map((c) => [c.hexId, c]));

  const totalResourceConsumed: Partial<Record<RESOURCES, number>> = {};
  const totalResourceProduced: Partial<Record<RESOURCES, number>> = {};

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
  totalResourceConsumed: Partial<Record<RESOURCES, number>>;
  totalResourceProduced: Partial<Record<RESOURCES, number>>;
}) {
  const shortage: Partial<Record<RESOURCES, number>> = {};
  for (const [resource, amount] of typedEntries(prediction.totalResourceConsumed)) {
    if (amount === undefined) continue;
    const diff = prediction.totalResourceProduced[resource] ?? 0 - amount;
    shortage[resource] = shortage[resource] ?? 0 + diff;
  }

  return shortage;
}

// finds closest hex to starting hex within given array of hexes and returns [hexId, distance]
export function findClosestHexFromHexes(
  ctx: GameCtx,
  selectedHexes: number[],
  hex: Hex,
  hexIdMap?: Map<number, Hex>
) {
  const hexIdMaps = hexIdMap ? hexIdMap : new Map<number, Hex>(ctx.mapHexes.map((h) => [h.id, h]));
  const frontlinesHexIds = new Set(selectedHexes);

  const distanceToHex: Record<number, number> = {}; // hexId: number
  for (const hexId of frontlinesHexIds) {
    const frontLineHex = hexIdMaps.get(hexId);
    if (!frontLineHex) continue;

    const cubeA = axialToCube(frontLineHex.q, frontLineHex.r);
    const cubeB = axialToCube(hex.q, hex.r);
    const dist = cubeDistance(cubeA, cubeB);
    distanceToHex[hex.id] = dist;
  }

  // sort from highest to lowest
  const closestEntry = Object.entries(distanceToHex)
    .sort(([, dist1], [, dist2]) => dist1 - dist2)
    .at(0);

  if (!closestEntry) return null;

  const [hexId, dist] = closestEntry;

  return { hexId: Number(hexId), dist }; // [hexId, distance]
}
