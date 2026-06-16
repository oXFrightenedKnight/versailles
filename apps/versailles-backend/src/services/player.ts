import { Nation } from "@repo/shared";
import { GameCtx, IntentInput } from "../trpc/index.js";
import { filterNationMails, markReadMails } from "./mails.js";

// Returns every field by default, unless specified
export function filterPlayerLogic(ctx: GameCtx) {
  const playerNation = ctx.nations.find((n) => n.isPlayer);
  if (!playerNation) return null;

  const { modifiers, aiMemory, mails, ...rest } = ctx;

  return {
    ...rest,
    mails: filterNationMails(mails, playerNation.id),
  };
}

export function updatePlayerUI(ctx: GameCtx, intentCtx: IntentInput, playerNation: Nation) {
  markReadMails(ctx, intentCtx.readMails, playerNation);
}
