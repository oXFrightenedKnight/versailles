import { GameCtx } from "#trpc/index.js";
import { ActionBuckets, Nation } from "@repo/shared";
import { AIWorldAnalysis } from "./analysis/analyzeWorld";
import { getCandidates } from "./generateCandidates";
import {
  translateBuilding,
  translateArmyMove,
  translateArmyTrain,
  translateRoadBuild,
  translateCreateContract,
  translateDeclareWar,
  translatePeaceMailAnswers,
  translateSignPeaceReq,
} from "./intents/translate";

export function runAIPipeline(ctx: GameCtx, nation: Nation) {
  const aiActionBuckets: ActionBuckets = {};
  const analysis = AIWorldAnalysis({ ctx, nationId: nation.id });
  if (!analysis) {
    throw new Error("AI couldn't analyze the world correctly!");
  }

  const candidates = getCandidates(ctx, analysis, nation);

  // translate candidates ( Move into separate function)
  const newQueuedBuildings = translateBuilding(candidates.buildIntents);
  const armyMove = translateArmyMove(ctx, candidates.moveIntents);
  const armyTrain = translateArmyTrain(candidates.trainIntents);
  const buildRoads = translateRoadBuild(candidates.buildRoads);
  const createNewContracts = translateCreateContract(candidates.contractIntents);
  const declareWar = translateDeclareWar(candidates.attackIntents);
  const signPeaceReq = translateSignPeaceReq(candidates.peaceIntents);

  const peaceAnswers = translatePeaceMailAnswers(candidates.peaceAnswerIntents);
  const answeredMails = [...peaceAnswers];

  aiActionBuckets["building.build"] = newQueuedBuildings;
  aiActionBuckets["army.move"] = armyMove;
  aiActionBuckets["army.train"] = armyTrain;
  aiActionBuckets["road.build"] = buildRoads;
  aiActionBuckets["contract.create"] = createNewContracts;
  aiActionBuckets["diplomacy.war"] = declareWar;
  aiActionBuckets["diplomacy.peace"] = signPeaceReq;
  aiActionBuckets["mails.answer"] = answeredMails;

  console.log("armyMoveIntents", armyMove);
  console.log("trainArmyIntents", armyTrain);
  console.dir(`buildRoads: ${buildRoads}`, { depth: null });

  return aiActionBuckets;
}
