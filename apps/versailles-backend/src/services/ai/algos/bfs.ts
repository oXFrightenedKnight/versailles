import { findNeighbors, Hex } from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { getHexAxialMap, getHexIdMap } from "../../map";
import { WorldAnalysis } from "../types/analyze";
import { Point, pointKey, splitKey } from "#services/road.js";

export function bfs({
  ctx,
  startHexId,
  allowedHexIds,
  hexIdMap,
  axialMap,
}: {
  ctx: GameCtx;
  startHexId: number;
  allowedHexIds?: number[];
  hexIdMap?: Map<number, Hex>;
  axialMap?: Map<string, Hex>;
}) {
  const newHexIdMap = hexIdMap ?? getHexIdMap(ctx);
  const newAxialMap = axialMap ?? getHexAxialMap(ctx);

  const totalAllowedVisiting = new Set(allowedHexIds ?? [...newHexIdMap.keys()]);

  // <hexId, hexItCameFrom>
  const cameFrom = new Map<number, number | null>();
  cameFrom.set(startHexId, null);
  const queue = [startHexId];

  while (queue.length !== 0) {
    const hexId = queue.shift()!;
    const hex = newHexIdMap.get(hexId);
    if (!hex) continue;

    const neighbors = findNeighbors(hex, ctx.mapHexes, newAxialMap);

    for (const neighbor of neighbors) {
      if (!cameFrom.has(neighbor.id) && totalAllowedVisiting.has(neighbor.id)) {
        cameFrom.set(neighbor.id, hexId);
        queue.push(neighbor.id);
      }
    }
  }
  return cameFrom;
}
// returns path from given hexId to destination hex (border hex) as provided in the map
export function reconstructPath(cameFrom: Map<number, number | null>, targetHexId: number) {
  if (!cameFrom.has(targetHexId)) return null;

  const path: number[] = [];

  let current: number | null = targetHexId;

  while (current !== null) {
    path.push(current);
    current = cameFrom.get(current) ?? null;
  }

  return path;
}

export function getBorderBFSMap(analysis: WorldAnalysis) {
  return new Map(analysis.selfData.borderBFS.map((b) => [b.startHexId, b]));
}

// --- ROAD EDGE SYSTEM ---
export function buildRoadGraph(roadSegments: Point[][]) {
  const graph = new Map<string, Set<string>>();

  const addEdge = (a: Point, b: Point) => {
    const ak = pointKey(a);
    const bk = pointKey(b);

    if (!graph.has(ak)) graph.set(ak, new Set());
    if (!graph.has(bk)) graph.set(bk, new Set());

    graph.get(ak)!.add(bk);
    graph.get(bk)!.add(ak);
  };

  for (const segment of roadSegments) {
    for (let i = 0; i < segment.length - 1; i++) {
      addEdge(segment[i], segment[i + 1]);
    }
  }

  return graph;
}

export function hasRoadPath(graph: Map<string, Set<string>>, start: Point, end: Point) {
  const startKey = pointKey(start);
  const endKey = pointKey(end);

  if (startKey === endKey) return true;
  if (!graph.has(startKey) || !graph.has(endKey)) return false;

  const visited = new Set<string>();
  const queue = [startKey];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === endKey) return true;
    if (visited.has(curr)) continue;

    visited.add(curr);

    for (const next of graph.get(curr) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return false;
}

// returns shortest road path between two buildings
export function buildRoadPath(
  mapHexes: Hex[],
  graph: Map<string, Set<string>>,
  start: Point,
  end: Point
) {
  const startKey = pointKey(start);
  const endKey = pointKey(end);

  if (startKey === endKey) return null;
  if (!graph.has(startKey) || !graph.has(endKey)) return null;

  const cameFrom = new Map<string, string | null>();
  cameFrom.set(startKey, null);

  const queue = [startKey];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === endKey) break;

    for (const next of graph.get(curr) ?? []) {
      if (!cameFrom.has(next)) {
        cameFrom.set(next, curr);
        queue.push(next);
      }
    }
  }

  // reconstruct path
  const path = reconstructRoadPath(mapHexes, cameFrom, endKey);

  return path;
}

function reconstructRoadPath(
  mapHexes: Hex[],
  cameFrom: Map<string, string | null>,
  targetKey: string
) {
  if (!cameFrom.has(targetKey)) return null;

  const path: string[] = [];

  let current: string | null = targetKey;

  while (current !== null) {
    path.push(current);
    current = cameFrom.get(current) ?? null;
  }

  const pointMap = new Map(mapHexes.map((h) => [pointKey({ q: h.q, r: h.r }), { q: h.q, r: h.r }]));

  const pointPath: Point[] = [];
  for (const key of path) {
    const point = pointMap.get(key);
    if (!point) return null;
    pointPath.push(point);
  }

  return pointPath;
}
