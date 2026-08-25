import { GameCtx } from "#trpc/index.js";
import { Building, Hex, Nation } from "@repo/shared";
import { Constructing } from "../analysis/types";

export function getConstructing(ctx: GameCtx, nation: Nation): Constructing[] {
  return ctx.mapHexes
    .filter((h) => h.build_queue && h.owner === nation.id)
    .map((h) => ({
      hexId: h.id,
      category: h.build_queue!.building,
      levels: h.build_queue!.levels,
      progress: h.build_queue!.progress,
    }));
}

// returns all buildings in given list of hexes
export function getHexesBuildings(hexes: Hex[], buildingsById: Map<string, Building>) {
  return hexes
    .map((h) => (h.buildingId ? buildingsById.get(h.buildingId) : undefined))
    .filter((b): b is Building => b !== undefined);
}
