import { GameCtx } from "#trpc/index.js";
import { Hex, Nation } from "@repo/shared";
import { getNationNeighbors } from "./nations";
import { NeighborArmy } from "../analysis/types";
import { getNationArmy } from "#services/genNations.js";
import { getNationArmyFromHex } from "#services/map.js";
import { getNationWarSet, isAtWar } from "#services/army/war.js";

export function getNeighborArmies(ctx: GameCtx, nation: Nation): NeighborArmy[] {
  const neighbors = getNationNeighbors(ctx, nation);

  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const neighborArmies: NeighborArmy[] = [];
  for (const id of neighbors) {
    const neighbor = nationIdMap.get(id);
    if (!neighbor) continue;

    const army = getNationArmy(ctx, neighbor.id) ?? 0;
    neighborArmies.push({ nationId: neighbor.id, army });
  }

  return neighborArmies;
}

export function getNationArmyInHexes(ctx: GameCtx, nation: Nation) {
  return ctx.mapHexes
    .filter((h) => h.owner === nation.id && h.army.some((obj) => obj.nationId === nation.id))
    .map((h) => ({ hexId: h.id, amount: getNationArmyFromHex(h, nation.id) })); // CHANGE THAT AND MERGE IN ONE
  // FUNCTION WHERE YOU SEND ALL HEXES TO CHECK AND GET TOTAL AMOUNT
}

export function getAvailableArmy(ctx: GameCtx, nationId: string) {
  const availableArmyByHex = new Map<number, number>();

  for (const hex of ctx.mapHexes) {
    if (hex.owner !== nationId) continue;

    const army = getNationArmyFromHex(hex, nationId);
    availableArmyByHex.set(hex.id, army);
  }

  return availableArmyByHex;
}

export function avgEnemyArmyInHexes(ctx: GameCtx, hexes: Hex[], defendingNationId: string) {
  if (hexes.length <= 0) return 0;

  const warSet = getNationWarSet(ctx);

  let totalEnemyArmy = 0;
  for (const hex of hexes) {
    const hostileHexArmy = hex.army.reduce((acc, a) => {
      return isAtWar(warSet, a.nationId, defendingNationId) ? acc + a.amount : acc;
    }, 0);
    totalEnemyArmy += hostileHexArmy;
  }

  return totalEnemyArmy / hexes.length;
}

// returns all nation enemies along with their armies sorted from weakest to strongest
export function getSortedEnemyArmies(ctx: GameCtx, nation: Nation) {
  return nation.atWar
    .map((n) => ({ nationId: n, army: getNationArmy(ctx, n) ?? 0 }))
    .sort((obj1, obj2) => obj1.army - obj2.army);
}
