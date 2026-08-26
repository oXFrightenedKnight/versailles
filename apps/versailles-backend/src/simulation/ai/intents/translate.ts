import { getDeltaAxial } from "#simulation/world/map/geometry";
import { GameCtx } from "#trpc";
import { ActionOfType } from "@repo/shared/actions";
import { getHexIdMap } from "@repo/shared/map";
import { generateRoadDs } from "@repo/shared/roads";
import {
  BuildIntent,
  MoveArmy,
  ArmyTrain,
  BuildRoad,
  ContractIntent,
  DeclareWarIntent,
  SignPeaceReqIntent,
  AnswerMail,
} from "./types";

export function translateBuilding(buildIntents: BuildIntent[]): ActionOfType<"building.build">[] {
  const translated: ActionOfType<"building.build">[] = [];

  for (const intent of buildIntents) {
    translated.push({
      id: intent.id,
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
): ActionOfType<"army.move">[] {
  const translated: ActionOfType<"army.move">[] = [];

  const hexIdMap = getHexIdMap(ctx);

  for (const intent of armyMoveIntents) {
    const fromHex = hexIdMap.get(intent.fromHexId);
    const toHex = hexIdMap.get(intent.toHexId);
    if (!fromHex || !toHex) continue;

    const deltaDir = getDeltaAxial({ q: fromHex.q, r: fromHex.r }, { q: toHex.q, r: toHex.r });
    translated.push({
      id: intent.id,
      hexId: intent.fromHexId,
      amount: intent.amount,
      direction: deltaDir,
      nationId: intent.nationId,
    });
  }

  return translated;
}

export function translateArmyTrain(armyTrainIntents: ArmyTrain[]): ActionOfType<"army.train">[] {
  const translated: ActionOfType<"army.train">[] = [];

  for (const intent of armyTrainIntents) {
    translated.push({ id: intent.id, barrackId: intent.barrackId, amount: intent.amount });
  }

  return translated;
}

export function translateRoadBuild(buildRoads: BuildRoad[]) {
  const translated: ActionOfType<"road.build">[] = [];

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
): ActionOfType<"contract.create">[] {
  const translated: ActionOfType<"contract.create">[] = [];

  for (const intent of createContracts) {
    translated.push({
      id: intent.id,
      startBuildingId: intent.fromBuildingId,
      endBuildingId: intent.toBuildingId,
      amount: 0,
      autoAdjust: true,
      resource: intent.resource,
      contractId: crypto.randomUUID(),
    });
  }

  return translated;
}

export function translateDeclareWar(
  warIntents: DeclareWarIntent[]
): ActionOfType<"diplomacy.war">[] {
  const translated: ActionOfType<"diplomacy.war">[] = [];

  for (const intent of warIntents) {
    translated.push({ id: intent.id, nationId: intent.toNationId });
  }

  return translated;
}

export function translateSignPeaceReq(
  peaceIntents: SignPeaceReqIntent[]
): ActionOfType<"diplomacy.peace">[] {
  const translated: ActionOfType<"diplomacy.peace">[] = [];

  for (const intent of peaceIntents) {
    translated.push({ id: intent.id, nationId: intent.nationId });
  }

  return translated;
}

export function translatePeaceMailAnswers(
  answeredMails: AnswerMail[]
): ActionOfType<"mails.answer">[] {
  const translated: ActionOfType<"mails.answer">[] = [];

  for (const intent of answeredMails) {
    translated.push(intent);
  }

  return translated;
}
