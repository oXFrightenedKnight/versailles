import { Nation } from "@repo/shared";
import { ActionBuckets, getActions } from "@repo/shared/actions";
import { markReadMails } from "./mails/commands";
import { GameCtx } from "#trpc";

export function updatePlayerUI(ctx: GameCtx, playerActions: ActionBuckets, playerNation: Nation) {
  markReadMails(ctx, getActions(playerActions, "mails.read"), playerNation);
}

export function getPlayerNation(ctx: GameCtx) {
  return ctx.nations.find((nation) => nation.isPlayer);
}
