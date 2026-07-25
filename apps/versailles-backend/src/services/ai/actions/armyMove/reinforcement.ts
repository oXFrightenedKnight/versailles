import { reconstructPath } from "#services/ai/algorithms/bfs.js";
import { sortBorderAnalysis } from "#services/ai/analysis/military/analyzeBorders.js";
import { BorderNeed } from "#services/ai/analysis/military/types.js";
import { BFSResult } from "#services/ai/analysis/types.js";
import { getLongOptimisticArmy } from "#services/ai/planning/queries/army.js";
import { getAvailableArmyForCategory } from "#services/ai/planning/reservations/armyReserve.js";
import { AIPlanningState } from "#services/ai/planning/types.js";
import { MINIMUM_WAR_BORDER_ARMY, WAR_DEFENSE_MULT } from "./policy";
import { ProposalArmyMove } from "./types";

// returns army reinforcement proposals for a given borderHex
export function calcAIDefenseMove(
  borderHex: BorderNeed,
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>
) {
  const defenseIntent: { amount: number; path: number[] }[] = [];

  const hexBFS = borderBFSMap.get(borderHex.hexId);
  if (!hexBFS) return;

  const armySupplyDist: { hexId: number; available: number; path: number[] }[] = [];
  if (borderHex.deficit > 0) {
    // use dynamic planning to map over hexes with available army
    for (const [hexId, _] of planning.availableArmyByHex) {
      const availableArmyInHex = getAvailableArmyForCategory(planning, hexId, borderHex.category);
      if (availableArmyInHex === 0) continue;
      const path = reconstructPath(hexBFS.cameFrom, hexId);
      if (path === null) continue;

      armySupplyDist.push({ hexId, available: availableArmyInHex, path });
    }
  }
  // start assigning available army from closest supply
  const orderedSupply = armySupplyDist.sort((a, b) => a.path.length - b.path.length);
  for (const supply of orderedSupply) {
    const available = supply.available;

    const optimisticBorderArmy = getLongOptimisticArmy(planning, borderHex.hexId);

    const remainingDeficit = Math.max(0, borderHex.desiredArmy - optimisticBorderArmy);

    const send = Math.min(available, remainingDeficit);

    if (supply.path.length <= 1) continue;

    defenseIntent.push({ path: supply.path, amount: send });
  }

  return defenseIntent;
}

export function getReinforcementProposals(
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>,
  borderAnalysis: BorderNeed[]
) {
  const proposals: ProposalArmyMove[] = [];

  // sort border analysis to ensure higher category/deficit proposals are first
  const sortedBorders = sortBorderAnalysis(borderAnalysis);

  for (const borderHex of sortedBorders) {
    const intents = calcAIDefenseMove(borderHex, planning, borderBFSMap);
    if (!intents) continue;

    for (const intent of intents) {
      proposals.push({
        ...intent,
        category: borderHex.category,
      });
    }
  }

  // return sorted proposals based on proposal category or higher deficit
  return proposals;
}

// return minimum desired army for hex reinforcement (default formula)
export function getReinforcementAmount(army: number, coeff: number) {
  return Math.max(MINIMUM_WAR_BORDER_ARMY, Math.ceil(army * coeff));
}
// wrapper for war border defense calculations. Add custom logic later.
export function getWarDefenseTarget(avgEnemyArmy: number) {
  return getReinforcementAmount(avgEnemyArmy, WAR_DEFENSE_MULT);
}
