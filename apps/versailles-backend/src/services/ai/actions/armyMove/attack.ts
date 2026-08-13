// ATTACK:
// AI should analyze imbalances in power where enemy's hex army is much lower than one of the armies in another hex.
// after that it should split defense army based on how many hexes it wants to attack from this hex and how many hexes it wants to defend from

import { totalHexAttacking } from "#services/ai/planning/queries/army.js";
import { getAvailableArmyForCategory } from "#services/ai/planning/reservations/armyReserve.js";
import { AIPlanningState } from "#services/ai/planning/types.js";
import { avgEnemyArmyInHexes } from "#services/ai/world/armies.js";
import { getNationWarSet, isAtWar } from "#services/army/war.js";
import { getHostileArmyHex } from "#services/genNations.js";
import { getBorderHexes } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { Nation, findNeighbors, getHexAxialMap, getHexIdMap } from "@repo/shared";
import { AllocateMap } from "./policy";
import { getWarDefenseTarget } from "./reinforcement";
import { ProposalArmyMove } from "./types";

// split hex army based on how many enemy hexes it borders. create a map of how much army each defending hex can allocate to attacking enemy hex. if that number is higher than
// total enemy army in hex - let ai attack. Also don't forget to cap how much hex can send based on desired and current army ratio

// army attacking can access highest filling priority, but can't move goal armies and armies that are already moved by defense AI

// make sure that ai does not include attacking hex in reserving army when calculating army allocation

// First you calculate how much army you need to reserve for the remaining enemy hexes (excluding currently looped one)
// and then you apply planning to know how much army this hex has already sent to attack in other hexes, after that you
// write down the amount this hex can allocate to attacking this enemy hex. map over nation neighbors when mapping over enemy hexes to attack

export function getAttackProposals(ctx: GameCtx, planning: AIPlanningState, nation: Nation) {
  const proposals: ProposalArmyMove[] = [];

  const allocationMap = getArmyAllocationMap(ctx, planning, nation);
  const intents = calcImbalanceAttack(ctx, planning, nation, allocationMap);

  // create attack intents
  for (const intent of intents) {
    const path = [intent.startId, intent.endId];
    proposals.push({
      path,
      amount: intent.amount,
      category: "war_attack",
    });
  }

  return proposals;
}

export function getArmyAllocationMap(ctx: GameCtx, planning: AIPlanningState, nation: Nation) {
  const borderingHexes = getBorderHexes(ctx, nation.id);
  const warSet = getNationWarSet(ctx);
  const axialMap = getHexAxialMap(ctx);

  // a map that holds enemy's border hex as key, and array of bordering nation hexes with amount they can allocate as a value
  const allocationMap: AllocateMap = new Map();

  // map over all border enemy hexes
  for (const hex of borderingHexes) {
    // skip non-war hexes
    if (!hex.owner || !isAtWar(warSet, nation.id, hex.owner)) continue;

    const neighbors = findNeighbors(hex, ctx.mapHexes, axialMap);
    if (!neighbors) continue;

    const nationNeighbors = neighbors.filter((n) => n.owner === nation.id);
    if (nationNeighbors.length <= 0) continue;

    for (const nationHex of nationNeighbors) {
      // get enemy neighbors that this nation hex borders
      const enemyNeighbors = findNeighbors(nationHex, ctx.mapHexes, axialMap).filter(
        (h) => h.owner === hex.owner
      );
      if (enemyNeighbors.length <= 0) continue;

      // calculate how much this nation hex should allocate for defense excluding current enemy hex
      const rawAvailable = getAvailableArmyForCategory(planning, nationHex.id, "war_attack");

      const filtered = enemyNeighbors.filter((h) => h.id !== hex.id); // exclude current enemy hex for attacking
      const avgEnemyArmy = avgEnemyArmyInHexes(ctx, filtered, nation.id);
      const reservedForDefense = filtered.length > 0 ? getWarDefenseTarget(avgEnemyArmy) : 0;

      const available = Math.max(0, rawAvailable - reservedForDefense);

      // update map
      const prev = allocationMap.get(hex.id) ?? [];
      allocationMap.set(hex.id, [...prev, { hexId: nationHex.id, amount: available }]);
    }
  }

  return allocationMap;
}

export function calcImbalanceAttack(
  ctx: GameCtx,
  planning: AIPlanningState,
  nation: Nation,
  allocationMap: AllocateMap
) {
  const attackIntent: { startId: number; endId: number; amount: number }[] = [];

  const hexIdMap = getHexIdMap(ctx);
  const warSet = getNationWarSet(ctx);

  const createIntent = (startId: number, endId: number, amount: number) => {
    if (amount <= 0) return { ok: false };

    attackIntent.push({ startId, endId, amount });

    const attacked = planning.attackingArmy.get(startId) ?? [];
    planning.attackingArmy.set(startId, [...attacked, { enemyHexId: endId, amount }]);

    return { ok: true };
  };

  // Map and compare armies and create attack intents
  for (const [enemyHexId, allocated] of [...allocationMap]) {
    const enemyHex = hexIdMap.get(enemyHexId);
    if (!enemyHex) continue;

    // allocated army left in each attacking hex
    const leftAllocated = allocated.map(({ hexId, amount }) => ({
      hexId,
      amount: Math.max(0, amount - totalHexAttacking(planning, hexId)),
    }));

    const totalEnemyArmy = getHostileArmyHex(enemyHex, nation.id, warSet);
    const maxAllocated = leftAllocated.reduce((acc, { amount }) => acc + amount, 0);

    // NO HARD-CODE - create separate data values file/folder
    const neededForAttack = Math.max(1, Math.ceil(totalEnemyArmy * 1.5));

    if (maxAllocated >= neededForAttack) {
      const proportion = neededForAttack / maxAllocated;

      let totalSent = 0;
      for (const { hexId, amount } of leftAllocated) {
        if (totalSent >= neededForAttack) continue;

        const needed = Math.max(0, Math.ceil(neededForAttack - totalSent));

        const send = Math.min(needed, amount, Math.ceil(proportion * amount));
        if (send < 1) continue;

        createIntent(hexId, enemyHexId, send);
        totalSent += send;
      }
    }
  }

  return attackIntent;
}
