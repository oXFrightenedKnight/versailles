import { reconstructPath } from "#services/ai/algos/bfs.js";
import { AIMemory } from "#services/ai/memory/types.js";
import { BFSResult } from "#services/ai/types/analyze.js";
import { GameCtx } from "#trpc/index.js";
import { BUILDINGS_CATEGORY, Nation } from "@repo/shared";
import { AIPlanningState } from "./types";

// check whether the hex that this army is moving to still needs that much army
// and remove starting from furthest armies in that case
export function checkMoveGoalDeficit(planning: AIPlanningState, hexId: number, hexDeficit: number) {
  const goalsToHex = planning.plannedMoves.filter((m) => m.path.at(-1) === hexId);
  if (goalsToHex.length <= 0) return;

  const sortedGoals = goalsToHex.sort((a, b) => a.path.length - b.path.length);

  let totalMoving = 0;
  for (const goal of sortedGoals) {
    const remainingDeficit = Math.max(0, hexDeficit - totalMoving);
    const newAmount = Math.min(remainingDeficit, goal.amount);

    totalMoving += newAmount;
    goal.amount = newAmount;
  }
}

// so should ai use incomingArmyByHex or plannedMoves
export function populateArmyGoals(
  planning: AIPlanningState,
  nationMemo: AIMemory,
  borderBFSMap: Map<number, BFSResult>
) {
  for (const bfsResult of borderBFSMap.values()) {
    // find all armies in memory, whose destination is current border hex
    const hexMemoMoves = nationMemo.armyMovement.filter((a) => a.endHexId === bfsResult.startHexId);

    for (const move of hexMemoMoves) {
      const path = reconstructPath(bfsResult.cameFrom, move.currHexId);
      if (path === null) continue;

      planning.plannedMoves.push({
        id: crypto.randomUUID(),
        path: path,
        amount: move.amount,
      });
    }
  }
}

// Use move goals for ai to memorize paths over couple turns
export function createMoveGoal(planning: AIPlanningState, path: number[], amount: number) {
  planning.plannedMoves.push({ id: crypto.randomUUID(), path, amount });
}
// update move goal by one
export function executeMoveGoal(id: string, planning: AIPlanningState) {
  const goal = planning.plannedMoves.find((m) => m.id === id);
  if (!goal) return null;

  // if no more army left for this goal - delete
  const currentArmy = planning.availableArmyByHex.get(goal.path[0]) ?? 0;
  if (currentArmy <= 0 || goal.path.length <= 1) {
    const idx = planning.plannedMoves.indexOf(goal);
    planning.plannedMoves.splice(idx, 1);
    return null;
  }

  const fromHexId = goal.path[0];
  if (fromHexId === undefined) return null;
  const toHexId = goal.path[1];
  return { fromHexId, toHexId };
}
export function updateGoalPath(planning: AIPlanningState, goalId: string) {
  const goal = planning.plannedMoves.find((m) => m.id === goalId);
  if (!goal) return null;

  goal.path.shift();
  console.log(`successfully updated goal ${goal.id}`);
}

// populates long term ai memo with planned data it gathered this turn
export function updateNationMemo(planning: AIPlanningState, nationMemo: AIMemory): { ok: boolean } {
  // update move goals
  const plannedMoves = planning.plannedMoves;
  const moveGoals: { currHexId: number; endHexId: number; amount: number }[] = [];
  for (const goal of plannedMoves) {
    if (goal.amount <= 0) continue;
    if (goal.path.length <= 1) continue;

    const currHexId = goal.path[0];
    const endHexId = goal.path.at(-1);
    if (!endHexId || !currHexId) continue;

    moveGoals.push({ currHexId, endHexId, amount: goal.amount });
  }
  nationMemo.armyMovement = moveGoals;

  // update build saving
  const savingGoals: { hexId: number; targetLevel: number; category: BUILDINGS_CATEGORY }[] = [];

  for (const [hexId, { targetLevel, category }] of planning.buildSaving) {
    savingGoals.push({ hexId, targetLevel, category });
  }
  console.log(`savingGoals:`, savingGoals);
  nationMemo.buildSaving = savingGoals;

  return { ok: true };
}
