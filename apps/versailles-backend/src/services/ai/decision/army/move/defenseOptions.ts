import { reconstructPath } from "../../../algos/bfs";
import { BFSResult } from "../../../types/analyze";
import { getLongOptimisticArmy } from "../../planning/main";
import { createMoveGoal } from "../../planning/moveGoals";
import { AIPlanningState } from "../../planning/types";
import { ArmyGroup, BorderNeed } from "../militaryAnalysis/types";

export function calcAIDefenseMove(
  borderHex: BorderNeed,
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>
) {
  const defenseIntent: { startId: number; endId: number; amount: number }[] = [];

  const hexBFS = borderBFSMap.get(borderHex.hexId);
  if (!hexBFS) return;

  const armySupplyDist: { hexId: number; available: number; path: number[] }[] = [];
  if (borderHex.deficit > 0) {
    console.log("DEFICIT CALC REACHED");
    // use dynamic planning to map over hexes with available army
    for (const [hexId, amount] of planning.availableArmyByHex) {
      if (amount === 0) continue;
      console.log(`Available army in hex ${hexId}:`, amount);
      console.log(`current army in hex:`, borderHex.currentArmy);
      console.log(`deficit in hex`, borderHex.deficit);
      const path = reconstructPath(hexBFS.cameFrom, hexId);
      console.log("PATH", path);
      armySupplyDist.push({ hexId, available: amount, path });
    }
  }
  // start assigning available army from closest supply
  const orderedSupply = armySupplyDist.sort((a, b) => a.path.length - b.path.length);
  for (const supply of orderedSupply) {
    const available = planning.availableArmyByHex.get(supply.hexId) ?? 0;

    const optimisticBorderArmy = getLongOptimisticArmy(planning, borderHex.hexId);

    const remainingDeficit = Math.max(0, borderHex.desiredArmy - optimisticBorderArmy);

    const send = Math.min(available, remainingDeficit);

    // create move goal to remember if path is longer than one tile
    if (supply.path.length > 1 && send > 0) {
      createMoveGoal(planning, supply.path.slice(1), send);
    }
    if (supply.path.length <= 1) continue;

    defenseIntent.push({ startId: supply.hexId, endId: supply.path[1], amount: send });
  }

  return defenseIntent;
}
