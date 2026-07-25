import { Point, getSharedRoadEdges, getSlicedRoadSegments } from "#services/road.js";
import { Hex } from "@repo/shared";

// returns non-overlapping road segments
export function uniqueRoadSegments(
  path: number[],
  roadsPoints: Point[][],
  hexIdMap: Map<number, Hex>
) {
  const pointPath: Point[] = path.flatMap((p) => {
    const hex = hexIdMap.get(p);
    return hex ? [{ q: hex.q, r: hex.r }] : [];
  });

  // get all shared edges of this road with other
  const shared = new Set<string>();

  for (const points of roadsPoints) {
    const edges = getSharedRoadEdges(pointPath, points);
    edges.forEach((e) => shared.add(e));
  }

  return getSlicedRoadSegments(pointPath, shared);
}
