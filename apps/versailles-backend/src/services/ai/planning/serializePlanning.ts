// should create persistent memory snapshot from planning

import { AIMemory, ArmyMoveMemo, BuildSaveMemo } from "../memory/types";
import { getAllMoveGoals } from "./goals/armyMovement";
import { AIPlanningState } from "./types";

// return memo snapshot from planning
export function createMemoFromPlanning(planning: AIPlanningState, nationMemo: AIMemory): AIMemory {
  // update move goals
  const plannedMoves = planning.plannedMoves;
  const armyMovement: ArmyMoveMemo[] = [];
  for (const goal of getAllMoveGoals(planning)) {
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
