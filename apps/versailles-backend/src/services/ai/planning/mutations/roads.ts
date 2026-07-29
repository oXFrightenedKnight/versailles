import { Point } from "#services/road.js";
import { AIPlanningState } from "../types";

export function createPlanningRoadIntent(planning: AIPlanningState, path: Point[]) {
  planning.buildRoads.add(path);
  return { ok: true };
}
