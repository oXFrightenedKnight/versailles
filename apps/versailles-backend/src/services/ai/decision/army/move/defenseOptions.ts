import { reconstructPath } from "../../../algos/bfs";
import { BFSResult } from "../../../types/analyze";
import { ArmyGroup, BorderNeed } from "../../../types/intent";
import { createMoveGoal, getOptimisticArmyAtHex } from "../../planning/main";
import { AIPlanningState } from "../../planning/types";

export function calcAIDefenseMove(
  borderHex: BorderNeed,
  armySupplyPoints: ArmyGroup[],
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>
) {
  const defenseIntent: { startId: number; endId: number; amount: number }[] = [];

  const hexBFS = borderBFSMap.get(borderHex.hexId);
  if (!hexBFS) return;

  const armySupplyDist: { hexId: number; available: number; path: number[] }[] = [];
  if (borderHex.deficit > 0) {
    for (const army of armySupplyPoints) {
      const path = reconstructPath(hexBFS.cameFrom, army.hexId);
      armySupplyDist.push({ hexId: army.hexId, available: army.availableAmount, path });
    }
  }
  // start assigning available army from closest supply
  const orderedSupply = armySupplyDist.sort((a, b) => a.path.length - b.path.length);
  for (const supply of orderedSupply) {
    const available = planning.availableArmyByHex.get(supply.hexId) ?? 0;

    const optimisticBorderArmy = getOptimisticArmyAtHex(planning, borderHex.hexId);

    const remainingDeficit = Math.max(0, borderHex.desiredArmy - optimisticBorderArmy);

    const send = Math.min(available, remainingDeficit);

    // create move goal to remember if path is longer than one tile
    if (supply.path.length > 1) {
      createMoveGoal(planning, supply.path.splice(0, 1), send);
    }

    defenseIntent.push({ startId: supply.hexId, endId: supply.path[1], amount: send });
  }

  return defenseIntent;
}
