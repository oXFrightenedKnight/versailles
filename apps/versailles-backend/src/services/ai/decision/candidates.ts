import { Nation } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { GameCtx } from "../../../trpc";
import { WorldAnalysis } from "../types/analyze";
import { generateArmyMoveCandidates } from "./army/move/main";
import { generateArmyTrainCandidates } from "./army/train/main";
import { getAIBudget } from "./budget/main";
import { generateBuildCandidates } from "./building/main";
import { createNationMemo, createMemoFromPlanning } from "../memory/main";
import { AIIntent } from "../types/intent";
import { generateBuildRoadCandidates } from "./roads/main";
import { generateContractCandidates } from "./contracts/main";
import { initPlanningState } from "./planning/main";
import { hydratePlanning } from "./planning/hydration";
import { getBorderBFSMap } from "../algos/bfs";
import { generateDeclareWarCandidates } from "./army/war/main";

export function getCandidates(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const planning = initPlanningState();

  const nationMemo = ctx.aiMemory[nation.id] ?? createNationMemo(ctx, nation);

  const bfsMap = getBorderBFSMap(analysis.selfData.borderBFS);

  hydratePlanning(ctx, nationMemo, nation.id, planning, bfsMap);

  const budget = getAIBudget(ctx, analysis, nation);
  const budgetMap = new Map(typedEntries(budget));

  // 1. Run building (w Score)
  // store buildings in planning too
  const buildBudget = new Map([...budgetMap].map(([res, a]) => [res, a.get("build") ?? 0]));
  const buildIntents = generateBuildCandidates(ctx, analysis, planning, nation, buildBudget);
  console.log(`${nation.id} build`, buildIntents);

  // 2. Run army movement
  const moveIntents = generateArmyMoveCandidates(ctx, analysis, nation, planning);
  console.log(`${nation.id} move`, moveIntents);

  // 3. Run army training
  const trainBudget = new Map([...budgetMap].map(([res, a]) => [res, a.get("train") ?? 0]));
  const trainIntents = generateArmyTrainCandidates(ctx, analysis, planning, trainBudget, nation);
  console.log(`${nation.id} train`, trainIntents);

  // 4. Run road building
  const roadBudget = new Map([...budgetMap].map(([res, a]) => [res, a.get("roadBuild") ?? 0]));
  const buildRoads = generateBuildRoadCandidates(ctx, planning, roadBudget, nation);

  // 5. Generate new contracts
  const contractIntents = generateContractCandidates(ctx, nation);

  // 6. Generate attack intents
  const attackIntents = generateDeclareWarCandidates(ctx, planning, nation);

  // update ai memo with planning
  const newMemo = createMemoFromPlanning(planning, nationMemo);
  ctx.aiMemory[nation.id] = newMemo;

  return { buildIntents, moveIntents, trainIntents, buildRoads, contractIntents, attackIntents };
}
{
  /*


*/
}

export function sortCandidates<T>(intents: AIIntent[]) {
  return intents.sort((a, b) => b.score - a.score) as T;
}
