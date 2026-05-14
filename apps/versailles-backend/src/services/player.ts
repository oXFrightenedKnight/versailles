import { MODIFIER, Nation } from "@repo/shared";
import { GameCtx, IntentInput } from "../trpc/index.js";
import { filterNationMails, markReadMails } from "./mails.js";

export function filterPlayerLogic(ctx: GameCtx) {
  const playerNation = ctx.nations.find((n) => n.isPlayer);
  if (!playerNation) return null;

  return {
    ...ctx,

    mails: filterNationMails(ctx.mails, playerNation.id),

    modifiers: [] as MODIFIER[],
  };
}

export function updatePlayerUI(ctx: GameCtx, intentCtx: IntentInput, playerNation: Nation) {
  markReadMails(ctx, intentCtx.readMails, playerNation);
}
