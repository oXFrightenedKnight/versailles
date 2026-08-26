import { getBorderHexes } from "#simulation/world/map/queries";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";

export function getNationsAtWar(ctx: GameCtx) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const atWar = new Map<string, { nationId1: string; nationId2: string }>();

  for (const nation of ctx.nations) {
    for (const enemyId of nation.atWar) {
      const enemy = nationIdMap.get(enemyId);
      if (!enemy) continue;

      if (atWar.has(`${enemyId},${nation.id}`)) continue;
      atWar.set(`${nation.id},${enemyId}`, { nationId1: nation.id, nationId2: enemyId });
    }
  }

  return [...atWar.values()];
}
export function getNationsAtPeace(ctx: GameCtx) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const atPeace = new Map<string, { nationId1: string; nationId2: string; turnsLeft: number }>();

  for (const nation of ctx.nations) {
    for (const obj of nation.atPeace) {
      const peaceNation = nationIdMap.get(obj.nationId);
      if (!peaceNation) continue;

      if (atPeace.has(`${peaceNation.id},${nation.id}`)) continue;
      atPeace.set(`${nation.id},${peaceNation.id}`, {
        nationId1: nation.id,
        nationId2: peaceNation.id,
        turnsLeft: obj.turnsRemaining,
      });
    }
  }

  return [...atPeace.values()];
}

export function getNationNeighbors(ctx: GameCtx, nation: Nation) {
  const borderHexes = getBorderHexes(ctx, nation.id) ?? [];
  const neighbors = new Set<string>(borderHexes.filter((h) => h.owner).map((h) => h.owner!));

  return [...neighbors];
}

export function getNationHexCount(ctx: GameCtx, nation: Nation) {
  return ctx.mapHexes.filter((h) => h.owner === nation.id).length;
}
