import { DeclareWarIntent } from "../../intents/types.js";
import { AIPlanningState } from "../../planning/types.js";
import { getNationArmyFromHex, getNationBorderHexes } from "../../../map.js";
import { GameCtx } from "#trpc/index.js";
import { Nation, findNeighbors, getHexIdMap } from "@repo/shared";
import { createTargets, revalidateTargets } from "./targets";
import { WAR_CONSIDERATION_RATIO } from "./policy";
import { deleteAttackTarget } from "../../planning/goals/attackTargets.js";

export function generateDeclareWarCandidates(
  ctx: GameCtx,
  planning: AIPlanningState,
  nation: Nation
): DeclareWarIntent[] {
  const warIntent: DeclareWarIntent[] = [];
  const addWarIntent = (toNationId: string) => {
    warIntent.push({ id: crypto.randomUUID(), type: "declareWarIntent", score: 0, toNationId });

    deleteAttackTarget(planning, toNationId);

    return { ok: true };
  };

  const hexIdMap = getHexIdMap(ctx);

  // target revalidation and creation
  revalidateTargets(ctx, planning, nation.id);
  createTargets(ctx, planning, nation);

  for (const target of planning.attackTargets) {
    // check if ALL border army hexes meet specific ratio to avg enemy army they border
    const borderHexes = getNationBorderHexes(ctx, nation.id);

    let isReady = true;
    // make sure every hex is properly defended
    for (const borderHex of borderHexes) {
      if (!borderHex.neighborIds.includes(target)) continue;

      const hex = hexIdMap.get(borderHex.hexId);
      if (!hex) continue;

      const neighbors = findNeighbors(hex, ctx.mapHexes);

      // all neighbors that have target army
      const neighborsWithArmy = neighbors.filter((n) => getNationArmyFromHex(n, target) > 0);
      const totalEnemyArmy = neighbors.reduce((acc, n) => {
        const targetArmy = getNationArmyFromHex(n, target);
        return acc + targetArmy;
      }, 0);
      const avgEnemyArmy =
        neighborsWithArmy.length > 0 ? totalEnemyArmy / neighborsWithArmy.length : 0;

      const nationHexArmy = planning.availableArmyByHex.get(hex.id) ?? 0;

      const ratio = nationHexArmy / Math.max(1, avgEnemyArmy);

      if (ratio < WAR_CONSIDERATION_RATIO) isReady = false;
    }

    if (isReady) {
      addWarIntent(target);
    }
  }

  return warIntent;
}
