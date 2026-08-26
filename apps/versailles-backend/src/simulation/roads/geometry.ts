import { Hex } from "@repo/shared";

// this function REMOVES specific points of the road and returns new segments
export function getTrimmedRoad(original: Point[], removePoints: Point[]): Point[][] {
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

export function pointsToHexIds(segment: Point[], axialMap: Map<string, Hex>) {
  return segment.flatMap((p) => {
    const hex = axialMap.get(pointKey(p));
    if (!hex) return [];

    return [hex.id];
  });
}
