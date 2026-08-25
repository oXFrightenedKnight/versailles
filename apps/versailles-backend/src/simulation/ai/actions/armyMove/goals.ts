import {
  deleteMoveGoal,
  getAllMoveGoals,
  getMoveGoalById,
} from "../../planning/goals/armyMovement.js";
import { AIPlanningState } from "../../planning/types.js";

// update move goal by one
export function executeMoveGoal(id: string, planning: AIPlanningState) {
  const goal = getMoveGoalById(planning, id);
  if (!goal) return null;

  // if no more army left for this goal - delete
  const currentArmy = planning.availableArmyByHex.get(goal.path[0]) ?? 0;
  if (currentArmy <= 0 || goal.path.length <= 1) {
    deleteMoveGoal(planning, goal.id);
    return null;
  }

  const fromHexId = goal.path[0];
  if (fromHexId === undefined) return null;
  const toHexId = goal.path[1];
  return { fromHexId, toHexId };
}

export function revalidateMoveGoalDeficit(
  planning: AIPlanningState,
  hexId: number,
  hexDeficit: number
) {
  const allMoveGoals = getAllMoveGoals(planning);
  const goalsToHex = allMoveGoals.filter((m) => m.path.at(-1) === hexId);
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
