// this file contains battle outcome consequnce logic

import { setDefeated } from "#simulation/nations/mutations";
import { GameCtx } from "#trpc";

export function checkDefeated(ctx: GameCtx, nationId: string) {
  const nation = ctx.nations.find((n) => n.id === nationId);
  if (!nation) return { defeated: false };

  const leftHexes = ctx.mapHexes.filter((h) => h.owner === nationId);
  if (leftHexes.length <= 0) {
    setDefeated(ctx, nation);
    return { defeated: true };
  }

  return { defeated: false };
}
