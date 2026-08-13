import { getBorderBFSMap } from "#services/algorithms/bfs.js";
import { GameCtx } from "#trpc/index.js";
import { getHexByAxial, Nation } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { generateArmyMoveCandidates } from "./actions/armyMove/createCandidates";
import { generateArmyTrainCandidates } from "./actions/armyTrain/createCandidates";
import { generateBuildCandidates } from "./actions/building/createCandidates";
import { generateContractCandidates } from "./actions/contract/createCandidates";
import { generateDeclareWarCandidates } from "./actions/declareWar/createCandidates";
import { generateAnswerPeaceReqCandidates } from "./actions/mails/answerMail";
import { generatePeaceReqCandidates } from "./actions/peaceRequest/createCandidates";
import { generateBuildRoadCandidates } from "./actions/road/createCandidates";
import { WorldAnalysis } from "./analysis/types";
import { createAIBudget } from "./budget/createBudget";
import { AIIntent } from "./intents/types";
import { createNationMemo } from "./memory/createMemory";
import { initPlanningState } from "./planning/createPlanning";
import { hydratePlanning } from "./planning/hydratePlanning";
import { createMemoFromPlanning } from "./planning/serializePlanning";

export function getCandidates(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const planning = initPlanningState();

  const nationMemo = ctx.aiMemory[nation.id] ?? createNationMemo(ctx, nation);

  const bfsMap = getBorderBFSMap(analysis.selfData.borderBFS);

  hydratePlanning(ctx, nationMemo, nation.id, planning, bfsMap);

  const budget = createAIBudget(ctx, analysis, planning, nation);
  const budgetMap = new Map(typedEntries(budget));

  console.log(`${nation.id} budget:`, budget);

  // 1. Run building (w Score)
  // store buildings in planning too
  const buildBudget = new Map([...budgetMap].map(([res, a]) => [res, a.get("build") ?? 0]));
  const buildIntents = generateBuildCandidates(ctx, analysis, planning, nation, buildBudget);
  console.log(`${nation.id} build`, buildIntents);

  // 2. Run army movement
  const moveIntents = generateArmyMoveCandidates(ctx, analysis, nation, planning);

  // 3. Run army training
  const trainBudget = new Map([...budgetMap].map(([res, a]) => [res, a.get("train") ?? 0]));
  const trainIntents = generateArmyTrainCandidates(ctx, analysis, planning, trainBudget, nation);
  console.log(`${nation.id} train`, trainIntents);

  // 4. Run road building
  const roadBudget = new Map([...budgetMap].map(([res, a]) => [res, a.get("roadBuild") ?? 0]));
  const buildRoads = generateBuildRoadCandidates(ctx, planning, roadBudget, nation);
  console.log(
    `${nation.id} road build intents:`,
    buildRoads,
    buildRoads.map((b) => b.path.map((p) => getHexByAxial(p.q, p.r, ctx.mapHexes)))
  );

  // 5. Generate new contracts
  const contractIntents = generateContractCandidates(ctx, nation);

  // 6. Generate attack intents
  const attackIntents = generateDeclareWarCandidates(ctx, planning, nation);

  // 7. Generate peace requests
  const peaceIntents = generatePeaceReqCandidates(ctx, nation);

  // 8. Generate peace request answers
  const peaceAnswerIntents = generateAnswerPeaceReqCandidates(ctx, nation);

  // update ai memo with planning
  const newMemo = createMemoFromPlanning(planning, nationMemo);
  ctx.aiMemory[nation.id] = newMemo;

  return {
    buildIntents,
    moveIntents,
    trainIntents,
    buildRoads,
    contractIntents,
    attackIntents,
    peaceIntents,
    peaceAnswerIntents,
  };
}

export function sortCandidates<T>(intents: AIIntent[]) {
  return intents.sort((a, b) => b.score - a.score) as T;
}
