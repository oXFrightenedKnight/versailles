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
