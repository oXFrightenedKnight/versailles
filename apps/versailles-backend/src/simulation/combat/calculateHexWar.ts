import { checkDefeated } from "#simulation/combat/occupation";
import { getNationWarSet, isAtWar } from "#simulation/diplomacy/queries";
import { assignNewCapital } from "#simulation/nations/mutations";
import { getNationById } from "#simulation/nations/queries";
import { transferHexOwnership } from "#simulation/world/map/ownership";
import { GameCtx } from "#trpc";
import { Hex } from "@repo/shared";

export function calculateHexWar(ctx: GameCtx, hex: Hex) {
  if (!hex.owner) return;

  const warSet = getNationWarSet(ctx);

  const isOwnerAtWar = ctx.nations.some((n) => isAtWar(warSet, hex.owner!, n.id));
  if (!isOwnerAtWar) return;

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
      if (isAtWar(warSet, nation.id, other.nationId)) {
        enemyTotal += other.amount;
      }
    }

    if (enemyTotal <= 0) continue;

    let loss = 0;
    if (hex.owner === army.nationId) {
      loss = enemyTotal * DEATH_COEFFICIENT * DEFENSE_COEFFICIENT;
    } else {
      loss = enemyTotal * DEATH_COEFFICIENT;
    }
    lossMap.set(army, Math.max(1, Math.floor(loss)));
  }
  // substract losses
  for (const [army, loss] of lossMap) {
    army.amount -= loss;
    if (army.amount <= 0) {
      const index = hex.army.indexOf(army);
      if (index !== -1) hex.army.splice(index, 1);
    }
  }

  // transfer ownership
  // if owner army does not exist in the tile anymore - transfer to nation with most army
  if (!hex.army.some((a) => a.nationId === owner.id)) {
    // armies that hex owner is fighting with
    const fighting_armies = hex.army.filter((armyObj) =>
      isAtWar(warSet, owner.id, armyObj.nationId)
    );
    if (fighting_armies.length === 0) return;
    const strongest = fighting_armies.reduce((max, a) => (a.amount > max.amount ? a : max));

    transferHexOwnership(ctx, hex.id, strongest.nationId);

    // if captured hex was owner's capital, choose another one or set null
    if (hex.id === owner?.capitalTileIdx) {
      assignNewCapital(ctx, owner.id);
    }
  }

  // set nation to "defeated" if no tiles left
  checkDefeated(ctx, owner.id);
}

export function calcWars(ctx: GameCtx) {
  for (const hex of ctx.mapHexes) {
    calculateHexWar(ctx, hex);
  }
}
