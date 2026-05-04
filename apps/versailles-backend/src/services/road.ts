import { findNeighbors, hasSegment, Hex, Nation, Road } from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { recalculateContractsPaths } from "./contracts.js";

export function buildNationRoads({
  gameCtx,
  buildRoads,
  nationId,
}: {
  gameCtx: GameCtx;
  buildRoads: Road[];
  nationId: string;
}) {
  const { mapHexes, nations, buildings, roads } = gameCtx;

  // create a set of hex coordinates and a map of hex maps
  const hexCoorSet = new Set<string>(mapHexes.map((hex) => `${hex.q},${hex.r}`));
  const nation = nations.find((n) => n.id === nationId);
  if (!nation) return;

  const hexMap = new Map<string, Hex>();
  for (const hex of mapHexes) {
    hexMap.set(`${hex.q},${hex.r}`, hex);
  }

  // add client built roads to road array
  outer: for (const road of buildRoads) {
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
          if (hasSegment(r, point, nextPoint)) {
            continue outer;
          }
        }
      }
    }

    // add construction status
    if (!road.constructing) {
      road.constructing = { progress: 0, owner: nation.id };
    }

    // add road to approved roads for building
    roads.push(road);
  }

  // add progress to every road that is currently constructing
  for (const road of roads) {
    if (!road.constructing) continue;
    const points = road.points;
    const currentPoint = points.find((p) => p.isConstructing); // take first constructing
    if (!currentPoint) continue;

    // if current built point does not belong to construction owner - stop building
    const hexOfPoint = hexMap.get(`${currentPoint.q},${currentPoint.r}`);
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

  // recaulculate contracts
  recalculateContractsPaths(gameCtx);
}

export function cancelRoadBuild(ctx: GameCtx, cancelIds: string[], nation: Nation) {
  const roadMap = new Map(ctx.roads.filter((r) => r.constructing).map((r) => [r.id, r]));

  for (const id of cancelIds) {
    const road = roadMap.get(id);

    if (!road || !road.constructing) continue;
    if (road.constructing.owner !== nation.id) continue;

    // cancel building road further
    road.points = road.points.filter((p) => !p.isConstructing);
    road.constructing = null;
  }
}
