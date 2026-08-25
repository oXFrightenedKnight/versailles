import { GameCtx } from "#trpc/index.js";
import { Hex, BASE_RESOURCE } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { BuildingConsumptionNode, BuildingProductionNode } from "./types";
import { bfs, reconstructPath } from "../../../algorithms/bfs.js";

// returns path to reachable closest buildings that produce any shortage resource of this build
export function producingBuildsPath(
  ctx: GameCtx,
  building: BuildingConsumptionNode,
  availableInBuildings: BuildingProductionNode[],
  hexIdMap: Map<number, Hex>,
  axialMap: Map<string, Hex>,
  allowedHexIds: number[]
) {
  const cameFrom = bfs({ ctx, startHexId: building.hexId, hexIdMap, axialMap, allowedHexIds });

  // reconstruct path to all producing buildings for each shortage resource
  const produceNodeMap = new Map<number, { build: BuildingProductionNode; path: number[] }>();

  for (const producing of availableInBuildings) {
    // skip if this building does not produce any low-supply resource
    if (
      !typedEntries(producing.available).some(
        ([res, _]) => building.shortage[res] && building.shortage[res] > 0
      )
    )
      continue;

    const path = reconstructPath(cameFrom, producing.hexId);
    if (path === null) continue;

    produceNodeMap.set(producing.hexId, { build: producing, path });
  }

  return [...produceNodeMap];
}

// retruns boolean based on whether producing node has at least one shortage resource available
export function hasShortageResource(
  shortage: Partial<Record<BASE_RESOURCE, number>>,
  available: Partial<Record<BASE_RESOURCE, number>>
) {
  if (
    typedEntries(available).some(([res, amount]) => (shortage[res] ?? 0) > 0 && (amount ?? 0) > 0)
  )
    return true;

  return false;
}
