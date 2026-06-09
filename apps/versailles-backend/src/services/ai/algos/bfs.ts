import { findNeighbors, Hex } from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { getHexAxialMap, getHexIdMap } from "../../map";
import { WorldAnalysis } from "../types/analyze";

export function bfs({
  ctx,
  startHexId,
  hexIdMap,
  axialMap,
  allowedHexIds,
}: {
  ctx: GameCtx;
  startHexId: number;
  hexIdMap?: Map<number, Hex>;
  axialMap?: Map<string, Hex>;
  allowedHexIds?: number[];
}) {
  const newHexIdMap = hexIdMap ?? getHexIdMap(ctx);
  const newAxialMap = axialMap ?? getHexAxialMap(ctx);

  const totalAllowedVisiting = new Set(allowedHexIds ?? [...newHexIdMap.keys()]);

  // <hex, hexItCameFrom>
  const cameFrom = new Map<number, number | null>();
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
export function reconstructPath(cameFrom: Map<number, number | null>, targetHexId: number) {
  const path: number[] = [];

  let current: number | null = targetHexId;

  while (current !== null) {
    path.push(current);
    current = cameFrom.get(current) ?? null;
  }

  return path.reverse();
}

export function getBorderBFSMap(analysis: WorldAnalysis) {
  return new Map(analysis.selfData.borderBFS.map((b) => [b.startHexId, b]));
}
