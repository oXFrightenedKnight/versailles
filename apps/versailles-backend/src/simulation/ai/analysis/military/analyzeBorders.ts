import { getNationWarSet, isAtWar, isNationAtWar } from "#simulation/diplomacy/queries";
import { getNationArmyFromHex } from "#simulation/world/map/queries";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { getHexIdMap, getHexAxialMap, findNeighbors } from "@repo/shared/map";
import { MIN_EXPANSION_RESERVE, proposalPriority } from "../../actions/armyMove/policy.js";
import {
  getReinforcementAmount,
  getWarDefenseTarget,
} from "../../actions/armyMove/reinforcement.js";
import { AIPlanningState } from "../../planning/types.js";
import { avgEnemyArmyInHexes } from "../../world/armies.js";
import { WorldAnalysis } from "../types";
import { BorderNeed } from "./types";

// calculate border needs
export function analyzeNationBorder(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation
): BorderNeed[] {
  const borderHexesNeed: BorderNeed[] = [];

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);

  const warSet = getNationWarSet(ctx);

  for (const hexObj of analysis.worldData.currentBorders) {
    const hex = hexIdMap.get(hexObj.hexId);
    if (!hex) continue;

    const currentArmyAtHex = getNationArmyFromHex(hex, nation.id);

    let enemyArmyInHex = 0;
    for (const enemyId of nation.atWar) {
      const armyInHex = getNationArmyFromHex(hex, enemyId);
      if (armyInHex) {
        enemyArmyInHex += armyInHex;
      }
    }

    const enemySet = new Set(nation.atWar);
    const neighbors = findNeighbors(hex, ctx.mapHexes, axialMap);
    const enemyNeighbors = neighbors.filter((h) => h.owner && enemySet.has(h.owner));
    const neutralNeighbors = neighbors.filter((h) => h.owner && h.owner !== nation.id);

    const targetBorderHexes = neighbors.filter(
      (n) => n.owner && planning.attackTargets.has(n.owner)
    );

    // biggest bordering army across all neighboring enemy hexes
    let biggestBorderingArmy = 0;
    // total hostile bordering army at enemy hexes
    let totalBorderingEnemyArmy = 0;
    for (const enemyHex of enemyNeighbors) {
      let totalEnemyArmyInHex = 0;

      totalEnemyArmyInHex += enemyHex.army
        .filter((a) => isAtWar(warSet, nation.id, a.nationId))
        .reduce((acc, a) => {
          return acc + a.amount;
        }, 0);

      totalBorderingEnemyArmy += totalEnemyArmyInHex;

      if (totalEnemyArmyInHex > biggestBorderingArmy) {
        biggestBorderingArmy = totalEnemyArmyInHex;
      }
    }

    // -- NEUTRAL --
    let totalNeutralBordering = 0;
    for (const nationHex of neutralNeighbors) {
      let totalNeutralArmyInHex = 0;

      totalNeutralArmyInHex += nationHex.army
        .filter((a) => a.nationId !== nation.id)
        .reduce((acc, a) => {
          return acc + a.amount;
        }, 0);

      totalNeutralBordering += totalNeutralArmyInHex;
    }

    // 1. Active fighting hexes
    if (enemyArmyInHex) {
      const desiredArmy = getReinforcementAmount(enemyArmyInHex, 1.5);

      borderHexesNeed.push({
        hexId: hex.id,
        currentArmy: currentArmyAtHex,
        desiredArmy,
        expansionArmy: desiredArmy,
        deficit: Math.max(desiredArmy - currentArmyAtHex, 0),
        category: "active_fight",
      });
      continue;
    }

    // 2. Enemy frontlines
    if (enemyNeighbors.length > 0) {
      const avgEnemyArmyPerHex = avgEnemyArmyInHexes(ctx, enemyNeighbors, nation.id);

      const desiredArmy = getWarDefenseTarget(avgEnemyArmyPerHex);

      borderHexesNeed.push({
        hexId: hex.id,
        currentArmy: currentArmyAtHex,
        desiredArmy,
        expansionArmy: desiredArmy,
        deficit: Math.max(0, desiredArmy - currentArmyAtHex),
        category: "war_defense",
      });
      continue;
    }

    // 3. Attack target buildup
    if (targetBorderHexes.length > 0) {
      const borderTargetArmy = targetBorderHexes.reduce(
        (amount, h) => amount + getNationArmyFromHex(h, h.owner!),
        0
      );
      const avgTargetArmy = borderTargetArmy / Math.max(1, targetBorderHexes.length);

      const desiredArmy = getReinforcementAmount(avgTargetArmy, 1.5);

      borderHexesNeed.push({
        hexId: hex.id,
        currentArmy: currentArmyAtHex,
        desiredArmy,
        expansionArmy: desiredArmy,
        deficit: Math.max(0, desiredArmy - currentArmyAtHex),
        category: "target_buildup",
      });
      continue;
    }

    // 4. Neutral borders protection
    if (!isNationAtWar(warSet, ctx.nations, nation.id)) {
      if (neutralNeighbors.length > 0) {
        const avgNeutralArmyPerHex = Math.max(
          0,
          totalNeutralBordering / Math.max(1, neutralNeighbors.length)
        );

        const desiredArmy = getReinforcementAmount(avgNeutralArmyPerHex, 1.1);
        const armyNeed = Math.max(0, Math.round(desiredArmy - currentArmyAtHex));

        borderHexesNeed.push({
          hexId: hex.id,
          currentArmy: currentArmyAtHex,
          desiredArmy,
          expansionArmy: desiredArmy,
          deficit: armyNeed,
          category: "neutral_defense",
        });
        continue;
      }
    }

    // 5. Expansion reserve
    if (!isNationAtWar(warSet, ctx.nations, nation.id)) {
      if (neighbors.some((n) => !n.owner)) {
        const desiredArmy = MIN_EXPANSION_RESERVE;
        const armyNeed = Math.max(0, Math.round(desiredArmy - currentArmyAtHex));

        borderHexesNeed.push({
          hexId: hex.id,
          currentArmy: currentArmyAtHex,
          desiredArmy,
          expansionArmy: armyNeed + currentArmyAtHex,
          deficit: armyNeed,
          category: "expansion_reserve",
        });
        continue;
      }
    }
  }

  return borderHexesNeed;
}

export function sortBorderAnalysis(borderAnalysis: BorderNeed[]) {
  return borderAnalysis.sort((a, b) => {
    if (b.category !== a.category) {
      return proposalPriority[b.category] - proposalPriority[a.category]; // higher priority first
    }

    return b.deficit - a.deficit; // higher deficit first if priority is equal
  });
}
