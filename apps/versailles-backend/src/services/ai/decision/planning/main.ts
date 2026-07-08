// This file holds all logic for ai tracking and planning on what army it
// already sent or will send, etc.

import { getBorderBFSMap } from "#services/ai/algos/bfs.js";
import { AIMemory } from "#services/ai/memory/types.js";
import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { GameCtx } from "#trpc/index.js";
import { getNationArmyFromHex } from "../../../map";
import { MoveArmy } from "../../types/intent";
import { priorityTable } from "../army/militaryAnalysis/data";
import { BorderNeed, BorderNeedCategory } from "../army/militaryAnalysis/types";
import { populateBuildSaving } from "./buildSaving";
import { populateArmyGoals } from "./moveGoals";
import { AIPlanningState, ArmyMoveGoal } from "./types";

export function createPlanningState(ctx: GameCtx, nationId: string) {
  const availableArmyByHex = new Map<number, number>();

  for (const hex of ctx.mapHexes) {
    if (hex.owner !== nationId) continue;

    const army = getNationArmyFromHex(hex, nationId);
    availableArmyByHex.set(hex.id, army);
  }

  return {
    intendedBuildings: new Map(),
    availableArmyByHex,
    softReservedArmyByHex: new Map(),
    incomingArmyByHex: new Map(),
    outgoingArmyByHex: new Map(),
    reservedArmyByHex: new Map(),
    plannedMoves: [] as ArmyMoveGoal[],
    buildSaving: new Map(),
    buildRoads: new Set(),
    occupiedResources: new Map(),
    attackingArmy: new Map(),
  } as AIPlanningState;
}

// this function updates nation planning with nation long term memory
export function setNationMemoPlanning(
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nationMemo: AIMemory
) {
  const bfsMap = getBorderBFSMap(analysis);
  populateArmyGoals(planning, nationMemo, bfsMap);
  populateBuildSaving(planning, nationMemo);
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

// reserve desired army for border hexes
export function reserveBorderArmy(borderAnalysis: BorderNeed[], planning: AIPlanningState) {
  for (const border of borderAnalysis) {
    const reserved = planning.softReservedArmyByHex.get(border.hexId);
    if (!reserved) {
      planning.softReservedArmyByHex.set(border.hexId, [
        {
          amount: border.desiredArmy,
          category: border.category,
          reason: "reserved analyzed border",
        },
      ]);
    } else {
      reserved.push({
        amount: border.desiredArmy,
        category: border.category,
        reason: "reserved analyzed border",
      });
    }
  }
}

// gets available army of hex for specific request category
export function getAvailableArmyForCategory(
  planning: AIPlanningState,
  hexId: number,
  requesterCategory: BorderNeedCategory
) {
  const army = planning.availableArmyByHex.get(hexId) ?? 0;
  const reservations = planning.softReservedArmyByHex.get(hexId) ?? [];

  const blocked = reservations
    .filter((r) => blocksRequest(r.category, requesterCategory))
    .reduce((sum, r) => sum + r.amount, 0);

  return Math.max(0, army - blocked);
}

export function softReserveArmy(
  planning: AIPlanningState,
  hexId: number,
  amount: number,
  category: BorderNeedCategory,
  reason: string
) {
  const reserved = planning.softReservedArmyByHex.get(hexId);
  if (!reserved) {
    planning.softReservedArmyByHex.set(hexId, [{ amount, category, reason }]);
  } else {
    reserved.push({ amount, category, reason });
  }
}

function blocksRequest(
  reservedCategory: BorderNeedCategory,
  requesterCategory: BorderNeedCategory
) {
  // Same or higher priority reservations always block.
  if (priorityTable[reservedCategory] >= priorityTable[requesterCategory]) return true;

  // Active war-border protection should not be stolen even by priority 4.
  if (reservedCategory === "war_defense" && requesterCategory === "active_fight") return true;

  // Priority 1/2 reserves can be stolen by higher priorities.
  return false;
}
