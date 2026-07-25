import { GameCtx } from "#trpc/index.js";
import { reconstructPath } from "../algorithms/bfs";
import { BFSResult } from "../analysis/types";
import { AIMemory } from "../memory/types";
import { getAvailableArmy } from "../world/armies";
import { AIPlanningState, ArmyMoveGoal, AttackTargetPlanning, BuildSavePlanning } from "./types";

export function hydratePlanning(
  ctx: GameCtx,
  nationMemo: AIMemory,
  nationId: string,
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>
) {
  hydrateNationMemo(nationMemo, planning, borderBFSMap);
  hydrateWorldData(ctx, planning, nationId);
}

function hydrateNationMemo(
  nationMemo: AIMemory,
  planning: AIPlanningState,
  borderBFSMap: Map<number, BFSResult>
) {
  planning.buildSaving = getBuildSavingMemo(nationMemo);
  planning.attackTargets = getAttackTargetMemo(nationMemo);
  planning.plannedMoves = getArmyMoveMemo(nationMemo, borderBFSMap);

  return { ok: true };
}

function getBuildSavingMemo(nationMemo: AIMemory) {
  const memo: BuildSavePlanning = new Map();
  for (const saving of nationMemo.buildSaving) {
    memo.set(saving.hexId, {
      category: saving.category,
      targetLevel: saving.targetLevel,
    });
  }

  return memo;
}

function getAttackTargetMemo(nationMemo: AIMemory) {
  const memo: AttackTargetPlanning = new Set();
  for (const target of nationMemo.attackTargets) {
    memo.add(target);
  }

  return memo;
}

function getArmyMoveMemo(nationMemo: AIMemory, borderBFSMap: Map<number, BFSResult>) {
  const memo = new Map<string, ArmyMoveGoal>();

  for (const bfsResult of borderBFSMap.values()) {
    // find all armies in memory, whose destination is current border hex
    const hexMemoMoves = nationMemo.armyMovement.filter((a) => a.endHexId === bfsResult.startHexId);

    for (const move of hexMemoMoves) {
      const path = reconstructPath(bfsResult.cameFrom, move.currHexId);
      if (path === null) continue;

      const id = crypto.randomUUID();
      memo.set(id, {
        id,
        path: path,
        amount: move.amount,
      });
    }
  }

  return memo;
}

// Hydrate nation planning with world data
function hydrateWorldData(ctx: GameCtx, planning: AIPlanningState, nationId: string) {
  planning.availableArmyByHex = getAvailableArmy(ctx, nationId);

  return { ok: true };
}
