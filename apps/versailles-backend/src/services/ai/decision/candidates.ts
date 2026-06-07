import { Nation } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { GameCtx } from "../../../trpc";
import { WorldAnalysis } from "../types/analyze";
import { generateArmyMoveCandidates } from "./army/move/main";
import { generateArmyTrainCandidates } from "./army/train/main";
import { getAIBudget } from "./budget/main";
import { createPlanningState } from "./planning/main";
import { generateBuildCandidates } from "./building/main";

export function getCandidates(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const planning = createPlanningState(ctx, nation.id);

  const budget = getAIBudget(ctx, analysis, nation);
  const budgetMap = new Map(typedEntries(budget));

  // 1. Run building (w Score)
  // store buildings in planning too
  const buildIntents = generateBuildCandidates(ctx, analysis, planning, nation, budgetMap);

  // 2. Run army movement
  const moveIntents = generateArmyMoveCandidates(ctx, analysis, nation, planning);

  // 3. Run army training
  const trainIntents = generateArmyTrainCandidates(ctx, analysis, planning, nation);

  // Filter intents through budget. As long as there is enough budget, execute intent
}
{
  /*function generateBuildRoadCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): BuildRoad[] {}

function generateCreateContractCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): CreateContract[] {}

function generateDeclareWarCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): DeclareWarIntent[] {}

function generateAnswerMailCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): AnswerMail[] {}

function generateSignPeaceReqCandidates(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): SignPeaceReqIntent[] {}
*/
}
