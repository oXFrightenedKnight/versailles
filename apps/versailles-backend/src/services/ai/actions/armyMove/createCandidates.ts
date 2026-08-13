import { analyzeNationBorder } from "#services/ai/analysis/military/analyzeBorders.js";
import { WorldAnalysis } from "#services/ai/analysis/types.js";
import { sortCandidates } from "#services/ai/generateCandidates.js";
import { MoveArmy } from "#services/ai/intents/types.js";
import {
  createMoveGoal,
  getAllMoveGoals,
  shiftGoalPath,
} from "#services/ai/planning/goals/armyMovement.js";
import { planArmyMove } from "#services/ai/planning/mutations/army.js";
import { reserveBorderArmy } from "#services/ai/planning/reservations/armyReserve.js";
import { AIPlanningState } from "#services/ai/planning/types.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { getAttackProposals } from "./attack";
import { getExpansionProposals } from "./expansion";
import { proposalPriority } from "./policy";
import { getReinforcementProposals } from "./reinforcement";
import { ProposalArmyMove } from "./types";
import { executeMoveGoal, revalidateMoveGoalDeficit } from "./goals";
import { getBorderBFSMap } from "#services/algorithms/bfs.js";

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
    const intent = planArmyMove(planning, path[0], path[1], amount, nation.id, score);
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

  const borderBFSMap = getBorderBFSMap(analysis.selfData.borderBFS);

  const borderAnalysis = analyzeNationBorder(ctx, analysis, planning, nation);
  reserveBorderArmy(borderAnalysis, planning);

  // for each border hex, update all move goals from memo based on its current deficit
  for (const border of borderAnalysis) {
    revalidateMoveGoalDeficit(planning, border.hexId, border.deficit);
  }

  // make sure this runs first
  // move armies that were already following a path
  const moveGoals = getAllMoveGoals(planning);
  for (const moveGoal of moveGoals) {
    const move = executeMoveGoal(moveGoal.id, planning);
    if (!move) continue;
    const success = addMoveIntent(
      [move.fromHexId, move.toHexId],
      10,
      moveGoal.amount,
      `following a path from ${move.fromHexId} to ${move.toHexId}`
    );

    if (success.ok) {
      shiftGoalPath(planning, moveGoal.id);
    }
  }

  // collect all proposal types
  const proposals: ProposalArmyMove[] = [
    ...getReinforcementProposals(planning, borderBFSMap, borderAnalysis),
    ...getAttackProposals(ctx, planning, nation),
    ...getExpansionProposals(ctx, planning, nation),
  ];

  const sortedProposals = sortProposals(proposals);

  for (const proposal of sortedProposals) {
    addMoveIntent(proposal.path, 0, proposal.amount);
  }

  return sortCandidates(armyMoveIntents);
}

// sorts proposals to determine which ones get fulfilled first
export function sortProposals(proposals: ProposalArmyMove[]) {
  return proposals.sort((a, b) => {
    return proposalPriority[b.category] - proposalPriority[a.category]; // higher priority first
  });
}
