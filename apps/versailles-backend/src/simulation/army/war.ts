import { assignNewCapital, getNationById, setDefeated } from "../genNations.js";
import { addMail, createWarMail } from "../mails.js";
import { transferHexOwnership } from "../map.js";
import { GameCtx } from "#trpc/index.js";
import { ActionOfType, Hex, Nation } from "@repo/shared";

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

export function checkDefeated(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return { defeated: false };

  const leftHexes = ctx.mapHexes.filter((h) => h.owner === nationId);
  if (leftHexes.length <= 0) {
    setDefeated(ctx, nation);
    return { defeated: true };
  }

  return { defeated: false };
}

export function declareWar(
  ctx: GameCtx,
  warActions: ActionOfType<"diplomacy.war">[],
  nation: Nation
) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));
  const warSet = getNationWarSet(ctx);

  function atPeace(nation: Nation, enemy: Nation) {
    if (nation.atPeace.find((obj) => obj.nationId === enemy.id && obj.turnsRemaining > 0)) {
      return true;
    }
    return false;
  }

  for (const { nationId: id } of warActions) {
    if (nation.id === id) continue; // no declaring war on self

    const enemy = nationIdMap.get(id);
    if (!enemy) continue;

    // skip if already at war
    if (isAtWar(warSet, enemy.id, nation.id)) continue;
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

function hasFightingArmies(ctx: GameCtx, hex: Hex) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));
  const warSet = getNationWarSet(ctx);

  let hasFighting = false;
  for (const army of hex.army) {
    const a = nationIdMap.get(army.nationId);
    if (!a) continue;

    for (const opposing of hex.army) {
      if (opposing.nationId === a.id) continue;

      const b = nationIdMap.get(opposing.nationId);
      if (!b) continue;

      if (isAtWar(warSet, a.id, b.id)) hasFighting = true;
    }
  }

  return hasFighting;
}

export function calcWars(ctx: GameCtx) {
  for (const hex of ctx.mapHexes) {
    calculateHexWar(ctx, hex);
  }
}

export function getNationWarSet(ctx: GameCtx) {
  const warSet = new Set<string>();
  for (const nation of ctx.nations) {
    for (const enemy of nation.atWar) {
      if (enemy === nation.id) continue;
      warSet.add(warKey(nation.id, enemy));
    }
  }

  return warSet;
}
export function warKey(a: string, b: string) {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

export function isAtWar(warSet: Set<string>, a: string, b: string) {
  if (warSet.has(warKey(a, b))) return true;
  return false;
}
export function isNationAtWar(warSet: Set<string>, nations: Nation[], nationId: string) {
  for (const nation of nations) {
    if (nation.id === nationId) continue;
    if (warSet.has(warKey(nationId, nation.id))) return true;
  }

  return false;
}
