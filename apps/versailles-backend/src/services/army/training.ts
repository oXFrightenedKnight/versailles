import { getBuildingsByIdMap } from "#services/buildings/queries.js";
import { getHexIdMap } from "#services/map.js";
import { addModifier } from "#services/modifiers.js";
import { subtractGold } from "#services/resources/gold.js";
import { GameCtx } from "#trpc/index.js";
import {
  baseTrainingProgress,
  Building,
  BUILDINGS,
  BUILDINGS_CATEGORY,
  getArmyTrainCost,
  getBuildingName,
  Hex,
  Nation,
} from "@repo/shared";

// create army training object in a barrack
export function queueArmyTraining({
  trainNewArmy,
  nationId,
  gameCtx,
}: {
  trainNewArmy: { amount: number; barrackId: string }[];
  nationId: string;
  gameCtx: GameCtx;
}) {
  const { mapHexes, buildings, nations } = gameCtx;

  const buildingsById = new Map<string, Building>(buildings.map((b) => [b.id, b]));
  const hexByBuilding = new Map<string | null, Hex>(mapHexes.map((hex) => [hex.buildingId, hex]));
  const nation = nations.find((n) => n.id === nationId);
  if (!nation) return;

  // map over every request and create a queue
  for (const newArmy of trainNewArmy) {
    if (nation.manpower < newArmy.amount) continue; // continue if now enough manpower

    const barrack = buildingsById.get(newArmy.barrackId);
    const hex = hexByBuilding.get(newArmy.barrackId);
    if (!barrack || !hex || !hex.population) continue;

    // check ownership
    if (hex.owner !== nationId) continue;

    // subtract gold
    const cost = getArmyTrainCost(newArmy.amount);
    const success = subtractGold(gameCtx, nationId, cost);
    if (!success) continue;

    if (barrack.trainingTroops) {
      barrack.trainingTroops.push({
        id: crypto.randomUUID(),
        amount: newArmy.amount,
        progress: 0,
        nationId,
      });
    } else {
      barrack.trainingTroops = [
        { id: crypto.randomUUID(), amount: newArmy.amount, progress: 0, nationId },
      ];
    }

    // create flat manpower modifier to decrease manpower
    addModifier({
      gameCtx,
      category: "manpower",
      nationId: nation.id,
      type: "flat",
      value: -newArmy.amount,
    });
  }
}

// cancel army training by the object id
export function cancelArmyTraining(ctx: GameCtx, cancelIds: string[], nation: Nation) {
  const armyTrainMap = new Map(
    ctx.buildings
      .filter((b) => b.category === "BARRACK" && b.trainingTroops)
      .flatMap((b) => b.trainingTroops!.map((t) => [t.id, { troop: t, building: b }]))
  );

  for (const id of cancelIds) {
    const armyToDelete = armyTrainMap.get(id);

    if (!armyToDelete) continue;
    if (armyToDelete.troop.nationId !== nation.id) continue;

    // delete training object
    const troops = armyToDelete.building.trainingTroops!;
    const idx = troops.indexOf(armyToDelete.troop);

    if (idx !== -1) {
      troops.splice(idx, 1);
    }
  }
}

// gives training progress and deploys ready armies
export function trainArmyProgress(
  ctx: GameCtx,
  buildingId: string,
  hexId: number,
  efficiency: number
) {
  const buildingIdMap = getBuildingsByIdMap(ctx.buildings);
  const building = buildingIdMap.get(buildingId);

  const hexIdMap = getHexIdMap(ctx);
  const hex = hexIdMap.get(hexId);

  if (!building || !hex) return { ok: false };

  const name = getBuildingName(building.category, building.level);
  if (!name) return { ok: false };

  const training = building.trainingTroops;
  const maxTraining = BUILDINGS[name].maxTraining ?? 0;
  let trainingCap = 0; // add progress to every training contract until reached cap
  const idxsToDelete: number[] = [];
  if (training && training.length > 0) {
    for (const [i, army] of training.entries()) {
      if (trainingCap >= maxTraining) break;

      const amountTrained = Math.min(army.amount, maxTraining - trainingCap);
      const progress = Math.round(baseTrainingProgress * amountTrained * efficiency);

      army.progress += progress;
      trainingCap += amountTrained;

      // if progress is full, deploy army
      if (army.progress >= army.amount) {
        const ownerArmyInHex = hex.army.find((a) => a.nationId === army.nationId);
        if (!ownerArmyInHex) {
          hex.army.push({ amount: army.amount, nationId: army.nationId });
        } else {
          ownerArmyInHex.amount += army.amount;
        }

        // add index to delete after loop
        idxsToDelete.push(i);
      }
    }

    // delete armies that finished training and deployed
    building.trainingTroops = training.filter((_, i) => !idxsToDelete.includes(i));
  }

  return { ok: true };
}
