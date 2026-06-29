import { BASE_ROAD_COST, Road } from "#data/roads";

export function hasSegment(road: Road, a: { q: number; r: number }, b: { q: number; r: number }) {
  const points = road.points;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const direct = p1.q === a.q && p1.r === a.r && p2.q === b.q && p2.r === b.r;

    const reverse = p1.q === b.q && p1.r === b.r && p2.q === a.q && p2.r === a.r;

    if (direct || reverse) return true;
  }

  return false;
}

export function calculateRoadCost(roadLength: number) {
  return roadLength * BASE_ROAD_COST;
}

const d = {
  a: 0,
  b: 10,
};
export function generateRoadDs() {
  const d1 = Math.floor(Math.random() * (d.b + 1));
  const d2 = Math.floor(Math.random() * (d.b + 1));
  return { d1, d2 };
}
