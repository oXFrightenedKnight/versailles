import { ContractIntent } from "#services/ai/types/intent.js";
import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import { GameCtx } from "#trpc/index.js";
import { Nation, RESOURCES } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { getBuildingsShortage, getProducingBuildings, producingBuildsPath } from "../roads/main";
import { getNationRoads } from "#services/road.js";
import { buildRoadGraph, hasRoadPath } from "#services/ai/algos/bfs.js";
import { hasContract } from "#services/contracts.js";

export function generateContractCandidates(ctx: GameCtx, nation: Nation): ContractIntent[] {
  const contractIntents: ContractIntent[] = [];
  const submitIntent = (fromBuildingId: string, toBuildingId: string, resource: RESOURCES) => {
    // push intent
    contractIntents.push({
      type: "contractIntent",
      id: crypto.randomUUID(),
      score: 0,
      fromBuildingId,
      toBuildingId,
      resource,
    });

    return { ok: true };
  };

  const shortageBuilds = getBuildingsShortage(ctx, nation);

  const producingBuilds = getProducingBuildings(ctx, nation);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);
  const allowedHexIds = ctx.mapHexes.filter((h) => h.owner === nation.id).map((h) => h.id);

  // dynamically subtract available resource from buildings when creating contracts
  for (const build of shortageBuilds) {
    const needed = build.shortage;

    // this will not work because you only need buildings that have valid road path to this building
    const producingNodes = producingBuildsPath(
      ctx,
      build,
      producingBuilds,
      hexIdMap,
      axialMap,
      allowedHexIds
    );
    const roadSegments = getNationRoads(ctx, nation.id);
    const roadGraph = buildRoadGraph(roadSegments);

    const available = new Map(
      producingNodes.map(([_, b]) => [b.build.buildingId, { ...b.build.available }])
    );
    const fulfilled = new Map<RESOURCES, number>();

    const sortedNodes = producingNodes.sort((a, b) => a[1].path.length - b[1].path.length);

    for (const [resource, a] of typedEntries(needed)) {
      const amount = a ?? 0;

      for (const [_, node] of sortedNodes) {
        // check if there is a road path
        const startHex = hexIdMap.get(build.hexId);
        const endHex = hexIdMap.get(node.build.hexId);
        if (!endHex || !startHex) continue;

        if (!hasRoadPath(roadGraph, startHex, endHex)) continue;
        if (hasContract(ctx, node.build.buildingId, build.buildingId, resource)) continue;

        const nodeAvailable = available.get(node.build.buildingId);
        if (!nodeAvailable) continue;

        const availableResource = nodeAvailable[resource];
        if (!availableResource || availableResource <= 0) continue;

        const resourceFulfilled = fulfilled.get(resource) ?? 0;
        const amountNeeded = amount - resourceFulfilled;

        // stop searching if resource shortage was fulfilled
        if (resourceFulfilled >= amount) break;

        const submit = submitIntent(node.build.buildingId, build.buildingId, resource);

        if (submit.ok) {
          // update fulfilled and available

          // find estimated contract amount
          const estAmount = Math.max(0, Math.min(availableResource, amountNeeded));

          nodeAvailable[resource] = availableResource - estAmount;
          fulfilled.set(resource, resourceFulfilled + estAmount);
        }
      }
    }
  }

  return contractIntents;
}
