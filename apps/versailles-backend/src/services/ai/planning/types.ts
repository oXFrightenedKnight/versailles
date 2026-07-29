import { Point } from "#services/road.js";
import { BASE_RESOURCE, BUILDINGS_CATEGORY } from "@repo/shared";
import { BorderNeedCategory } from "../analysis/military/types";

export type AIPlanningState = {
  // building
  intendedBuildings: Map<number, { category: BUILDINGS_CATEGORY; levels: number }>;
  buildSaving: BuildSavePlanning;
  // roads
  buildRoads: Set<Point[]>; // array of axial points for new road
  // contracts
  occupiedResources: Map<string, Partial<Record<BASE_RESOURCE, number>>>; // buildingId: { resource: occupied }
  // army
  availableArmyByHex: Map<number, number>;
  softReservedArmyByHex: Map<
    number,
    { amount: number; category: BorderNeedCategory; reason: string }[]
  >;
  incomingArmyByHex: Map<number, number>; // army that will be in this hex NEXT TURN
  outgoingArmyByHex: Map<number, number>; // army that will leave next turn
  plannedMoves: Map<string, ArmyMoveGoal>; // army that may take several turns to travel
  attackingArmy: Map<number, { enemyHexId: number; amount: number }[]>;
  // war
  attackTargets: AttackTargetPlanning; // set of nation ids that this nation targets
};

export type BuildSavePlanning = Map<number, PlanningBuildSavingGoal>;
export type PlanningBuildSavingGoal = {
  category: BUILDINGS_CATEGORY;
  targetLevel: number;
  type: BuildSavingGoalType;
};
export type BuildSavingGoalType = "regular" | "opening";

// planned moves over long distances
export type ArmyMoveGoal = {
  id: string;
  path: number[];
  amount: number;
};

export type AttackTargetPlanning = Set<string>;
