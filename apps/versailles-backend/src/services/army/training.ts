import { getBuildingHexMap } from "#services/buildings/queries.js";
import { addModifier } from "#services/modifiers.js";
import { trySpendNationResource } from "#services/resources/production.js";
import { GameCtx } from "#trpc/index.js";
import {
  ActionOfType,
  ArmyTrainingObject,
  baseTrainingProgress,
  Building,
  getArmyTrainCost,
  getBuildingConfig,
  getNationResource,
  getTrainingResourceCost,
  Hex,
  Nation,
  typedEntries,
} from "@repo/shared";
import { addArmy } from "./units";
import { checkIsDecimal } from "#lib/helpers.js";

// create army training object in a barrack
export function queueArmyTraining(
  ctx: GameCtx,
  nationId: string,
  trainActions: ActionOfType<"army.train">[]
) {
  const { mapHexes, buildings, nations } = ctx;

  const buildingsById = new Map<string, Building>(buildings.map((b) => [b.id, b]));
  const hexByBuilding = new Map<string | null, Hex>(mapHexes.map((hex) => [hex.buildingId, hex]));
  const nation = nations.find((n) => n.id === nationId);
  if (!nation) return;

  // map over every request and create a queue
  for (const action of trainActions) {
    if (getNationResource(nation, "manpower") < action.amount) continue; // continue if now enough manpower
    if (action.amount <= 0) continue;
    if (checkIsDecimal(action.amount)) continue;

    const barrack = buildingsById.get(action.barrackId);
    const hex = hexByBuilding.get(action.barrackId);
    if (!barrack || !hex || !hex.population) continue;

    // check ownership
    if (hex.owner !== nationId) continue;

    // subtract gold
    const cost = getTrainingResourceCost(action.amount);
    const success = typedEntries(cost).every(
      ([r, amount]) => trySpendNationResource(nation, r, amount ?? 0).ok
    );
    if (!success) continue;

    trainArmy(ctx, { ...action, barrackId: barrack.id, nationId });

    // create flat manpower modifier to decrease manpower
    addModifier({
      gameCtx: ctx,
      category: "manpower",
      nationId: nation.id,
      type: "flat",
      value: -action.amount,
    });
  }
}

// cancel army training by the object id
export function cancelArmyTraining(
  ctx: GameCtx,
  cancelActions: ActionOfType<"army.train.delete">[],
  nation: Nation
) {
  const cancelIdsSet = new Set(cancelActions.map((a) => a.trainingId));
  if (cancelIdsSet.size === 0) return;

  ctx.armyTraining = ctx.armyTraining.filter(
    (training) => training.nationId !== nation.id || !cancelIdsSet.has(training.id)
  );
}

// gives training progress and deploys ready armies
export function runBuildingTraining(
  ctx: GameCtx,
  building: Building,
  hex: Hex,
  efficiency: number
) {
  const config = getBuildingConfig(building);
  if (!config?.systems?.armyTraining) return;
  const maxTraining = config.systems.armyTraining.maxTraining ?? 0;

  const training = getBuildingTraining(ctx, building.id);

  let amountTrained = 0; // add progress to every training contract until reached cap

  const deleteFinished: string[] = [];
  if (training && training.length > 0) {
    for (const trainInstance of training) {
      if (amountTrained >= maxTraining) break;

      const trainingAvailable = Math.min(trainInstance.amount, maxTraining - amountTrained);
      const progress = baseTrainingProgress * trainingAvailable * efficiency;

      trainInstance.progress += progress;
      amountTrained += trainingAvailable;

      // if progress is full, deploy army
      if (trainInstance.progress >= trainInstance.amount) {
        addArmy({
          ctx,
          nationId: trainInstance.nationId,
          hexId: hex.id,
          amount: trainInstance.amount,
        });

        // add index to delete after loop
        deleteFinished.push(trainInstance.id);
      }
    }

    // delete armies that finished training and deployed
    for (const id of deleteFinished) {
      deleteTrainInstance(ctx, id);
    }
  }

  return { ok: true };
}

export function getBuildingTraining(
  { armyTraining }: { armyTraining: ArmyTrainingObject[] },
  buildingId: string
) {
  return armyTraining.filter((a) => a.barrackId === buildingId);
}

export function revalidateTraining(ctx: GameCtx) {
  const buildingHexMap = getBuildingHexMap(ctx);

  const deleteTraining = new Set<string>();

  for (const training of ctx.armyTraining) {
    const hex = buildingHexMap.get(training.barrackId);
    if (!hex) continue;

    if (hex.owner !== training.nationId) {
      deleteTraining.add(training.id);
    }
  }

  ctx.armyTraining = ctx.armyTraining.filter((a) => !deleteTraining.has(a.id));
}

export function trainArmy(
  ctx: GameCtx,
  { amount, barrackId, nationId }: { amount: number; barrackId: string; nationId: string }
) {
  const id = crypto.randomUUID();
  const obj = {
    id,
    amount,
    barrackId,
    nationId,
    progress: 0,
  };

  ctx.armyTraining.push(obj);

  return obj;
}
export function deleteTrainInstance(ctx: GameCtx, id: string) {
  ctx.armyTraining = ctx.armyTraining.filter((i) => i.id !== id);
  return { ok: true };
}
