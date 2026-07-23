import { reconstructPath } from "../../../algos/bfs";
import { BFSResult } from "../../../types/analyze";
import { getAvailableArmyForCategory, getLongOptimisticArmy } from "../../planning/main";
import { AIPlanningState } from "../../planning/types";
import { proposalPriority } from "../militaryAnalysis/data";
import { BorderNeed } from "../militaryAnalysis/types";
import { ProposalArmyMove } from "./main";

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

function sortBorderAnalysis(borderAnalysis: BorderNeed[]) {
  return borderAnalysis.sort((a, b) => {
    if (b.category !== a.category) {
      return proposalPriority[b.category] - proposalPriority[a.category]; // higher priority first
    }

    return b.deficit - a.deficit; // higher deficit first if priority is equal
  });
}
