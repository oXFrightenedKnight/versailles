import { BASE_ROAD_COST, Road } from "@repo/shared";

export function getCanceledRoadCostServer(serverCancelRoadBuilding: string[], roads: Road[]) {
  let accCost = 0;
  const roadIdMap = new Map(roads.map((r) => [r.id, r]));

  // subtract canceled road cost
  for (const roadId of serverCancelRoadBuilding) {
    const road = roadIdMap.get(roadId);
    if (!road) continue;

    const unfinished = road.points.filter((r) => r.isConstructing);

    for (let i = 0; i < unfinished.length; i++) {
      accCost += BASE_ROAD_COST;
    }

    // if only one point was finished, return gold as well
    if (road.points.length - unfinished.length === 1) {
      accCost += BASE_ROAD_COST;
    }
  }

  return accCost;
}
