import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";

export function getPeaceSet(ctx: GameCtx) {
  const peaceSet = new Set<string>();
  for (const nation of ctx.nations) {
    for (const { nationId: enemy } of nation.atPeace) {
      if (enemy === nation.id) continue;
      peaceSet.add(warKey(nation.id, enemy));
    }
  }

  return peaceSet;
}

export function isAtPeace(peaceSet: Set<string>, a: string, b: string) {
  if (peaceSet.has(warKey(a, b))) return true;
  return false;
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
