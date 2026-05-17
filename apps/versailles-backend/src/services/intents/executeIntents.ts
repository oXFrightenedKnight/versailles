import { Nation, ServerContractUpdate } from "@repo/shared";
import { GameCtx, IntentInput } from "../../trpc";
import { cancelArmyTraining, moveArmy, queueArmyTraining } from "../army";
import { buildNewIntentBuildings, cancelBuilding, deleteBuilding } from "../buildings";
import { createContracts, deleteContracts, newContract, updateContracts } from "../contracts";
import { newBuildings } from "../genNations";
import { buildNationRoads, cancelRoadBuild } from "../road";

export function executeIntents(ctx: GameCtx, nation: Nation, intentCtx: IntentInput) {
  if (nation.isDefeated) return;
  const roadsToBuild = intentCtx.buildRoads.map((r) => ({
    ...r,
    points: r.points.map((p) => ({
      ...p,
      isConstructing: true,
    })),
    constructing: null,
  }));

  // 1. Cancel Army Training
  cancelArmyTraining(ctx, intentCtx.deleteArmyTrain, nation);
  // 2. delete contracts
  deleteContracts(ctx, intentCtx.deleteContracts, nation);
  // 3. cancel building
  cancelBuilding(ctx, intentCtx.buildingCancel, nation);
  // 4. cancel road building
  cancelRoadBuild(ctx, intentCtx.cancelRoadBuild, nation);
  // 5. delete buildings
  deleteBuilding(ctx, intentCtx.buildingDelete, nation);

  // 6. update contracts
  updateContracts(ctx, intentCtx.updateContracts as ServerContractUpdate[], nation);

  // 9. queue buildings
  buildNewIntentBuildings({
    gameCtx: ctx,
    newBuildings: intentCtx.newQueuedBuildings as newBuildings,
    nation: nation,
  });
  // 10. queue roads
  buildNationRoads({ gameCtx: ctx, buildRoads: roadsToBuild, nationId: nation.id });
  // 11. queue army training
  queueArmyTraining({ trainNewArmy: intentCtx.trainNewArmy, nationId: nation.id, gameCtx: ctx });

  // 12. move nation army
  for (const hexObj of intentCtx.movePlayerArmy) {
    moveArmy({
      hexId: hexObj.hexId,
      amount: hexObj.amount,
      direction: hexObj.direction,
      nationId: nation.id,
      gameCtx: ctx,
    });
  }
  // 13. create new contracts
  createContracts({
    contracts: intentCtx.createNewContracts as newContract[],
    gameCtx: ctx,
    nation,
  });
}

export function runIntentForEachNation(
  ctx: GameCtx,
  intentCtx: { input: IntentInput; nationId: string }[]
) {
  const nationMap = new Map(ctx.nations.map((n) => [n.id, n]));

  for (const intentObj of intentCtx) {
    const nation = nationMap.get(intentObj.nationId);
    if (!nation) continue;

    executeIntents(ctx, nation, intentObj.input);
  }
}
