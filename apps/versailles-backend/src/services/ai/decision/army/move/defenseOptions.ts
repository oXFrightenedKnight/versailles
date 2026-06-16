import { reconstructPath } from "../../../algos/bfs";
import { BFSResult } from "../../../types/analyze";
import { getAvailableArmyForPriority, getLongOptimisticArmy } from "../../planning/main";
import { createMoveGoal } from "../../planning/moveGoals";
import { AIPlanningState } from "../../planning/types";
import { ArmyGroup, BorderNeed } from "../militaryAnalysis/types";

export function calcAIDefenseMove(
  borderHex: BorderNeed,
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>
) {
  const defenseIntent: { path: number[]; amount: number }[] = [];

  const hexBFS = borderBFSMap.get(borderHex.hexId);
  if (!hexBFS) return;

  const armySupplyDist: { hexId: number; available: number; path: number[] }[] = [];
  if (borderHex.deficit > 0) {
    // use dynamic planning to map over hexes with available army
    for (const [hexId, _] of planning.availableArmyByHex) {
      const availableArmyInHex = getAvailableArmyForPriority(planning, hexId, borderHex.priority);
      if (availableArmyInHex === 0) continue;
      console.log(`Available army in hex ${hexId}:`, availableArmyInHex);
      console.log(`current army in hex:`, borderHex.currentArmy);
      console.log(`deficit in hex`, borderHex.deficit);
      const path = reconstructPath(hexBFS.cameFrom, hexId);
      console.log("PATH", path);
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
