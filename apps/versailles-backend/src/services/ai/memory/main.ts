import { BUILDINGS_CATEGORY, Nation } from "@repo/shared";
import { GameCtx } from "../../../trpc";
import { AIMemory, ArmyMoveMemo, BuildSaveMemo } from "./types";
import { AIPlanningState } from "../decision/planning/types";

export function createNationMemo(ctx: GameCtx, nation: Nation) {
  const memo = ctx.aiMemory[nation.id];
  if (!memo) {
    const newMemo: AIMemory = { armyMovement: [], buildSaving: [], attackTargets: [] };
    ctx.aiMemory[nation.id] = newMemo;
    return newMemo;
  }
  return memo;
}

// return updated nation memo from planning
export function createMemoFromPlanning(planning: AIPlanningState, nationMemo: AIMemory): AIMemory {
  // update move goals
  const plannedMoves = planning.plannedMoves;
  const armyMovement: ArmyMoveMemo[] = [];
  for (const goal of plannedMoves) {
    if (goal.amount <= 0) continue;
    if (goal.path.length <= 1) continue;

    const currHexId = goal.path[0];
    const endHexId = goal.path.at(-1);
    if (!endHexId || !currHexId) continue;

    armyMovement.push({ currHexId, endHexId, amount: goal.amount });
  }

  // update build saving
  const buildSaving: BuildSaveMemo[] = [];

  for (const [hexId, { targetLevel, category }] of planning.buildSaving) {
    buildSaving.push({ hexId, targetLevel, category });
  }
  console.log(`savingGoals:`, buildSaving);

  // update war targets
  const attackTargets: string[] = [];
  for (const target of planning.attackTargets) {
    attackTargets.push(target);
  }

  return { ...nationMemo, armyMovement, buildSaving, attackTargets };
}
