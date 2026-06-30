import {
  BASE_ROAD_COST,
  calculateRoadCost,
  findNeighbors,
  hasSegment,
  Hex,
  Nation,
  Road,
} from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { subtractGold } from "./genNations.js";
import { getHexAxialMap } from "./map.js";

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

    const cost = calculateRoadCost(road.points.length);
    if (subtractGold(gameCtx, nation.id, cost)) {
      // add road to approved roads for building
      roads.push(road);
    }
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
}

export function cancelRoadBuild(ctx: GameCtx, cancelIds: string[], nation: Nation) {
  const roadMap = new Map(ctx.roads.filter((r) => r.constructing).map((r) => [r.id, r]));

  for (const id of cancelIds) {
    const road = roadMap.get(id);

    if (!road || !road.constructing) continue;
    if (road.constructing.owner !== nation.id) continue;

    // cancel building road further
    const finishedPoints = road.points.filter((p) => !p.isConstructing);
    const unfinishedAmount = road.points.length - finishedPoints.length;
    road.points = finishedPoints;
    road.constructing = null;

    // return cost
    nation.gold += unfinishedAmount * BASE_ROAD_COST;

    // delete road if it's 1 or fewer points long
    if (road.points.length <= 1) {
      const idx = ctx.roads.indexOf(road);

      if (idx !== -1) {
        ctx.roads.splice(idx, 1);
      }

      // return gold for that point
      nation.gold += BASE_ROAD_COST;
    }
  }
}

// return roads with points that exist only on nation's owned hexes
export type RoadPoint = { q: number; r: number; d1: number; d2: number; isConstructing: boolean };
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

// this function REMOVES specific points of the road and returns new segments
function getTrimmedRoad(original: Point[], removePoints: Point[]): Point[][] {
  const remove = new Set(removePoints.map((p) => pointKey(p)));

  const result: Set<Point[]> = new Set();
  let pointStart = 0;

  for (let i = 0; i < original.length - 1; i++) {
    const a = original[i];

    if (remove.has(pointKey(a))) {
      const segment = original.slice(pointStart, i);

      if (segment.length >= 2) {
        result.add(segment);
      }

      pointStart = i + 1;
    }
  }

  const finalSegment = original.slice(pointStart);

  if (finalSegment.length >= 2) {
    result.add(finalSegment);
  }

  return [...result];
}

// Road edge check
export type Point = { q: number; r: number };
export function pointKey(point: Point) {
  return `${point.q},${point.r}`;
}
export function splitKey(key: string) {
  const coords = key.split(",");
  if (coords.length !== 2) return null;

  return { q: coords[0], r: coords[1] };
}

export function edgeKey(a: Point, b: Point) {
  const ak = pointKey(a);
  const bk = pointKey(b);

  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function getRoadEdges(points: Point[]) {
  const edges = new Set<string>();

  for (let i = 0; i < points.length - 1; i++) {
    edges.add(edgeKey(points[i], points[i + 1]));
  }

  return edges;
}

// get shared segments between two given roads
export function getSharedRoadEdges(a: Point[], b: Point[]) {
  const shared: Set<string> = new Set();
  const aEdges = getRoadEdges(a);

  for (let i = 0; i < b.length - 1; i++) {
    const key = edgeKey(b[i], b[i + 1]);
    if (aEdges.has(key)) {
      shared.add(key);
    }
  }

  return shared;
}
// this function SLICES a road based on edges, and returns segments without removing any points
export function getSlicedRoadSegments(path: Point[], overlapEdges: Set<string>) {
  const result: Point[][] = [];
  let segmentStart = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];

    if (overlapEdges.has(edgeKey(a, b))) {
      const segment = path.slice(segmentStart, i + 1);

      if (segment.length >= 2) {
        result.push(segment);
      }

      segmentStart = i + 1;
    }
  }

  const finalSegment = path.slice(segmentStart);

  if (finalSegment.length >= 2) {
    result.push(finalSegment);
  }

  return result;
}
