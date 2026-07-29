import { BUILDINGS_CATEGORY } from "@repo/shared";
import { AIPlanningState } from "../types";

// creates building proposal in planning
export function createPlanningBuildIntent(
  planning: AIPlanningState,
  hexId: number,
  category: BUILDINGS_CATEGORY,
  levels: number
) {
  planning.intendedBuildings.set(hexId, { category, levels });
  return { ok: true };
}
