import { getNationWarSet, isAtWar } from "#simulation/diplomacy/queries";
import { getHexById } from "#simulation/world/map/queries";
import { GameCtx } from "#trpc";
import { Hex } from "@repo/shared";
import { ActionOfType } from "@repo/shared/actions";

export function moveArmy({
  hexId,
  amount,
  nationId,
  direction,
  gameCtx,
  moverId,
}: {
  hexId: number;
  amount: number;
  nationId: string;
  direction: { dq: number; dr: number };
  gameCtx: GameCtx;
  moverId: string;
}) {
  // Prohibit moving non-owned armies for now
  if (moverId !== nationId) return;

  const warSet = getNationWarSet(gameCtx);

  const hex = getHexById(hexId, gameCtx);
  const contested = hex?.army.some((obj) => isAtWar(warSet, nationId, obj.nationId)) ?? false;
  const flooredAmount = Math.floor(amount);
  if (!hex || contested || flooredAmount <= 0) return;

  // find destination hex
  const hexToMove = gameCtx.mapHexes.find(
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
  const isAtWarWithOwner = isAtWar(warSet, hexToMove.owner, nationId);

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

export function removeArmy(
  ctx: GameCtx,
  nationId: string,
  hexId: number,
  amount: number,
  hexIdMap?: Map<number, Hex>
) {
  const hex = hexIdMap ? hexIdMap.get(hexId) : getHexById(hexId, ctx);

  if (!hex) return { ok: false };
  if (amount <= 0) return { ok: false };

  const nationArmy = hex.army.find((a) => a.nationId === nationId);
  if (!nationArmy) return { ok: false };

  if (nationArmy.amount <= 0) return { ok: false };

  const newArmy = Math.max(0, nationArmy.amount - amount);
  if (newArmy === 0) {
    // delete from hex army
    const idx = hex.army.indexOf(nationArmy);
    hex.army.splice(idx, 1);
  } else {
    // update
    nationArmy.amount = newArmy;
  }
}

export function executeArmyMoveActions(
  ctx: GameCtx,
  moverId: string,
  moveActions: ActionOfType<"army.move">[]
) {
  for (const action of moveActions) {
    moveArmy({
      hexId: action.hexId,
      amount: action.amount,
      direction: action.direction,
      nationId: action.nationId,
      gameCtx: ctx,
      moverId,
    });
  }
}
