import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { createNationMemo } from "../../../memory/main";
import { WorldAnalysis } from "../../../types/analyze";
import { MoveArmy } from "../../../types/intent";
import { createPlanningState, planArmyMove, reserveBorderArmy } from "../../planning/main";
import {
  calcAIExpansion,
  calcEmptyHexAttack,
  calcImbalanceAttack,
  getArmyAllocationMap,
} from "./attackOptions";
import { calcAIDefenseMove } from "./defenseOptions";
import { AIPlanningState } from "../../planning/types";
import {
  checkMoveGoalDeficit,
  createMoveGoal,
  executeMoveGoal,
  populateArmyGoals,
  updateGoalPath,
} from "../../planning/moveGoals";
import { analyzeNationBorder, getArmySupply } from "../militaryAnalysis/main";
import { getBorderBFSMap } from "#services/ai/algos/bfs.js";
import { sortCandidates } from "../../candidates";
import { priorityTable } from "../militaryAnalysis/data";

export function generateArmyMoveCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation,
  planning: AIPlanningState
): MoveArmy[] {
  const armyMoveIntents: MoveArmy[] = [];
  const addMoveIntent = (
    path: number[], // make sure path includes startId and endId
    score: number,
    amount: number,
    reason?: string
  ) => {
    const intent = planArmyMove(planning, path[0], path[1], amount, score);
    if (!intent)
      return {
        ok: false,
      };
    armyMoveIntents.push(intent);

    // create move goal if path longer than 2 tiles
    if (path.length > 2 && amount > 0) {
      createMoveGoal(planning, path.slice(1), intent.amount);
    }

    console.log(reason);
    return { ok: true };
  };

  const borderAnalysis = analyzeNationBorder(ctx, analysis, nation, planning);
  reserveBorderArmy(borderAnalysis, planning);
  console.log(`${nation.id} border analysis:`, borderAnalysis);

  // turn into separate function
  const sortedBorders = borderAnalysis.sort((a, b) => {
    if (b.category !== a.category) {
      return priorityTable[b.category] - priorityTable[a.category]; // higher priority first
    }

    return b.deficit - a.deficit; // higher deficit first if priority is equal
  });

  const axialMap = getHexAxialMap(ctx);
  const borderBFSMap = getBorderBFSMap(analysis);

  // for each border hex, update all move goals from memo based on its current deficit
  for (const border of borderAnalysis) {
    checkMoveGoalDeficit(planning, border.hexId, border.deficit);
  }

  // make sure this runs first
  // move armies that were already following a path
  for (const moveGoal of [...planning.plannedMoves]) {
    const move = executeMoveGoal(moveGoal.id, planning);
    if (!move) continue;
    const success = addMoveIntent(
      [move.fromHexId, move.toHexId],
      10,
      moveGoal.amount,
      `following a path from ${move.fromHexId} to ${move.toHexId}`
    );

    if (success.ok) {
      updateGoalPath(planning, moveGoal.id);
    }
  }

  // priority defense
  // defend priority 3 and 4
  for (const borderHex of sortedBorders) {
    if (borderHex.category !== "active_fight" && borderHex.category !== "war_defense") continue;
    const intents = calcAIDefenseMove(borderHex, planning, borderBFSMap);
    if (!intents) continue;

    for (const intent of intents) {
      addMoveIntent(
        intent.path,
        0,
        intent.amount,
        `Moving from ${intent.path[0]} to ${intent.path[1]} because of deficit`
      );
    }
  }

  // --- ATTACKING ---
  // Score attack for each enemy at border
  const allocationMap = getArmyAllocationMap(ctx, planning, nation);
  const intents = calcImbalanceAttack(ctx, planning, nation, allocationMap);

  // create attack intents
  for (const intent of intents) {
    addMoveIntent([intent.startId, intent.endId], 0, intent.amount);
  }

  // --- SECONDARY DEFENSE ---
  // Priorities 1 and 2
  for (const borderHex of sortedBorders) {
    if (borderHex.category !== "neutral_defense" && borderHex.category !== "expansion_reserve")
      continue;
    const intents = calcAIDefenseMove(borderHex, planning, borderBFSMap);
    if (!intents) continue;

    for (const intent of intents) {
      addMoveIntent(
        intent.path,
        0,
        intent.amount,
        `Moving from ${intent.path[0]} to ${intent.path[1]} because of deficit`
      );
    }
  }

  // --- EXPANSION ---
  // for each border hex that desires for expansion army, distribute whats left from
  // supply points
  for (const borderHex of sortedBorders) {
    const intents = calcAIExpansion(borderHex, planning, borderBFSMap);
    if (!intents) continue;

    for (const intent of intents) {
      addMoveIntent(
        intent.path,
        0,
        intent.amount,
        `Moving from ${intent.path[0]} to ${intent.path[1]} because hex needs army for expansion`
      );
    }
  }

  // Score movement to empty hexes
  const emptyBorderHexes = analysis.worldData.borderingHexes.filter((h) => !h.owner);
  for (const hex of emptyBorderHexes) {
    const intents = calcEmptyHexAttack(ctx, planning, hex, axialMap);

    for (const intent of intents) {
      addMoveIntent(
        [intent.startId, intent.endId],
        0,
        intent.amount,
        `Expanding from ${intent.startId} to ${intent.endId}`
      );
    }
  }

  return sortCandidates(armyMoveIntents);
}
