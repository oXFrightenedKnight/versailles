import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { createNationMemo } from "../../../memory/main";
import { WorldAnalysis } from "../../../types/analyze";
import { MoveArmy } from "../../../types/intent";
import { createPlanningState, planArmyMove, reserveBorderArmy } from "../../planning/main";
import { calcEmptyHexAttack, calcEnemyAttack } from "./attackOptions";
import { calcAIDefenseMove } from "./defenseOptions";
import { AIPlanningState } from "../../planning/types";
import {
  checkMoveGoalDeficit,
  executeMoveGoal,
  populateArmyGoals,
  updateGoalPath,
} from "../../planning/moveGoals";
import { analyzeNationBorder, getArmySupply } from "../militaryAnalysis/main";
import { getBorderBFSMap } from "#services/ai/algos/bfs.js";
import { sortCandidates } from "../../candidates";

export function generateArmyMoveCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation,
  planning: AIPlanningState
): MoveArmy[] {
  const armyMoveIntents: MoveArmy[] = [];
  const addMoveIntent = (fromHexId: number, toHexId: number, score: number, amount: number) => {
    const intent = planArmyMove(planning, fromHexId, toHexId, amount, score);
    if (!intent)
      return {
        ok: false,
      };
    armyMoveIntents.push(intent);
    return { ok: true };
  };

  const borderAnalysis = analyzeNationBorder(ctx, analysis, nation, planning);
  reserveBorderArmy(borderAnalysis, planning);
  console.log(`${nation.id} border analysis:`, borderAnalysis);

  // turn into separate function
  const sortedBorders = borderAnalysis.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority; // higher priority first
    }

    return b.deficit - a.deficit; // higher deficit first if priority is equal
  });

  // LEGACY, REMOVE
  const armySupplyPoints = getArmySupply(ctx, analysis, borderAnalysis);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));
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
    const success = addMoveIntent(move.fromHexId, move.toHexId, 10, moveGoal.amount);

    if (success.ok) {
      updateGoalPath(planning, moveGoal.id);
    }
  }

  // for each border hex with deficit, find closest army supply point and create army move intent
  // start from highest priority hexes
  for (const borderHex of sortedBorders) {
    const intents = calcAIDefenseMove(borderHex, planning, borderBFSMap);
    if (!intents) continue;

    for (const intent of intents) {
      addMoveIntent(intent.startId, intent.endId, 0, intent.amount);
    }
  }

  // Score attack for each enemy at border
  for (const enemyId of nation.atWar) {
    const intents = calcEnemyAttack(
      ctx,
      analysis,
      planning,
      nation,
      enemyId,
      nationIdMap,
      hexIdMap,
      axialMap
    );
    if (!intents) continue;

    // create each intent
    for (const intent of intents) {
      addMoveIntent(intent.startId, intent.endId, 0, intent.amount);
    }
  }

  // Score movement to empty hexes
  const emptyBorderHexes = analysis.worldData.borderingHexes.filter((h) => !h.owner);
  for (const hex of emptyBorderHexes) {
    const intents = calcEmptyHexAttack(ctx, planning, hex, axialMap);

    for (const intent of intents) {
      addMoveIntent(intent.startId, intent.endId, 0, intent.amount);
    }
  }

  return sortCandidates(armyMoveIntents);
}
