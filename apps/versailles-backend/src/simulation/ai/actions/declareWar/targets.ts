// this file generates targets for future ai attacks

import { AIPlanningState } from "../../planning/types.js";
import { getNationNeighbors } from "../../world/nations.js";
import { getNationArmy } from "../../../genNations.js";
import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { getWarInitiationChance, CANCEL_RATIO, WAR_CONSIDERATION_RATIO } from "./policy";
import {
  addAttackTarget,
  deleteAttackTarget,
  hasAttackTarget,
} from "../../planning/goals/attackTargets.js";

export function createTargets(ctx: GameCtx, planning: AIPlanningState, nation: Nation) {
  const nationIdMap = new Map(ctx.nations.map((n) => [n.id, n]));

  const createdTargets = new Set<string>();

  const createTarget = (nationId: string) => {
    const existing = hasAttackTarget(planning, nationId);
    if (existing) return { ok: false };

    addAttackTarget(planning, nationId);
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

    if (ratio >= WAR_CONSIDERATION_RATIO) {
      const attackChance = getWarInitiationChance(ratio);

      if (Math.random() < attackChance) {
        createTarget(neighbor.id);
      }
    }
  }

  return createdTargets;
}

// revalidates targets to decide if its still worth attacking
export function revalidateTargets(ctx: GameCtx, planning: AIPlanningState, nationId: string) {
  const canceled = new Set<string>();

  const cancelAttack = (nationId: string) => {
    if (!hasAttackTarget(planning, nationId)) return { ok: false };

    deleteAttackTarget(planning, nationId);
    canceled.add(nationId);

    return { ok: true };
  };

  for (const target of planning.attackTargets) {
    const targetArmy = getNationArmy(ctx, target) ?? 0;
    const nationArmy = getNationArmy(ctx, nationId) ?? 0;

    const ratio = nationArmy / Math.max(1, targetArmy);

    if (ratio <= CANCEL_RATIO) {
      cancelAttack(target);
    }
  }

  return canceled;
}
