import { ActionBuckets, getActions, Nation } from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { filterNationMails, markReadMails } from "./mails.js";
import { filterNationHexes } from "./map.js";
import { filterNationRoads } from "./road.js";

// Returns every field by default, unless specified
export function filterPlayerLogic(ctx: GameCtx): Partial<GameCtx> {
  const playerNation = ctx.nations.find((n) => n.isPlayer);

  const { modifiers, aiMemory, mails, mapHexes, roads, ...rest } = ctx;

  return {
    ...rest,
    mails: playerNation ? filterNationMails(mails, playerNation.id) : mails,
    mapHexes: playerNation ? filterNationHexes(mapHexes, playerNation.id) : mapHexes,
    roads: playerNation ? filterNationRoads(roads, playerNation.id) : roads,
  };
}

export function updatePlayerUI(ctx: GameCtx, playerActions: ActionBuckets, playerNation: Nation) {
  markReadMails(ctx, getActions(playerActions, "mails.read"), playerNation);
}

export function getPlayerNation(ctx: GameCtx) {
  return ctx.nations.find((nation) => nation.isPlayer);
}
