// This file holds all logic for ai tracking and planning on what army it
// already sent or will send, etc.

import { GameCtx } from "../../../../trpc";
import { getNationArmyFromHex } from "../../../map";
import { AIPlanningState, MoveArmy } from "../../types/intent";
import { AIMemory } from "../../types/memory";

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
    plannedMoves: [],
  };
}

// use this function to update ai move
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

  planning.plannedMoves.push(intent);

  return intent;
}

export function getOptimisticArmyAtHex(planning: AIPlanningState, hexId: number) {
  const available = planning.availableArmyByHex.get(hexId) ?? 0;
  const incoming = planning.incomingArmyByHex.get(hexId) ?? 0;

  return available + incoming;
}

export function populateIncomingPlanning(planning: AIPlanningState, nationMemo: AIMemory) {
  for (const armyMove of nationMemo.armyMovement) {
    planning.incomingArmyByHex.set(armyMove.endHexId, armyMove.amount);
  }
}
