import { cancelArmyTraining, queueArmyTraining } from "#services/army/training.js";
import { executeArmyMoveActions } from "#services/army/units.js";
import { buildNewIntentBuildings } from "#services/buildings/construction.js";
import { cancelBuilding, deleteBuilding } from "#services/buildings/mutations.js";
import { ActionBuckets, getActions, Nation } from "@repo/shared";
import { GameCtx } from "../../trpc";
import { submitDeleteContracts, submitNewContracts, updateContracts } from "../contracts";
import { buildNationRoads, cancelRoadBuild } from "../road";

export function executeIntents(ctx: GameCtx, nation: Nation, actions: ActionBuckets) {
  if (nation.isDefeated) return;

  // 1. Cancel Army Training
  cancelArmyTraining(ctx, getActions(actions, "army.train.delete"), nation);
  // 2. delete contracts
  submitDeleteContracts(ctx, getActions(actions, "contract.delete"), nation);
  // 3. cancel building
  cancelBuilding(ctx, getActions(actions, "building.cancel"), nation);
  // 4. cancel road building
  cancelRoadBuild(ctx, getActions(actions, "road.cancel"), nation);
  // 5. delete buildings
  deleteBuilding(ctx, getActions(actions, "building.delete"), nation);

  // 6. update contracts
  updateContracts(ctx, getActions(actions, "contract.update"), nation);

  // 9. queue buildings
  buildNewIntentBuildings(ctx, nation, getActions(actions, "building.build"));
  // 10. queue roads
  buildNationRoads(ctx, nation.id, getActions(actions, "road.build"));
  // 11. queue army training
  queueArmyTraining(ctx, nation.id, getActions(actions, "army.train"));

  // 12. move nation army
  executeArmyMoveActions(ctx, nation.id, getActions(actions, "army.move"));

  // 13. create new contracts
  submitNewContracts(ctx, nation, getActions(actions, "contract.create"));
}

export function runIntentForEachNation(
  ctx: GameCtx,
  actionsCtx: { actions: ActionBuckets; nationId: string }[]
) {
  const nationMap = new Map(ctx.nations.map((n) => [n.id, n]));

  for (const { actions, nationId } of actionsCtx) {
    const nation = nationMap.get(nationId);
    if (!nation) continue;

    executeIntents(ctx, nation, actions);
  }
}
