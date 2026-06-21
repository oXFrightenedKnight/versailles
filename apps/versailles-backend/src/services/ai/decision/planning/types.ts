import { BUILDINGS_CATEGORY } from "@repo/shared";

export type AIPlanningState = {
  // building
  intendedBuildings: Map<number, { category: BUILDINGS_CATEGORY; levels: number }>;
  buildSaving: Map<number, { category: BUILDINGS_CATEGORY; targetLevel: number }>;
  // army
  availableArmyByHex: Map<number, number>;
  softReservedArmyByHex: Map<number, { amount: number; priority: number; reason: string }[]>;
  incomingArmyByHex: Map<number, number>; // army that will be in this hex NEXT TURN
  outgoingArmyByHex: Map<number, number>; // army that will leave next turn
  plannedMoves: ArmyMoveGoal[]; // army that may take several turns to get there
};

// planned moves over long distances
export type ArmyMoveGoal = {
  id: string;
  path: number[];
  amount: number;
};
