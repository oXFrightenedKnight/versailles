import { GameCtx } from "#trpc/index.js";
import { Nation } from "@repo/shared";
import { getProducingBuildings } from "../world/resources";
import { getBuildingsShortage } from "./resources";
import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import { producingBuildsPath } from "../actions/road/supplyRoute";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { getNationById } from "#services/genNations.js";

export function calcNeededRoadSegments(ctx: GameCtx, nationId: string) {
  const nation = getNationById(ctx, nationId);
  if (!nation) return 0;

  const buildingShortage = getBuildingsShortage(ctx, nation);

  const producingBuildings = getProducingBuildings(ctx, nation);

  const allowedHexIds = ctx.mapHexes.filter((h) => h.owner === nation.id).map((h) => h.id);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);

  let totalRoadLength = 0;

  for (const building of buildingShortage) {
    const shortage = new Map(
      typedEntries(building.shortage).map(([res, shortage]) => [res, shortage ?? 0])
    );

    const producingNodes = producingBuildsPath(
      ctx,
      building,
      producingBuildings,
      hexIdMap,
      axialMap,
      allowedHexIds
    );
    // sort by closest
    const sortedNodes = [...producingNodes].sort((a, b) => a[1].path.length - b[1].path.length);

    for (const [_, node] of sortedNodes) {
      if ([...shortage].every(([_, needed]) => needed === 0)) break;
      for (const [res, available] of typedEntries(node.build.available)) {
        const currShortage = shortage.get(res);

        if (available === undefined || currShortage === undefined) continue;

        shortage.set(res, Math.max(0, currShortage - available));
        totalRoadLength += node.path.length;
      }
    }
  }

  return totalRoadLength;
}
