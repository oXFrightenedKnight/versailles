import { Building, getArmyTrainCost, Hex, Nation, TRAIN_COST } from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { assignNewCapital, getNationById, setDefeated, subtractGold } from "./genNations.js";
import { addMail, createWarMail } from "./mails.js";
import { getHexById } from "./map.js";
import { addModifier } from "./modifiers.js";

export function moveArmy({
  hexId,
  amount,
  nationId,
  direction,
  gameCtx,
}: {
  hexId: number;
  amount: number;
  nationId: string;
  direction: { dq: number; dr: number };
  gameCtx: GameCtx;
}) {
  const { mapHexes } = gameCtx;

  const hex = getHexById(hexId, gameCtx);
  const nationWarList = new Set(getNationById(gameCtx, nationId)?.atWar);
  const contested = hex?.army.some((obj) => nationWarList.has(obj.nationId)) ?? false;
  const flooredAmount = Math.floor(amount);
  if (!hex || contested || flooredAmount <= 0) return;

  // find destination hex
  const hexToMove = mapHexes.find(
    (h) => h.q === hex.q + direction.dq && h.r === hex.r + direction.dr
  );
  // find army of nation in hex from where it is moving
  let nationArmyInTile = hex.army?.find((obj) => obj.nationId === nationId);
  if (!nationArmyInTile || !hexToMove) return;

  // change later when adding alliances, war, and military accesses
  // CHANGE THIS LOGIC WHEN ADDING HEX CAPTURE
  if (nationArmyInTile.amount < flooredAmount) return;

  // army of current nation in hex where it wants to move
  let nationArmyInMove = hexToMove.army?.find((obj) => obj.nationId === nationId);

  // if no owner - capture
  if (!hexToMove.owner) {
    hexToMove.owner = nationId;
  }
  // check if the hex that army is moving to either belongs to country at war or
  // already belongs to army's country
  const isAtWarWithOwner =
    getNationById(gameCtx, hexToMove.owner)?.atWar.includes(nationId) &&
    hexToMove.owner !== nationId;

  // move army (only to your own tiles or nations at war)
  if (isAtWarWithOwner || hexToMove.owner === nationId) {
    nationArmyInTile.amount -= flooredAmount;
    if (nationArmyInTile.amount === 0) {
      hex.army.splice(hex.army.indexOf(nationArmyInTile), 1);
    }

    if (nationArmyInMove) {
      nationArmyInMove.amount += flooredAmount;
    } else {
      hexToMove.army?.push({ nationId: nationId, amount: flooredAmount });
    }
  }
}

export function addArmy({
  ctx,
  nationId,
  hexId,
  amount,
}: {
  ctx: GameCtx;
  nationId: string;
  hexId: number;
  amount: number;
}) {
  const hex = getHexById(hexId, ctx);

  if (!hex) return;
  if (hex.owner !== nationId) return; // only allow to create army on owner tiles for now
  if (amount <= 0) return;

  const nationArmyInHex = hex.army.find((a) => a.nationId === nationId);
  if (nationArmyInHex) {
    nationArmyInHex.amount += amount;
  } else {
    hex.army.push({ nationId, amount });
  }
}

export function calculateWar(hexId: number, ctx: GameCtx) {
  const hex = getHexById(hexId, ctx);
  if (!hex || !hex.owner) return;

  const owner = getNationById(ctx, hex.owner);
  if (!owner) return;

  const lossMap = new Map();
  const DEATH_COEFFICIENT = 0.15;
  const DEFENSE_COEFFICIENT = 0.8;

  for (const army of hex.army) {
    const nation = getNationById(ctx, army.nationId);
    if (!nation) continue;

    let enemyTotal = 0;

    for (const other of hex.army) {
      if (other === army) continue; // just in case
      if (nation.atWar.includes(other.nationId)) {
        enemyTotal += other.amount;
      }
    }
    let loss = 0;
    if (hex.owner === army.nationId) {
      loss = enemyTotal * DEATH_COEFFICIENT * DEFENSE_COEFFICIENT;
    } else {
      loss = enemyTotal * DEATH_COEFFICIENT;
    }
    lossMap.set(army, loss);
  }
  // substract losses
  for (const [army, loss] of lossMap) {
    army.amount -= Math.floor(loss);

    if (army.amount <= 0) {
      const index = hex.army.indexOf(army);
      if (index !== -1) hex.army.splice(index, 1);
    }
  }

  // transfer ownership
  // if owner army does not exist in the tile anymore - transfer to nation with most army
  if (!hex.army.some((a) => a.nationId === owner.id)) {
    const fighting_armies = hex.army.filter((armyObj) => owner.atWar.includes(armyObj.nationId));
    if (fighting_armies.length === 0) return;
    const strongest = fighting_armies.reduce((max, a) => (a.amount > max.amount ? a : max));

    hex.owner = strongest.nationId;
    if (hex.build_queue?.owner !== hex.owner) {
      hex.build_queue = null;
    }

    // if captured hex was owner's capital, choose another one or set null
    if (hex.id === owner?.capitalTileIdx) {
      assignNewCapital(ctx, owner.id);
    }
  }

  // set nation to "defeated" if no tiles left
  const leftHexes = ctx.mapHexes.filter((h) => h.owner === owner.id);
  if (leftHexes.length <= 0) {
    setDefeated(owner);
  }
}
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

// DON'T FORGET TO CHECK FOR PEACE TIME BEFORE DECLARING WAR
export function declareWar(ctx: GameCtx, declareWar: string[], nation: Nation) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));
  function atPeace(nation: Nation, enemy: Nation) {
    if (nation.atPeace.find((obj) => obj.nationId === enemy.id)) {
      return true;
    }
    return false;
  }

  for (const id of declareWar) {
    if (nation.id === id) continue; // no declaring war on self

    const enemy = nationIdMap.get(id);
    if (!enemy) continue;

    // skip if already at war
    if (enemy.atWar.includes(nation.id) || nation.atWar.includes(id)) continue;
    // skip if at peace
    if (atPeace(nation, enemy) || atPeace(enemy, nation)) continue;

    nation.atWar.push(id);
    enemy.atWar.push(nation.id);

    addMail(ctx, createWarMail(ctx, nation.id, id));
  }
}

export function signPeace(ctx: GameCtx, nationId1: string, nationId2: string) {
  const nation1 = ctx.nations.find((n) => n.id === nationId1);
  const nation2 = ctx.nations.find((n) => n.id === nationId2);

  if (!nation1 || !nation2) return;
  if (!nation1.atWar.includes(nationId2) || !nation2.atWar.includes(nationId1)) return;

  const idx1 = nation1.atWar.indexOf(nationId2);
  const idx2 = nation2.atWar.indexOf(nationId1);

  nation1.atWar.splice(idx1, 1);
  nation2.atWar.splice(idx2, 1);
  addPeaceTime(ctx, nationId1, nationId2, 30);
}

export function addPeaceTime(ctx: GameCtx, nationId1: string, nationId2: string, turns?: number) {
  const nation1 = ctx.nations.find((n) => n.id === nationId1);
  const nation2 = ctx.nations.find((n) => n.id === nationId2);

  if (!nation1 || !nation2) return;
  if (nation1.atWar.includes(nationId2) || nation2.atWar.includes(nationId1)) return;

  if (turns && turns <= 0) return;

  nation1.atPeace.push({ nationId: nationId2, turnsRemaining: turns ? turns : 30 });
  nation2.atPeace.push({ nationId: nationId1, turnsRemaining: turns ? turns : 30 });
}

export function removePeace(ctx: GameCtx, nationId1: string, nationId2: string) {
  const nation1 = ctx.nations.find((n) => n.id === nationId1);
  const nation2 = ctx.nations.find((n) => n.id === nationId2);

  if (!nation1 || !nation2) return;

  nation1.atPeace = nation1.atPeace.filter((obj) => obj.nationId !== nation2.id);
  nation2.atPeace = nation2.atPeace.filter((obj) => obj.nationId !== nation1.id);
}

export function peaceCountdown(ctx: GameCtx) {
  const nationsAtPeace = ctx.nations.filter((n) => n.atPeace.length > 0);

  for (const nation of nationsAtPeace) {
    const atWarSet = new Set(nation.atWar.map((id) => id));
    const peaceToDelete: string[] = [];

    for (const peaceObj of nation.atPeace) {
      if (atWarSet.has(peaceObj.nationId)) {
        peaceToDelete.push(peaceObj.nationId);
        continue;
      }
      peaceObj.turnsRemaining -= 1;
    }

    for (const nationId of peaceToDelete) {
      removePeace(ctx, nation.id, nationId);
    }

    // remove all expired peace treaties
    nation.atPeace = nation.atPeace.filter((obj) => obj.turnsRemaining > 0);
  }
}
