import { getDeltaAxial, getHexIdMap } from "#services/map.js";
import { GameCtx, IntentInput } from "#trpc/index.js";
import { ArmyTrain, BuildIntent, MoveArmy } from "../types/intent";

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
