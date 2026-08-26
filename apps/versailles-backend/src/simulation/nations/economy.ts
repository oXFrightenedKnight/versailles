import { adjustNationResource } from "#simulation/resources/production";
import { GameCtx } from "#trpc";
import { BASE_GOLD_INCOME } from "@repo/shared/nations";

// adds base gold to every nation each turn to allow for self sustain
export function addBaseNationGold(ctx: GameCtx) {
  for (const nation of ctx.nations) {
    if (nation.isDefeated) continue;

    adjustNationResource(nation, "gold", BASE_GOLD_INCOME);
  }
}
