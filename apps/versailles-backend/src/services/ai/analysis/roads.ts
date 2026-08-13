import { GameCtx } from "#trpc/index.js";
import { calculateRoadCost, getHexAxialMap, getHexIdMap, Nation } from "@repo/shared";
import { getProducingBuildings } from "../world/resources";
import { getBuildingsShortage } from "./resources";
import { producingBuildsPath } from "../actions/road/supplyRoute";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { getNationById } from "#services/genNations.js";

export function calcNeededRoadCost(ctx: GameCtx, nationId: string) {
  const nation = getNationById(ctx, nationId);
  if (!nation) return 0;

  const buildingShortage = getBuildingsShortage(ctx, nation);

  const producingBuildings = getProducingBuildings(ctx, nation);

  const allowedHexIds = ctx.mapHexes.filter((h) => h.owner === nation.id).map((h) => h.id);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);

  let totalRoadCost = 0;

  for (const building of buildingShortage) {
    const shortage = new Map(
      typedEntries(building.shortage).map(([resource, amount]) => [resource, amount ?? 0])
    );

    const producingNodes = producingBuildsPath(
      ctx,
      building,
      producingBuildings,
      hexIdMap,
      axialMap,
      allowedHexIds
    );

    const sortedNodes = [...producingNodes].sort((a, b) => a[1].path.length - b[1].path.length);

    for (const [, node] of sortedNodes) {
      if ([...shortage.values()].every((needed) => needed <= 0)) {
        break;
      }

      let pathIsNeeded = false;

      for (const [resource, available] of typedEntries(node.build.available)) {
        const needed = shortage.get(resource);

        if (available === undefined || needed === undefined || needed <= 0) {
          continue;
        }

        const supplied = Math.min(available, needed);

        if (supplied > 0) {
          pathIsNeeded = true;
          shortage.set(resource, needed - supplied);
        }
      }

      // Charge this path once, even if it supplies multiple resources.
      if (pathIsNeeded) {
        totalRoadCost += calculateRoadCost(node.path.length);
      }
    }
  }

  return totalRoadCost;
}
