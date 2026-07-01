import { getDeltaAxial, getHexIdMap } from "#services/map.js";
import { GameCtx, IntentInput } from "#trpc/index.js";
import { generateRoadDs } from "@repo/shared";
import { ArmyTrain, BuildIntent, BuildRoad, ContractIntent, MoveArmy } from "../types/intent";

export function translateBuilding(buildIntents: BuildIntent[]): IntentInput["newQueuedBuildings"] {
  const translated: IntentInput["newQueuedBuildings"] = [];

  for (const intent of buildIntents) {
    translated.push({
      hexId: intent.hexId,
      buildingType: intent.buildingCategory,
      levelsToUpgrade: 1,
    });
  }

  return translated;
}

export function translateArmyMove(
  ctx: GameCtx,
  armyMoveIntents: MoveArmy[]
): IntentInput["movePlayerArmy"] {
  const translated: IntentInput["movePlayerArmy"] = [];

  const hexIdMap = getHexIdMap(ctx);

  for (const intent of armyMoveIntents) {
    const fromHex = hexIdMap.get(intent.fromHexId);
    const toHex = hexIdMap.get(intent.toHexId);
    if (!fromHex || !toHex) continue;

    const deltaDir = getDeltaAxial({ q: fromHex.q, r: fromHex.r }, { q: toHex.q, r: toHex.r });
    translated.push({ hexId: intent.fromHexId, amount: intent.amount, direction: deltaDir });
  }

  return translated;
}

export function translateArmyTrain(armyTrainIntents: ArmyTrain[]): IntentInput["trainNewArmy"] {
  const translated: IntentInput["trainNewArmy"] = [];

  for (const intent of armyTrainIntents) {
    translated.push({ barrackId: intent.barrackId, amount: intent.amount });
  }

  return translated;
}

export function translateRoadBuild(buildRoads: BuildRoad[]) {
  const translated: IntentInput["buildRoads"] = [];

  for (const intent of buildRoads) {
    const points: { q: number; r: number; d1: number; d2: number }[] = [];
    for (const point of intent.path) {
      const { d1, d2 } = generateRoadDs();

      points.push({ q: point.q, r: point.r, d1, d2 });
    }
    translated.push({ id: crypto.randomUUID(), points });
  }

  return translated;
}

export function translateCreateContract(
  createContracts: ContractIntent[]
): IntentInput["createNewContracts"] {
  const translated: IntentInput["createNewContracts"] = [];

  for (const intent of createContracts) {
    translated.push({
      startBuildingId: intent.fromBuildingId,
      endBuildingId: intent.toBuildingId,
      amount: 0,
      autoAdjust: true,
      resource: intent.resource,
    });
  }

  return translated;
}
