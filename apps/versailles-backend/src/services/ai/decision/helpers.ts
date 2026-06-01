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
import { SAFETY_CF } from "../types/intent";

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

export function getHexesBuildings(hexes: Hex[], buildingsById: Map<string, Building>) {
  return hexes
    .map((h) => (h.buildingId ? buildingsById.get(h.buildingId) : undefined))
    .filter((b): b is Building => b !== undefined);
}

export function getResourcePrediction(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const hexByBuildingId = new Map(
    ctx.mapHexes.filter((h) => h.buildingId).map((h) => [h.buildingId!, h])
  );

  const constructingLevels = new Map(
    analysis.selfData.constructing.map((c) => [c.hexId, c.levels])
  );

  const totalResourceConsumed: Partial<Record<RESOURCES, number>> = {};
  const totalResourceProduced: Partial<Record<RESOURCES, number>> = {};

  for (const building of ctx.buildings) {
    const hex = hexByBuildingId.get(building.id);
    if (!hex) continue;
    if (hex.owner !== nation.id) continue;

    const levelsInProgress = constructingLevels.get(hex.id) ?? 0;

    const estimatedBuilding = {
      ...building,
      level: building.level + levelsInProgress,
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

export function getAITrainingAmount(ctx: GameCtx, nation: Nation, analysis: WorldAnalysis) {
  let amount = 0;
  const add = (value: number) => {
    amount = Math.min(nation.manpower, amount + value, 0);
  };

  const nationsAtWarSet = new Set(nation.atWar);

  // 1. Add amount based on the combined army of neighbors at war
  // Army in fighting hexes + on border
  const fightingArmies = analysis.worldData.fightingHexes
    .map((h) => h.enemyArmy)
    .reduce((acc, army) => acc + army, 0);
  const borderArmies = analysis.worldData.borderingHexes
    .filter((h) => h.owner && nationsAtWarSet.has(h.owner))
    .flatMap((h) => h.army.map((a) => a.amount))
    .reduce((acc, amount) => acc + amount, 0);
  const combinedVisibleEnemyArmy = fightingArmies + borderArmies;
  const totalReservedNationArmy =
    analysis.selfData.totalArmy +
    analysis.selfData.trainingArmy.reduce((acc, obj) => acc + obj.amount, 0);
  const difference = Math.max(0, combinedVisibleEnemyArmy * SAFETY_CF - totalReservedNationArmy);
  add(difference);

  // 2. AI should keep ratio of trained to reserved of roughly 1:1 during peace
  if (nation.atWar.length === 0) {
    const reservedManpower = nation.manpower;
    const untrainedDiff = (reservedManpower - totalReservedNationArmy) / 2;
    add(untrainedDiff);
  }

  // 3. Train based on strongest neighbor strength ratio
  // IN PROGRESS

  return amount;
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

export function getDistanceScore({
  max,
  softness,
  distance,
}: {
  max: number;
  softness: number;
  distance: number;
}) {
  return max / (distance + softness);
}

export function getDistanceFalloff(distance: number, maxRelevantDistance: number) {
  return Math.max(0, 1 - distance / maxRelevantDistance);
}
