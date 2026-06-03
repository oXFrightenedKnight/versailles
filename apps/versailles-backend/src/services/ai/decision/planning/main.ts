// This file holds all logic for ai tracking and planning on what army it
// already sent or will send, etc.

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

// UPDATE TO INCLUDE INCOMING
export function getOptimisticArmyAtHex(planning: AIPlanningState, hexId: number) {
  const available = planning.availableArmyByHex.get(hexId) ?? 0;
  const incoming = planning.incomingArmyByHex.get(hexId) ?? 0;

  // hexId as final destination
  const incomingGoals = planning.plannedMoves.filter((m) => m.path.at(-1) === hexId);
  const totalIncoming = incomingGoals.reduce((acc, m) => acc + m.amount, 0);

  // DO NOT count outgoing as it is already counted inside calcDefense function in the beggining

  return available + incoming + totalIncoming;
}

export function populateIncomingPlanning(planning: AIPlanningState, nationMemo: AIMemory) {
  for (const armyMove of nationMemo.armyMovement) {
    planning.incomingArmyByHex.set(armyMove.endHexId, armyMove.amount);
  }
}

// Use move goals for ai to memorize paths over couple turns
export function createMoveGoal(planning: AIPlanningState, path: number[], amount: number) {
  planning.plannedMoves.push({ id: crypto.randomUUID(), path, amount });
}
// update move goal by one
export function updateMoveGoal(id: string, planning: AIPlanningState) {
  const goal = planning.plannedMoves.find((m) => m.id === id);
  if (!goal) return null;

  // if no more army left for this goal - delete
  const currentArmy = planning.availableArmyByHex.get(goal.path[0]) ?? 0;
  if (currentArmy <= 0 || goal.path.length <= 1) {
    const idx = planning.plannedMoves.indexOf(goal);
    planning.plannedMoves.splice(idx, 1);
    return 0;
  }

  const fromHexId = goal.path.shift();
  if (!fromHexId) return null;
  const toHexId = goal.path[0];
  return { fromHexId, toHexId };
}
