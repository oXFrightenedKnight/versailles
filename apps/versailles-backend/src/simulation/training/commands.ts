import { Building, Hex, Nation } from "@repo/shared";
import { ActionOfType } from "@repo/shared/actions";
import { getNationResource } from "@repo/shared/resources";
import { getTrainingResourceCost } from "@repo/shared/training";
import { typedEntries } from "@repo/shared/utils";
import { addModifier } from "../modifiers";
import { trySpendNationResource } from "../resources/production";
import { GameCtx } from "#trpc";
import { checkIsDecimal } from "#lib/helpers";

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
