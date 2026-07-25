import { AIPlanningState } from "./types";

export function initPlanningState() {
  return {
    intendedBuildings: new Map(),
    availableArmyByHex: new Map(),
    softReservedArmyByHex: new Map(),
    incomingArmyByHex: new Map(),
    outgoingArmyByHex: new Map(),
    reservedArmyByHex: new Map(),
    plannedMoves: new Map(),
    buildSaving: new Map(),
    buildRoads: new Set(),
    occupiedResources: new Map(),
    attackingArmy: new Map(),
    attackTargets: new Set(),
  } as AIPlanningState;
}
