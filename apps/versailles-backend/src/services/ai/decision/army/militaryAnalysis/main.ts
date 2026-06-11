// This file is used to let ai know whats happening at the border.
// AI decides which hexes have highest priority to get army first from supply.

import { findNeighbors, Hex, Nation } from "@repo/shared";
import { WorldAnalysis } from "../../../types/analyze";
import { GameCtx } from "#trpc/index.js";
import {
  getHexAxialMap,
  getHexIdMap,
  getNationArmyFromHex,
  getNationBorderHexes,
} from "#services/map.js";
import { AIPlanningState } from "../../planning/types";
import { getLongOptimisticArmy, getOptimisticArmyAtHex } from "../../planning/main";
import { ArmyGroup, BorderNeed } from "./types";

// calculate border needs
export function analyzeNationBorder(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation,
  planning: AIPlanningState
): BorderNeed[] {
  const borderHexesNeed: BorderNeed[] = [];

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);

  for (const hexObj of analysis.worldData.currentBorders) {
    console.log("ta frick");
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

    let totalBorderingEnemyArmy = 0;
    for (const enemyHex of enemyNeighbors) {
      let totalEnemyArmyInHex = 0;

      totalEnemyArmyInHex += enemyHex.army
        .filter((a) => a.nationId !== nation.id)
        .reduce((acc, a) => {
          return acc + a.amount;
        }, 0);

      totalBorderingEnemyArmy += totalEnemyArmyInHex;
    }

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

    // 1. If fighting hex - 4
    if (enemyArmyInHex) {
      const armyNeed = Math.round(enemyArmyInHex - currentArmyAtHex * 1.5);

      borderHexesNeed.push({
        hexId: hex.id,
        currentArmy: currentArmyAtHex,
        desiredArmy: armyNeed + currentArmyAtHex,
        deficit: Math.max(armyNeed, 0),
        priority: 4,
      });
      continue;
    }

    // 2. If borders nation at war - 3
    if (enemyNeighbors.length > 0) {
      const avgEnemyArmyPerHex = totalBorderingEnemyArmy / Math.max(1, enemyNeighbors.length);
      const armyNeed = Math.round(avgEnemyArmyPerHex - currentArmyAtHex * 1.25);

      borderHexesNeed.push({
        hexId: hex.id,
        currentArmy: currentArmyAtHex,
        desiredArmy: armyNeed + currentArmyAtHex,
        deficit: Math.max(0, armyNeed),
        priority: 3,
      });
      continue;
    }

    // 3. Neutral borders deficit
    // ADD A BASE MODIFIER HERE SO AI PUSHES SOME ARMY TO EMPTY HEXES
    if (neutralNeighbors.length > 0) {
      const avgNeutralArmyPerHex = totalNeutralBordering / Math.max(1, neutralNeighbors.length);
      const armyNeed = Math.round(avgNeutralArmyPerHex - currentArmyAtHex * 1.1 + 10);

      borderHexesNeed.push({
        hexId: hex.id,
        currentArmy: currentArmyAtHex,
        desiredArmy: armyNeed + currentArmyAtHex,
        deficit: Math.max(armyNeed, 0),
        priority: 2,
      });
      continue;
    }

    // 4. Hexes that border empty hexes
    if (neighbors.some((n) => !n.owner)) {
      const armyNeed = Math.round(10 - currentArmyAtHex);

      borderHexesNeed.push({
        hexId: hex.id,
        currentArmy: currentArmyAtHex,
        desiredArmy: armyNeed + currentArmyAtHex,
        deficit: Math.max(0, armyNeed),
        priority: 1,
      });
      continue;
    }
  }

  return borderHexesNeed;
}

// uses to sort hexes by priority when deciding what hex needs army most
export function scoreBorderHex(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  planning: AIPlanningState,
  nation: Nation,
  hex: Hex
) {
  const axialMap = getHexAxialMap(ctx);

  const fightingHexesMap = new Map(analysis.worldData.fightingHexes.map((fh) => [fh.hexId, fh]));

  // map over nation hexes that border other hexes and calculate their score
  let score = 0;

  // 1. Half-score based on enemy army ratio
  const neighborHexes = findNeighbors(hex, ctx.mapHexes, axialMap);
  const enemyNeighborHexes = neighborHexes.filter((h) => h.owner && h.owner !== nation.id);
  const totalArmyAtHexBorder = enemyNeighborHexes.reduce((acc, h) => {
    return getNationArmyFromHex(h, h.owner!) + acc;
  }, 0);
  const totalNationArmyInHex = getOptimisticArmyAtHex(planning, hex.id);
  // buff if ratio is below 1:1 on border
  score += getEnemyPressureScore(totalNationArmyInHex, totalArmyAtHexBorder);

  // 2. Score if is fighting hex and losing
  const fightingHex = fightingHexesMap.get(hex.id);
  if (fightingHex) {
    score +=
      getEnemyPressureScore(fightingHex.ownArmy, fightingHex.enemyArmy) *
      (1 + fightingHex.hexPriority);
  }
  return score;
}

// calculate score for each hex and decide which to strike
export function getEnemyBorderScore(
  ctx: GameCtx,
  planning: AIPlanningState,
  nation: Nation,
  enemy: Nation
) {
  // get hexes of enemy nation at border
  const border = getNationBorderHexes(ctx, enemy.id);
  const hexIdsAtBorder = border
    .filter((b) => b.neighborIds.includes(nation.id))
    .map((b) => b.hexId);

  const axialMap = getHexAxialMap(ctx);
  const hexIdMap = getHexIdMap(ctx);

  const hexScore = new Map<number, { score: number; army: number }>();
  const addScore = (hexId: number, newScore: number, army: number) => {
    const currentScore = hexScore.get(hexId)?.score ?? 0;
    hexScore.set(hexId, { score: currentScore + newScore, army });
  };

  // map over all enemy hexes at border that border with nation
  for (const hexId of hexIdsAtBorder) {
    const hex = hexIdMap.get(hexId);
    if (!hex) continue;

    // 1. Score based on army ratio
    const neighbors = findNeighbors(hex, ctx.mapHexes, axialMap);

    let totalNationArmy = 0;
    let totalEnemyArmy = 0;
    for (const neighbor of neighbors) {
      if (neighbor.owner === nation.id) {
        totalNationArmy += getOptimisticArmyAtHex(planning, neighbor.id);
      } else if (neighbor.owner === enemy.id) {
        totalEnemyArmy = getNationArmyFromHex(neighbor, enemy.id);
      }
    }

    const hexArmy = getNationArmyFromHex(hex, enemy.id);
    // switch places enemyArmy and nationArmy so we get more score if there is more nation army
    addScore(hex.id, getEnemyPressureScore(totalEnemyArmy, totalNationArmy), hexArmy);
  }

  return hexScore;
}

function getEnemyPressureScore(
  nationArmy: number,
  enemyArmy: number,
  mult?: number,
  soft?: number
) {
  const ratio = enemyArmy > 0 ? enemyArmy / Math.max(nationArmy, 1) : 1.1; // force ai to move to border
  const pressure = Math.max(0, ratio - 1);

  const multiplier = mult ? mult : 60;
  const softness = soft ? soft : 1.5;

  return multiplier * (pressure / (pressure + softness));
}

// gets all available army supply points
export function getArmySupply(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  borderAnalysis: BorderNeed[]
): ArmyGroup[] {
  const armySupply: ArmyGroup[] = [];

  const hexIdMap = getHexIdMap(ctx);

  const borderAnalysisMap = new Map(borderAnalysis.map((b) => [b.hexId, b]));

  for (const army of analysis.selfData.armyInHexes) {
    const hex = hexIdMap.get(army.hexId);
    if (!hex) continue;

    const borderHexAnalysis = borderAnalysisMap.get(hex.id);
    const desiredArmy = borderHexAnalysis?.desiredArmy;
    const currentArmy = borderHexAnalysis?.currentArmy;

    const availableAmount =
      desiredArmy && currentArmy ? Math.max(0, desiredArmy - currentArmy) : army.amount;

    armySupply.push({ hexId: hex.id, amount: army.amount, availableAmount });
  }

  return armySupply;
}
