// pressure is generally used in for budget calculation
// maybe move it there later

import { Nation } from "@repo/shared";
import { WorldAnalysis, AIPressure } from "./types";
import { clamp } from "#lib/helpers";
import { getNationArmy } from "#simulation/nations/queries";
import { GameCtx } from "#trpc";

// calculates total enemy army
function calcEnemyStrengthPressure(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const ownArmy = analysis.selfData.totalArmy;
  const enemyArmy = nation.atWar.reduce((acc, n) => acc + (getNationArmy(ctx, n) ?? 0), 0);

  const ratio = enemyArmy / Math.max(1, ownArmy);

  return clamp((ratio - 1) / 2, 0, 1);
}

function calcEconomyPressure(ctx: GameCtx, analysis: WorldAnalysis, nation: Nation) {
  const economyRatios = analysis.worldData.neighborEconomyRatio.map((e) => e.ratio);
  return calcNeighborEconomyPressure(economyRatios);
}
function calcNeighborEconomyPressure(neighborRatios: number[]) {
  if (neighborRatios.length === 0) return 0;

  const sorted = [...neighborRatios].sort((a, b) => b - a);

  let weightedTotal = 0;
  let weightTotal = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ratio = sorted[i];

    // strongest neighbor matters most
    const weight = 1 / (i + 1);

    // ratio 1.0 = equal economy
    // ratio 2.0 = neighbor has double economy
    // ratio 3.0+ = max pressure
    const pressure = clamp((ratio - 1) / 2, 0, 1);

    weightedTotal += pressure * weight;
    weightTotal += weight;
  }

  return weightedTotal / weightTotal;
}

function calcExpansionOpportunity() {
  // compare neighbor army + economy to nation army & economy
  return 0;
}

export function analyzeAIPressure(
  ctx: GameCtx,
  analysis: WorldAnalysis,
  nation: Nation
): AIPressure {
  const enemyStrengthPressure = calcEnemyStrengthPressure(ctx, analysis, nation);
  const economyPressure = calcEconomyPressure(ctx, analysis, nation);
  const expansionOpportunity = calcExpansionOpportunity();

  return { enemyStrengthPressure, economyPressure, expansionOpportunity };
}
