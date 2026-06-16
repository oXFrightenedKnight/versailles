import { Nation } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { GameCtx } from "../../../trpc";
import { WorldAnalysis } from "../types/analyze";
import { generateArmyMoveCandidates } from "./army/move/main";
import { generateArmyTrainCandidates } from "./army/train/main";
import { getAIBudget } from "./budget/main";
import { createPlanningState, setNationMemoPlanning } from "./planning/main";
import { generateBuildCandidates } from "./building/main";
import { createNationMemo } from "../memory/main";
import { AIIntent } from "../types/intent";
import { updateNationMemo } from "./planning/moveGoals";

export function getCandidates(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const planning = createPlanningState(ctx, nation.id);

  const nationMemo = ctx.aiMemory[nation.id] ?? createNationMemo(ctx, nation);

  setNationMemoPlanning(analysis, planning, nationMemo);

  const budget = getAIBudget(ctx, analysis, nation);
  const budgetMap = new Map(typedEntries(budget));

  // 1. Run building (w Score)
  // store buildings in planning too
  const buildIntents = generateBuildCandidates(ctx, analysis, planning, nation, budgetMap);
  console.log(`${nation.id} build`, buildIntents);

  // 2. Run army movement
  const moveIntents = generateArmyMoveCandidates(ctx, analysis, nation, planning);
  console.log(`${nation.id} move`, moveIntents);

  // 3. Run army training
  const trainIntents = generateArmyTrainCandidates(ctx, analysis, planning, budgetMap, nation);
  console.log(`${nation.id} train`, trainIntents);

  console.log(`${nation.id} planning`, planning);
  console.log(`${nation.id} budget`, budget);

  // update ai memo with planning
  updateNationMemo(planning, nationMemo);

  return { buildIntents, moveIntents, trainIntents };
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

export function sortCandidates<T>(intents: AIIntent[]) {
  return intents.sort((a, b) => b.score - a.score) as T;
}
