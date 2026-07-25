import { GameCtx } from "#trpc/index.js";
import { axialToCube, cubeDistance, Hex, Nation } from "@repo/shared";
import { Frontline } from "../analysis/types";
import { getBorderHexes } from "#services/map.js";

export function getFrontlines(ctx: GameCtx, nation: Nation) {
  const nationIdsAtWar = new Set(nation.atWar);

  const frontlines: Frontline[] = [];

  for (const enemyId of nationIdsAtWar) {
    const borderingNation = getBorderHexes(ctx, enemyId) ?? [];
    const enemyBorderHexes = borderingNation.filter((hex) => hex.owner === nation.id);
    if (enemyBorderHexes.length < 1) continue;
    frontlines.push({
      nationId: enemyId,
      hexIds: enemyBorderHexes.map((h) => h.id),
    });
  }
  return frontlines;
}

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
