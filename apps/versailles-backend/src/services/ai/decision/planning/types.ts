import { MoveArmy } from "../../types/intent";

export type AIPlanningState = {
  availableArmyByHex: Map<number, number>;
  incomingArmyByHex: Map<number, number>;
  outgoingArmyByHex: Map<number, number>;
  reservedArmyByHex: Map<number, number>;
  plannedMoves: MoveArmy[];
};
