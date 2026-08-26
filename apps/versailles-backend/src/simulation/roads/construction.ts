import { trySpendNationResource, adjustNationResource } from "#simulation/resources/production";
import { GameCtx } from "#trpc";
import { Hex, Nation } from "@repo/shared";
import { ActionOfType } from "@repo/shared/actions";
import { findNeighbors, getHexAxialMap } from "@repo/shared/map";
import { Road, hasSegment, calculateRoadCost, BASE_ROAD_COST } from "@repo/shared/roads";

export function buildNationRoads(
  ctx: GameCtx,
  nationId: string,
  buildRoads: ActionOfType<"road.build">[]
) {
  const { mapHexes, nations, roads } = ctx;

  // create a set of hex coordinates and a map of hex maps
  const hexCoorSet = new Set<string>(mapHexes.map((hex) => `${hex.q},${hex.r}`));
  const nation = nations.find((n) => n.id === nationId);
  if (!nation) return;

  const hexMap = new Map<string, Hex>();
  for (const hex of mapHexes) {
    hexMap.set(`${hex.q},${hex.r}`, hex);
  }

  // add client built roads to road array
  outer: for (const roadAction of buildRoads) {
    const road: Road = {
      id: crypto.randomUUID(),
      points: roadAction.points.map((p) => ({ ...p, isConstructing: true })),
      constructing: null,
    };
    const points = road.points;
    const pointsCoor = points.map((point) => ({ q: point.q, r: point.r }));

    // check if every point is valid
    if (!pointsCoor.every((p) => hexCoorSet.has(`${p.q},${p.r}`)))
      throw new Error("Road coordinates don't match hex coordinates!");

    // apply check to every point
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const hexOfPoint = hexMap.get(`${point.q},${point.r}`);
      if (!hexOfPoint) continue outer;
      const prevPoint = points[i - 1];
      const nextPoint = points[i + 1];
      if (!prevPoint && !nextPoint) {
        continue outer; // also prevents roads that only have one point
      }
      const hexOfPrev = prevPoint ? hexMap.get(`${prevPoint.q},${prevPoint.r}`) : undefined;
      const hexOfNext = nextPoint ? hexMap.get(`${nextPoint.q},${nextPoint.r}`) : undefined;
      if (!hexOfPrev && !hexOfNext) continue outer;

      // --- IF ALL POINTS BORDER ---
      const neighbors = findNeighbors(hexOfPoint, mapHexes);

      // check if either previous or next hex is a neighbor of current hexOfPoint
      let hasNeighbour = false;

      if (hexOfPrev) {
        if (neighbors.includes(hexOfPrev)) {
          hasNeighbour = true;
        }
      }
      if (hexOfNext) {
        if (neighbors.includes(hexOfNext)) {
          hasNeighbour = true;
        }
      }

      if (!hasNeighbour) {
        continue outer; // continue if any point of the road is not neighboring anyone
      }

      // --- CHECK OTHER ROADS FOR SAME PATTERN OF TWO POINTS ---
      if (nextPoint) {
        const roadsWithoutCurr = roads.filter((r) => r.id !== road.id);
        for (const r of roadsWithoutCurr) {
          if (hasSegment(r.points, point, nextPoint)) {
            continue outer;
          }
        }
      }
    }

    // add construction status
    if (!road.constructing) {
      road.constructing = { progress: 0, owner: nation.id };
    }

    const cost = calculateRoadCost(road.points.length);

    const result = trySpendNationResource(nation, "gold", cost);
    if (result.ok) {
      // add road to approved roads for building
      ctx.roads.push(road);
    }
  }
}

export function cancelRoadBuild(
  ctx: GameCtx,
  cancelActions: ActionOfType<"road.cancel">[],
  nation: Nation
) {
  const roadMap = new Map(ctx.roads.filter((r) => r.constructing).map((r) => [r.id, r]));

  for (const { roadId: id } of cancelActions) {
    const road = roadMap.get(id);

    if (!road || !road.constructing) continue;
    if (road.constructing.owner !== nation.id) continue;

    // cancel building road further
    const finishedPoints = road.points.filter((p) => !p.isConstructing);
    const unfinishedAmount = road.points.length - finishedPoints.length;
    road.points = finishedPoints;
    road.constructing = null;

    const refund = calculateRoadCost(unfinishedAmount);

    // return cost
    adjustNationResource(nation, "gold", refund);

    // delete road if it's 1 or fewer points long
    if (road.points.length <= 1) {
      const idx = ctx.roads.indexOf(road);

      if (idx !== -1) {
        ctx.roads.splice(idx, 1);
      }

      // return gold for that point
      adjustNationResource(nation, "gold", BASE_ROAD_COST);
    }
  }
}

export function progressRoadConstruction(ctx: GameCtx) {
  const axialMap = getHexAxialMap(ctx);
  // add progress to every road that is currently constructing
  for (const road of ctx.roads) {
    if (!road.constructing) continue;
    const points = road.points;
    const currentPoint = points.find((p) => p.isConstructing); // take first constructing
    if (!currentPoint) continue;

    // if current built point does not belong to construction owner - stop building
    const hexOfPoint = axialMap.get(`${currentPoint.q},${currentPoint.r}`);
    if (!hexOfPoint) continue;

    if (!hexOfPoint.owner || (hexOfPoint.owner && hexOfPoint.owner !== road.constructing.owner)) {
      road.constructing = null;
      road.points = road.points.filter((p) => !p.isConstructing); // filter out road parts that were in construction stage
      continue;
    }

    // add progress
    if (!road.constructing) continue;
    road.constructing.progress++;

    if (road.constructing.progress >= 1) {
      currentPoint.isConstructing = false;

      road.constructing.progress = 0;

      // if no more points left to construct - set constructing status to null
      if (road.points.every((p) => !p.isConstructing)) {
        road.constructing = null;
      }
    }
  }
}
