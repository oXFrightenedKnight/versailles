import { BUILDINGS_CATEGORY, NATION_RESOURCE, topLevelsByCategory } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { isTopIntent } from "../building/main";
import { ScoredIntent } from "../building/types";
import { AIPlanningState } from "./types";
import { getResourcePrediction } from "../helpers";

// function to check whether this build saving is still valid to be built/queued
export function checkBuildSaving(
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
    dropBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 2. If category doesn't match
  if (existingIntent.category !== saved.category) {
    dropBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 3. If respective intent not in top 10 anymore - drop
  if (!isTopIntent(intentsMap, 0, 19, existingIntent)) {
    dropBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 4. If total is above max level
  const max = topLevelsByCategory.find((c) => c.category === saved.category)?.level ?? 0;
  const curr = expectedBuilding?.level ?? 0;
  if (saved.targetLevel > max) {
    dropBuildSaving(planning, hexId);
    return { ok: false };
  }

  // 5. If already reached target level
  if (curr >= saved.targetLevel) {
    dropBuildSaving(planning, hexId);
    return { ok: false };
  }

  return { ok: true };
}

function dropBuildSaving(planning: AIPlanningState, hexId: number) {
  planning.buildSaving.delete(hexId);
}

export function createBuildSaving(
  planning: AIPlanningState,
  hexId: number,
  category: BUILDINGS_CATEGORY,
  targetLevel: number
) {
  if (planning.buildSaving.has(hexId)) {
    return { ok: false };
  }
  planning.buildSaving.set(hexId, { category, targetLevel });
  return { ok: true };
}

// function to reserve budget for a saved building
export function reserveSavingBudget(
  buildingbudget: Map<NATION_RESOURCE, number>,
  planning: AIPlanningState,
  hexId: number,
  cost: Partial<Record<NATION_RESOURCE, number>>
) {
  const saved = planning.buildSaving.get(hexId);
  if (!saved) return { ok: false };

  for (const [resource, amount] of typedEntries(cost)) {
    const available = buildingbudget.get(resource) ?? 0;
    const reserve = amount ?? 0;

    const newAmount = Math.max(0, available - reserve);
    buildingbudget.set(resource, newAmount);
  }

  return { ok: true };
}

{
  /* export function esitmateSavingTurns(
  cost: Partial<Record<typeNationResource, number>>,
  availableBudget: Map<typeNationResource, number>,
  prediction: ReturnType<typeof getResourcePrediction>
): number | null {
  let estimatedTurns = 0;

  for (const [resource, rawCost] of typedEntries(cost)) {
    const required = rawCost ?? 0;
    if (required <= 0) continue;

    const available = availableBudget.get(resource) ?? 0;
    const missing = Math.max(0, required - available);

    if (missing === 0) continue;

    const produced = prediction.totalResourceProduced[resource] ?? 0;

    const consumed = prediction.totalResourceConsumed[resource] ?? 0;

    const netProduction = produced - consumed;

    // Missing resource cannot currently be accumulated.
    if (netProduction <= 0) {
      return null;
    }

    const resourceTurns = missing / netProduction;
    estimatedTurns = Math.max(estimatedTurns, resourceTurns);
  }

  return Math.ceil(estimatedTurns);
}
 */
}
