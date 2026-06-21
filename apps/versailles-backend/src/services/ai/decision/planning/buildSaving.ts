import { AIMemory } from "#services/ai/memory/types.js";
import {
  BUILDINGS_CATEGORY,
  findBuildingDataByCategory,
  topLevelsByCategory,
  typeNationResource,
} from "@repo/shared";
import { ScoredIntent } from "../building/types";
import { AIPlanningState } from "./types";
import { BudgetMap } from "../budget/types";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { isTopIntent } from "../building/main";
import { updateNationMemo } from "./moveGoals";

export function populateBuildSaving(planning: AIPlanningState, nationMemo: AIMemory) {
  for (const saving of nationMemo.buildSaving) {
    planning.buildSaving.set(saving.hexId, {
      category: saving.category,
      targetLevel: saving.targetLevel,
    });
  }
}

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
  buildingbudget: Map<typeNationResource, number>,
  planning: AIPlanningState,
  hexId: number,
  cost: Partial<Record<typeNationResource, number>>
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
