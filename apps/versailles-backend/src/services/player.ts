import { ActionBuckets, getActions, Nation } from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { filterNationMails, markReadMails } from "./mails.js";

// Returns every field by default, unless specified
export function filterPlayerLogic(ctx: GameCtx) {
  const playerNation = ctx.nations.find((n) => n.isPlayer);

  const { modifiers, aiMemory, mails, ...rest } = ctx;

  return {
    ...rest,
    mails: playerNation ? filterNationMails(mails, playerNation.id) : mails,
  };
}

export function updatePlayerUI(ctx: GameCtx, playerActions: ActionBuckets, playerNation: Nation) {
  markReadMails(ctx, getActions(playerActions, "mails.read"), playerNation);
}

export function getPlayerNation(ctx: GameCtx) {
  return ctx.nations.find((nation) => nation.isPlayer);
}
