import { GameCtx, IntentInput } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { AIWorldAnalysis } from "./analyze/main";
import { getCandidates } from "./decision/candidates";
import {
  translateArmyMove,
  translateArmyTrain,
  translateBuilding,
  translateCreateContract,
  translateRoadBuild,
} from "./translate/main";

export function runAIPipeline(ctx: GameCtx, nation: Nation) {
  const aiIntents: Partial<IntentInput> = {};
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

  aiIntents["newQueuedBuildings"] = newQueuedBuildings;
  aiIntents["movePlayerArmy"] = armyMove;
  aiIntents["trainNewArmy"] = armyTrain;
  aiIntents["buildRoads"] = buildRoads;
  aiIntents["createNewContracts"] = createNewContracts;

  console.log("armyMoveIntents", armyMove);
  console.log("trainArmyIntents", armyTrain);
  console.dir(`buildRoads: ${buildRoads}`, { depth: null });

  return aiIntents;
}
