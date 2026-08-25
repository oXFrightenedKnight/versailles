import { BUILDINGS_CATEGORY, NATION_RESOURCE, NationResourceTable } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { AIPlanningState, BuildSavingGoalType } from "../types";

export function deleteBuildSaving(planning: AIPlanningState, hexId: number) {
  planning.buildSaving.delete(hexId);
}

export function createBuildSaving(
  planning: AIPlanningState,
  hexId: number,
  category: BUILDINGS_CATEGORY,
  targetLevel: number,
  type: BuildSavingGoalType
) {
  if (planning.buildSaving.has(hexId)) {
    return { ok: false };
  }
  planning.buildSaving.set(hexId, { category, targetLevel, type });
  return { ok: true };
}

// function to reserve budget for a saved building
export function reserveSavingBudget(
  buildingbudget: Map<NATION_RESOURCE, number>,
  planning: AIPlanningState,
  hexId: number,
  cost: NationResourceTable
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
