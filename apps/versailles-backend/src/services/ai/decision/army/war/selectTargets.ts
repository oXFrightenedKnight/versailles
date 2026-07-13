import { getNationNeighbors } from "#services/ai/analyze/main.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { AIPlanningState } from "../../planning/types";
import { getNationArmy } from "#services/genNations.js";

export function createTargets(ctx: GameCtx, planning: AIPlanningState, nation: Nation) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const createdTargets = new Set<string>();

  const createTarget = (nationId: string) => {
    const existing = planning.attackTargets.has(nationId);
    if (existing) return { ok: false };

    planning.attackTargets.add(nationId);
    createdTargets.add(nationId);
    return { ok: true };
  };

  // Create new targets
  for (const neighborId of getNationNeighbors(ctx, nation)) {
    const neighbor = nationIdMap.get(neighborId);
    if (!neighbor) continue;

    // Create target if: weaker army. Priority: more buildings and higher army ratio
    const neighborArmy = getNationArmy(ctx, neighbor.id) ?? 0;
    const ownArmy = getNationArmy(ctx, nation.id) ?? 0;

    const ratio = ownArmy / Math.max(1, neighborArmy);

    if (ratio >= RATIO_THRESHOLD) {
      const attackChance = getAttackChance(ratio);

      if (Math.random() < attackChance) {
        createTarget(neighbor.id);
      }
    }
  }

  return createdTargets;
}

// updates targets to decide if its still worth attacking
export function updateTargets(ctx: GameCtx, planning: AIPlanningState, nation: Nation) {
  const canceled = new Set<string>();

  const cancelAttack = (nationId: string) => {
    if (!planning.attackTargets.has(nationId)) return { ok: false };

    planning.attackTargets.delete(nationId);
    canceled.add(nationId);

    return { ok: true };
  };

  for (const target of planning.attackTargets) {
    const targetArmy = getNationArmy(ctx, target) ?? 0;
    const nationArmy = getNationArmy(ctx, target) ?? 0;

    const ratio = nationArmy / Math.max(1, targetArmy);

    if (ratio <= CANCEL_RATIO) {
      cancelAttack(target);
    }
  }

  return canceled;
}

// returns attack chance based on army ratio
function getAttackChance(ratio: number): number {
  const threshold = RATIO_THRESHOLD;
  const strongRatio = 3;

  if (ratio < threshold) {
    return 0;
  }

  const t = Math.min(1, (ratio - threshold) / (strongRatio - threshold));

  const smoothT = t * t * (3 - 2 * t);

  return 0.2 + (0.95 - 0.2) * smoothT;
}
