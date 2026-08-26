import { BASE_ROAD_COST } from "./config";

export function calculateRoadCost(roadLength: number) {
  return Math.max(0, (roadLength - 1) * BASE_ROAD_COST);
}
