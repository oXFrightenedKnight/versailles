import { Point } from "#services/road.js";
import { BUILDINGS_CATEGORY, RESOURCES } from "@repo/shared";

export type AIPlanningState = {
  // building
  intendedBuildings: Map<number, { category: BUILDINGS_CATEGORY; levels: number }>;
  buildSaving: Map<number, { category: BUILDINGS_CATEGORY; targetLevel: number }>;
  // roads
  buildRoads: Set<Point[]>; // array of axial points for new road
  // contracts
  occupiedResources: Map<string, Partial<Record<RESOURCES, number>>>; // buildingId: { resource: occupied }
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
