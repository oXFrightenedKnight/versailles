// This function gets immediate army in hex that will be available next turn

import { BorderNeed } from "../../analysis/military/types.js";
import { getAllMoveGoals } from "../goals/armyMovement";
import { AIPlanningState } from "../types";

// DOES NOT INCLUDE MOVE GOALS
export function getOptimisticArmyAtHex(planning: AIPlanningState, hexId: number) {
  const available = planning.availableArmyByHex.get(hexId) ?? 0;
  const incoming = planning.incomingArmyByHex.get(hexId) ?? 0;

  return available + incoming;
}
// This function returns total armies going in that hex that will be there some turn
// INCLUDES MOVE GOALS
export function getLongOptimisticArmy(planning: AIPlanningState, hexId: number) {
  const shortTermOpt = getOptimisticArmyAtHex(planning, hexId);

  const incomingGoals = getAllMoveGoals(planning).filter((m) => m.path.at(-1) === hexId);
  const totalIncoming = incomingGoals.reduce((acc, m) => acc + m.amount, 0);

  // Do NOT count outgoing because it is already counted when you send goal army

  return shortTermOpt + totalIncoming;
}

export function totalHexAttacking(planning: AIPlanningState, hexId: number) {
  const attacks = planning.attackingArmy.get(hexId);
  if (!attacks) return 0;
  return attacks.reduce((acc, obj) => acc + obj.amount, 0);
}

// returns optimistic deficit in given border hex
export function calcOptimisticDeficit(borderNeed: BorderNeed, planning: AIPlanningState) {
  const desired = borderNeed.desiredArmy;
  const armyInHex = getOptimisticArmyAtHex(planning, borderNeed.hexId);

  return desired - armyInHex;
}
