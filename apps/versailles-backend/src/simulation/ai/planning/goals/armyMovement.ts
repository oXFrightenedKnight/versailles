import { AIPlanningState } from "../types";

// Use move goals for ai to memorize paths over couple turns
export function createMoveGoal(planning: AIPlanningState, path: number[], amount: number) {
  const id = crypto.randomUUID();
  planning.plannedMoves.set(id, { id, path, amount });
  return id;
}

export function getMoveGoalById(planning: AIPlanningState, goalId: string) {
  return planning.plannedMoves.get(goalId);
}

export function shiftGoalPath(planning: AIPlanningState, goalId: string) {
  const goal = getMoveGoalById(planning, goalId);
  if (!goal) return null;

  goal.path.shift();
  return goal;
}

export function deleteMoveGoal(planning: AIPlanningState, goalId: string) {
  return planning.plannedMoves.delete(goalId);
}

export function getAllMoveGoals(planning: AIPlanningState) {
  return [...planning.plannedMoves].map(([_, goal]) => goal);
}
