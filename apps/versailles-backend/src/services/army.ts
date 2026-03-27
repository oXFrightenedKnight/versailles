import { Hex } from "@repo/shared";
import { getNationById } from "./genNations.js";
import { getHexById } from "./map.js";

export function moveArmy({
  hexId,
  amount,
  nationId,
  direction,
  mapHexes,
}: {
  hexId: number;
  amount: number;
  nationId: string;
  direction: { dq: number; dr: number };
  mapHexes: Hex[];
}) {
  const hex = getHexById(hexId);
  const nationWarList = new Set(getNationById(nationId)?.atWar);
  const contested = hex?.army.some((obj) => nationWarList.has(obj.nationId)) ?? false;
  if (!hex || contested) return;

  // find destination hex
  const hexToMove = mapHexes.find(
    (h) => h.q === hex.q + direction.dq && h.r === hex.r + direction.dr
  );
  // find army of nation in hex from where it is moving
  let nationArmyInTile = hex.army?.find((obj) => obj.nationId === nationId);
  if (!nationArmyInTile || !hexToMove) return;

  // change later when adding alliances, war, and military accesses
  // CHANGE THIS LOGIC WHEN ADDING HEX CAPTURE
  if (nationArmyInTile.amount < amount) return;

  // army of current nation in hex where it wants to move
  let nationArmyInMove = hexToMove.army?.find((obj) => obj.nationId === nationId);

  // if no owner - capture
  if (!hexToMove.owner) {
    hexToMove.owner = nationId;
  }
  // check if the hex that army is moving to either belongs to country at war or
  // already belongs to army's country
  const isAtWarWithOwner =
    getNationById(hexToMove.owner)?.atWar.includes(nationId) && hexToMove.owner !== nationId;

  // move army (only to your own tiles or nations at war)
  if (isAtWarWithOwner || hexToMove.owner === nationId) {
    nationArmyInTile.amount -= amount;
    if (nationArmyInTile.amount === 0) {
      hex.army.splice(hex.army.indexOf(nationArmyInTile), 1);
    }

    if (nationArmyInMove) {
      nationArmyInMove.amount += amount;
    } else {
      hexToMove.army?.push({ nationId: nationId, amount: amount });
    }
  }
}

export function calculateWar(hexId: number) {
  const hex = getHexById(hexId);
  if (!hex || !hex.owner) return;

  const owner = getNationById(hex.owner);
  if (!owner) return;

  const lossMap = new Map();
  const DEATH_COEFFICIENT = 0.15;
  const DEFENSE_COEFFICIENT = 0.8;

  for (const army of hex.army) {
    const nation = getNationById(army.nationId);
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
  }
}
