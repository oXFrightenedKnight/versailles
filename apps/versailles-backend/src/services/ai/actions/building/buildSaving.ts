import { deleteBuildSaving } from "#services/ai/planning/goals/buildSaving.js";
import { AIPlanningState } from "#services/ai/planning/types.js";
import { BUILDINGS_CATEGORY, topLevelsByCategory } from "@repo/shared";
import { isTopIntent } from "./createCandidates";
import { ScoredIntent } from "./types";

// function to revalidate whether this build saving is still valid to be built/queued
export function revalidateBuildSaving(
  intentsMap: Map<string, ScoredIntent>,
  planning: AIPlanningState,
  hexId: number,
  expectedBuilding: { category: BUILDINGS_CATEGORY; level: number } | null
) {
  const saved = planning.buildSaving.get(hexId);
  const existingIntent = intentsMap.get(`${hexId},${saved?.category}`);

  if (!saved) {
    return { ok: false };
  }

  // 1. If nation doesn't own this hex anymore
  if (!existingIntent) {
    deleteBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 2. If category doesn't match
  if (existingIntent.category !== saved.category) {
    deleteBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 3. If respective intent not in top 20 anymore - drop
  if (saved.type === "regular" && !isTopIntent(intentsMap, 0, 20, existingIntent)) {
    deleteBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 4. If total is above max level
  const max = topLevelsByCategory.find((c) => c.category === saved.category)?.level ?? 0;
  const curr = expectedBuilding?.level ?? 0;
  if (saved.targetLevel > max) {
    deleteBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 5. If already reached target level
  if (curr >= saved.targetLevel) {
    deleteBuildSaving(planning, hexId);
    return { ok: false };
  }

  return { ok: true };
}
