import { getBorderBFSMap } from "#services/ai/algos/bfs.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { WorldAnalysis } from "../../../types/analyze";
import { MoveArmy } from "../../../types/intent";
import { sortCandidates } from "../../candidates";
import { planArmyMove, reserveBorderArmy } from "../../planning/main";
import {
  checkMoveGoalDeficit,
  createMoveGoal,
  executeMoveGoal,
  updateGoalPath,
} from "../../planning/moveGoals";
import { AIPlanningState } from "../../planning/types";
import { proposalPriority } from "../militaryAnalysis/data";
import { analyzeNationBorder } from "../militaryAnalysis/main";
import { BorderNeedCategory } from "../militaryAnalysis/types";
import { getAttackProposals, getExpansionProposals } from "./attackOptions";
import { getReinforcementProposals } from "./defenseOptions";

export type ProposalArmyMove = {
  path: number[];
  amount: number;
  category: BorderNeedCategory;
};

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

  const borderBFSMap = getBorderBFSMap(analysis.selfData.borderBFS);

  const borderAnalysis = analyzeNationBorder(ctx, analysis, planning, nation);
  reserveBorderArmy(borderAnalysis, planning);

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
