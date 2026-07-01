import { getNationById } from "#services/genNations.js";
import { getHexById } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";

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
