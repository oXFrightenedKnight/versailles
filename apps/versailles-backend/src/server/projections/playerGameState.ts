import { filterNationMails } from "#simulation/mails/visibility";
import { filterNationRoads } from "#simulation/roads/visibility";
import { filterNationHexes } from "#simulation/world/map/visibility";
import { GameCtx } from "#trpc";

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
