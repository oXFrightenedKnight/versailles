import {
  axialToCube,
  Building,
  BUILDINGS,
  cubeDistance,
  estimateConsumption,
  findBuildingNameByCategory,
  findNeighbors,
  Hex,
  MAP_RADIUS,
  Nation,
  RESOURCES,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { GameCtx } from "../../../trpc";
import { calculateResourceOutput } from "../../buildings";
import { WorldAnalysis } from "../types/analyze";
import { MoveArmyTable, SAFETY_CF } from "../types/intent";
import { getHexAxialMap, getHexIdMap, getNationArmyFromHex } from "../../map";
import { getNationArmy } from "../../genNations";

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

export function calculateFrontlineDistances(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  hex: Hex,
  hexIdMap: Map<number, Hex>
) {
  const frontlineDistance: Record<string, number> = {};
  for (const frontline of analysis.worldData.currentFrontlines) {
    const distObj = findClosestHexFromHexes(ctx, frontline.hexIds, hex, hexIdMap);
    if (!distObj) continue;
    frontlineDistance[frontline.nationId] = distObj.dist;
  }

  return frontlineDistance;
}

export function scoreDistanceDelta(
  currentDistance: number,
  nextDistance: number,
  mult: number,
  customPower?: number
) {
  const delta = currentDistance - nextDistance;

  if (delta <= 0) return -5;

  const power = customPower ? customPower : 2;
  return Math.pow(delta, power) * mult;
}

function calcBorderDist(ctx: GameCtx, analysis: WorldAnalysis, hex: Hex) {
  const hexIdMap = getHexIdMap(ctx);
  const allBordering = analysis.worldData.currentBorders.map((b) => hexIdMap.get(b.hexId));

  const borderDist: { hexId: number; dist: number }[] = [];
  for (const borderHex of allBordering) {
    if (!borderHex) continue;

    const startDist = axialToCube(hex.q, hex.r);
    const endDist = axialToCube(borderHex.q, borderHex.r);
    const dist = cubeDistance(startDist, endDist);
    borderDist.push({ hexId: borderHex.id, dist });
  }

  return borderDist;
}

// score based on general ai army movement rules
// decides score for border hexes to which ai would aim to
// move its army towards. Hexes get different score based
// on their state
export function scoreBorderHexes(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation, hex: Hex) {
  const borderDist = calcBorderDist(ctx, analysis, hex);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);

  const fightingHexesMap = new Map(analysis.worldData.fightingHexes.map((fh) => [fh.hexId, fh]));

  // map over nation hexes that border other hexes and calculate their score
  const borderScore: { hexId: number; score: number; dist: number }[] = [];
  for (const borderObj of borderDist) {
    const hex = hexIdMap.get(borderObj.hexId);
    if (!hex) continue;
    let score = 0;

    // 1. Half-score based on enemy army ratio
    const neighborHexes = findNeighbors(hex, ctx.mapHexes, axialMap);
    const enemyNeighborHexes = neighborHexes.filter((h) => h.owner && h.owner !== nation.id);
    const totalArmyAtHexBorder = enemyNeighborHexes.reduce((acc, h) => {
      return getNationArmyFromHex(h, h.owner!) + acc;
    }, 0);
    const totalNationArmyInHex = getNationArmyFromHex(hex, nation.id);
    // buff if ratio is below 1:1 on border
    score += getEnemyPressureScore(totalNationArmyInHex, totalArmyAtHexBorder);

    // 2. Score if is fighting hex and losing
    const fightingHex = fightingHexesMap.get(hex.id);
    if (fightingHex) {
      score +=
        getEnemyPressureScore(fightingHex.ownArmy, fightingHex.enemyArmy) *
        (1 + fightingHex.hexPriority);
    }

    // MOVE this part out
    // 3. Score based on the distance from original hex to border hex
    const base = 20;
    const falloff = getDistanceFalloff(borderObj.dist, MAP_RADIUS * 1.3);
    score += base * (1 + falloff);

    borderScore.push({ hexId: hex.id, score, dist: borderObj.dist });
  }
  return borderScore;
}
function getEnemyPressureScore(
  nationArmy: number,
  enemyArmy: number,
  mult?: number,
  soft?: number
) {
  const ratio = enemyArmy > 0 ? enemyArmy / Math.max(nationArmy, 1) : 1.1; // force ai to move to border
  const pressure = Math.max(0, ratio - 1);

  const multiplier = mult ? mult : 60;
  const softness = soft ? soft : 1.5;

  return multiplier * (pressure / (pressure + softness));
}
export function calcHexDist(hex1: Hex, hex2: Hex) {
  const dist1 = axialToCube(hex1.q, hex1.r);
  const dist2 = axialToCube(hex2.q, hex2.r);
  return cubeDistance(dist1, dist2);
}

export function getBestScoreBorderHex(
  borderHexScore: {
    hexId: number;
    score: number;
    dist: number;
  }[],
  hexIdMap: Map<number, Hex>,
  mode: "MOVING" | "AT_BORDER"
) {
  const appliedDistanceBorderScore = borderHexScore.map((obj) => {
    const base = 40;
    const maxRelevantDistance = mode === "MOVING" ? MAP_RADIUS * 1.3 : MAP_RADIUS / 1.5;
    const falloff = getDistanceFalloff(obj.dist, maxRelevantDistance);
    const addScore = (1 + falloff) * base;
    return { ...obj, score: obj.score + addScore };
  });
  const bestHexScore = appliedDistanceBorderScore.sort(
    ({ score: score1 }, { score: score2 }) => score2 - score1
  )[0];
  return hexIdMap.get(bestHexScore.hexId);
}
