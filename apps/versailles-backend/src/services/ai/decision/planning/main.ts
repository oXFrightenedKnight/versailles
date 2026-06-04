// This file holds all logic for ai tracking and planning on what army it
// already sent or will send, etc.

import { reconstructPath } from "#services/ai/algos/bfs.js";
import { BFSResult } from "#services/ai/types/analyze.js";
import { GameCtx } from "#trpc/index.js";
import { getNationArmyFromHex } from "../../../map";
import { AIMemory } from "../../memory/types";
import { MoveArmy } from "../../types/intent";
import { AIPlanningState, ArmyMoveGoal } from "./types";

export function createPlanningState(ctx: GameCtx, nationId: string) {
  const availableArmyByHex = new Map<number, number>();

  for (const hex of ctx.mapHexes) {
    if (hex.owner !== nationId) continue;

    const army = getNationArmyFromHex(hex, nationId);
    availableArmyByHex.set(hex.id, army);
  }

  return {
    availableArmyByHex,
    incomingArmyByHex: new Map(),
    outgoingArmyByHex: new Map(),
    reservedArmyByHex: new Map(),
    plannedMoves: [] as ArmyMoveGoal[],
  } as AIPlanningState;
}

// use this function to update ai move that is 1 hex long
export function planArmyMove(
  planning: AIPlanningState,
  fromHexId: number,
  toHexId: number,
  amount: number,
  score: number
) {
  const available = planning.availableArmyByHex.get(fromHexId) ?? 0;

  const send = Math.max(0, Math.min(available, Math.round(amount)));

  if (send <= 0) return null;

  // update planning
  planning.availableArmyByHex.set(fromHexId, available - send);

  planning.outgoingArmyByHex.set(
    fromHexId,
    (planning.outgoingArmyByHex.get(fromHexId) ?? 0) + send
  );

  planning.incomingArmyByHex.set(toHexId, (planning.incomingArmyByHex.get(toHexId) ?? 0) + send);

  const intent: MoveArmy = {
    id: crypto.randomUUID(),
    type: "moveArmy",
    fromHexId,
    toHexId,
    amount: send,
    score,
  };

  return intent;
}

// This function gets immediate army in hex that will be available next turn
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

  const incomingGoals = planning.plannedMoves.filter((m) => m.path.at(-1) === hexId);
  const totalIncoming = incomingGoals.reduce((acc, m) => acc + m.amount, 0);

  // Do NOT count outgoing because it is already counted when you send goal army

  return shortTermOpt + totalIncoming;
}
