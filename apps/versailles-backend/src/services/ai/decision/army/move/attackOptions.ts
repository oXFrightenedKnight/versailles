import { findNeighbors, Hex, Nation } from "@repo/shared";
import { GameCtx } from "#trpc/index.js";
import { getNationArmy } from "../../../../genNations";
import { BFSResult, WorldAnalysis } from "../../../types/analyze";
import { AIPlanningState } from "../../planning/types";
import { getEnemyBorderScore } from "../militaryAnalysis/main";
import { createMoveGoal } from "../../planning/moveGoals";
import {
  getAvailableArmyForEmptyAttack,
  getAvailableArmyForPriority,
  getLongOptimisticArmy,
} from "../../planning/main";
import { reconstructPath } from "#services/ai/algos/bfs.js";
import { BorderNeed } from "../militaryAnalysis/types";

export function calcEnemyAttack(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation,
  enemyId: string,
  nationIdMap: Map<string, Nation>,
  hexIdMap: Map<number, Hex>,
  axialMap: Map<string, Hex>
) {
  const attackIntent: { startId: number; endId: number; amount: number }[] = [];

  const enemy = nationIdMap.get(enemyId);
  if (!enemy) return;

  const neighbors = analysis.worldData.neighbors;
  if (!neighbors.includes(enemyId)) return; // skip if doesn't border

  let budgetArmy = aiAttackBudget(ctx, analysis, nation, enemy);
  const scoredEnemyHexes = getEnemyBorderScore(ctx, planning, nation, enemy);
  const sorted = [...scoredEnemyHexes.entries()].sort((a, b) => b[1].score - a[1].score);

  while (budgetArmy > 0) {
    const borderObj = sorted.shift();
    if (!borderObj) break;

    // find neighbors of this enemy hex that belong to nation
    const hex = hexIdMap.get(borderObj[0]);
    if (!hex || !hex.owner) continue;

    const neighbors = findNeighbors(hex, ctx.mapHexes, axialMap);

    // total hexes to loop over
    const nationNeighbors = neighbors.filter((h) => h.owner === nation.id);

    const totalArmyNeeded = borderObj[1].army * 1.4;

    // shows total army this hex has sent
    const armySentMap = new Map<number, { amount: number }>(); // <hexId, amount>
    let totalMoved = 0;

    // loop over all nation hexes until enough army is sent or no more army can be sent
    let safety = 0;
    while (
      totalMoved < totalArmyNeeded &&
      nationNeighbors.length !== 0 &&
      budgetArmy > 0 &&
      safety < 720
    ) {
      safety++;

      const neighbor = nationNeighbors.shift();
      if (!neighbor) continue;

      const army = planning.availableArmyByHex.get(neighbor.id) ?? 0;
      const armySent = armySentMap.get(neighbor.id)?.amount ?? 0;

      const needToSend = (totalArmyNeeded - totalMoved) / nationNeighbors.length;

      // don't let ai send more than 50% current hex army
      const send = Math.min(budgetArmy, army * 0.5, army - needToSend);

      armySentMap.set(neighbor.id, { amount: armySent + send });
      totalMoved += send;
      budgetArmy -= send;

      // stop counting hex if already half its army sent
      if (send + armySent >= army * 0.5) continue;

      nationNeighbors.push(neighbor);
    }

    // create move intents
    // add move intents to map
    for (const sentObj of armySentMap) {
      attackIntent.push({ startId: sentObj[0], endId: hex.id, amount: sentObj[1].amount });
    }
  }

  return attackIntent;
}

function aiAttackBudget(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation, enemy: Nation) {
  let budgetArmy = 0;

  // 1. Add based on enemy strength ratio
  const enemyArmy = getNationArmy(ctx, enemy.id) ?? 0;
  const ownArmy = analysis.selfData.totalArmy;

  const strengthRatio = ownArmy / Math.max(1, enemyArmy);

  if (strengthRatio < 0.7) return 0;

  const addStrengthBudget = ownArmy * (Math.pow(strengthRatio, 4) / 10);
  budgetArmy += addStrengthBudget;

  return budgetArmy;
}

// calculate attack on empty hexes
export function calcEmptyHexAttack(
  ctx: GameCtx,
  planning: AIPlanningState,
  hex: Hex,
  axialMap: Map<string, Hex>
) {
  const attackIntent: { startId: number; endId: number; amount: number }[] = [];

  // find first neighbor hex that has available army and move
  const neighbors = findNeighbors(hex, ctx.mapHexes, axialMap);
  for (const neighbor of neighbors) {
    const army = getAvailableArmyForEmptyAttack(planning, neighbor.id);
    if (army >= 0) attackIntent.push({ startId: neighbor.id, endId: hex.id, amount: army });
  }

  return attackIntent;
}

// calculate move intents to border hexes to prepare for expansion
export function calcAIExpansion(
  borderHex: BorderNeed,
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>
) {
  const expansionIntent: { path: number[]; amount: number }[] = [];

  const hexBFS = borderBFSMap.get(borderHex.hexId);
  if (!hexBFS) return;

  const neededForExpansion = borderHex.expansionArmy - borderHex.desiredArmy;

  const armySupplyDist: { hexId: number; available: number; path: number[] }[] = [];
  if (neededForExpansion > 0) {
    // use dynamic planning to map over hexes with available army
    for (const [hexId, _] of planning.availableArmyByHex) {
      const availableAmountInHex = getAvailableArmyForPriority(planning, hexId, borderHex.priority);
      if (availableAmountInHex === 0) continue;
      const path = reconstructPath(hexBFS.cameFrom, hexId);
      if (path === null) continue;

      armySupplyDist.push({ hexId, available: availableAmountInHex, path });
    }
  }
  // start assigning available army from closest supply
  const orderedSupply = armySupplyDist.sort((a, b) => a.path.length - b.path.length);
  for (const supply of orderedSupply) {
    const available = supply.available;

    const optimisticBorderArmy = getLongOptimisticArmy(planning, borderHex.hexId);

    const remainingNeeded = Math.max(0, borderHex.expansionArmy - optimisticBorderArmy);

    const send = Math.min(available, remainingNeeded);

    if (supply.path.length <= 1) continue;

    expansionIntent.push({ path: supply.path, amount: send });
  }

  return expansionIntent;
}
