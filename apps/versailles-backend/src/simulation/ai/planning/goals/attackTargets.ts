import { AIPlanningState } from "../types";

export function addAttackTarget(planning: AIPlanningState, nationId: string) {
  if (planning.attackTargets.has(nationId)) {
    return false;
  }

  planning.attackTargets.add(nationId);
  return true;
}

export function deleteAttackTarget(planning: AIPlanningState, nationId: string) {
  return planning.attackTargets.delete(nationId);
}

export function hasAttackTarget(planning: AIPlanningState, nationId: string) {
  return planning.attackTargets.has(nationId);
}
