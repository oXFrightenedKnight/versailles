export type AIPlanningState = {
  availableArmyByHex: Map<number, number>;
  incomingArmyByHex: Map<number, number>;
  outgoingArmyByHex: Map<number, number>;
  reservedArmyByHex: Map<number, number>;
  plannedMoves: ArmyMoveGoal[];
};

// planned moves over long distances
export type ArmyMoveGoal = {
  id: string;
  path: number[];
  amount: number;
};
