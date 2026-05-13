import { MODIFIER } from "@repo/shared/data/modifiers.js";
import { GameCtx } from "../trpc/index.js";
import { filterNationMails } from "./mails.js";

export function filterPlayerLogic(ctx: GameCtx) {
  const playerNation = ctx.nations.find((n) => n.isPlayer);
  if (!playerNation) return null;

  return {
    ...ctx,

    mails: filterNationMails(ctx.mails, playerNation.id),

    modifiers: [] as MODIFIER[],
  };
}
