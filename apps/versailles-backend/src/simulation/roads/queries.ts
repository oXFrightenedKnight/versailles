import { getTrimmedRoad } from "#simulation/roads/geometry";
import { GameCtx } from "#trpc";
import { getHexAxialMap } from "@repo/shared/map";
import { Point, RoadPoint } from "@repo/shared/roads";

// return roads with points that exist only on nation's owned hexes
export function getNationRoads(ctx: GameCtx, nationId: string): Point[][] {
  const axialMap = getHexAxialMap(ctx);

  const trimmedRoads: Point[][] = [];

  for (const road of ctx.roads) {
    const pointMap = new Map<string, RoadPoint>(road.points.map((p) => [`${p.q},${p.r}`, p]));
    const removePoints = [...pointMap].flatMap(([key, p]) => {
      const hex = axialMap.get(key);
      if (!hex) return [];
      if (hex.owner !== nationId) return [p];

      return [];
    });

    const trimmed = getTrimmedRoad(road.points, removePoints);

    trimmed.forEach((points) => trimmedRoads.push(points));
  }

  return trimmedRoads;
}
export function getRoadSegments(ctx: GameCtx) {
  const segments: Point[][] = [];

  for (const road of ctx.roads) {
    segments.push(road.points);
  }

  return segments;
}
