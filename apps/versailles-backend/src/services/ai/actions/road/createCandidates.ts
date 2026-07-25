import { buildRoadGraph, hasRoadPath } from "#services/ai/algorithms/bfs.js";
import { getBuildingsShortage } from "#services/ai/analysis/resources.js";
import { BuildRoad } from "#services/ai/intents/types.js";
import { AIPlanningState } from "#services/ai/planning/types.js";
import { getHexIdMap, getHexAxialMap } from "#services/map.js";
import { Point, getNationRoads } from "#services/road.js";
import { GameCtx } from "#trpc/index.js";
import { NATION_RESOURCE, Nation, calculateRoadCost } from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { producingBuildsPath, hasShortageResource } from "./supplyRoute";
import { trySpendBudget } from "#services/ai/budget/ledger.js";
import { availableResourcesInBuildings } from "#services/ai/planning/queries/resources.js";
import { uniqueRoadSegments } from "#services/ai/world/roads.js";

// Make sure to add guardrails so ai doesn't build a road if it already exists
export function generateBuildRoadCandidates(
  ctx: GameCtx,
  planning: AIPlanningState,
  budget: Map<NATION_RESOURCE, number>,
  nation: Nation
): BuildRoad[] {
  const buildRoadIntents: BuildRoad[] = [];
  const submitIntent = (intent: { path: Point[] }) => {
    // subtract budget
    const cost = calculateRoadCost(intent.path.length);

    const success = trySpendBudget(budget, { gold: cost });

    // push intent
    if (success.ok) {
      buildRoadIntents.push({
        id: crypto.randomUUID(),
        score: 0,
        path: intent.path,
        type: "buildRoad",
      });

      // update planning
      planning.buildRoads.add(intent.path);
    } else return { ok: false };
  };

  const buildingShortage = getBuildingsShortage(ctx, nation);

  const availableInBuildings = availableResourcesInBuildings(ctx, planning, nation);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);
  const allowedHexIds = ctx.mapHexes.filter((h) => h.owner === nation.id).map((h) => h.id);

  const nationRoadSegments = getNationRoads(ctx, nation.id);

  for (const build of buildingShortage) {
    // make path to producing buildings from closest to furthest
    const producingNodes = producingBuildsPath(
      ctx,
      build,
      availableInBuildings,
      hexIdMap,
      axialMap,
      allowedHexIds
    );

    // get optimistic roads including submited ones
    const roadPoints = [...nationRoadSegments, ...planning.buildRoads];
    const roadGraph = buildRoadGraph(roadPoints); // build from optimistic

    const available = new Map(
      producingNodes.map(([_, b]) => [b.build.buildingId, { ...b.build.available }])
    );
    const needed = { ...build.shortage };

    // sort by closest
    const sortedNodes = [...producingNodes].sort((a, b) => a[1].path.length - b[1].path.length);

    for (const [_, node] of sortedNodes) {
      const startHex = hexIdMap.get(build.hexId);
      const endHex = hexIdMap.get(node.build.hexId);
      if (!startHex || !endHex) continue;

      if (hasRoadPath(roadGraph, startHex, endHex)) continue;

      const nodeAvailable = available.get(node.build.buildingId);
      if (!nodeAvailable) continue;

      // check if at least one produced resource is needed
      if (!hasShortageResource(needed, nodeAvailable)) continue;

      const newSegments = uniqueRoadSegments(node.path, roadPoints, hexIdMap);

      let ok = true;
      for (const segment of newSegments) {
        const success = submitIntent({ path: segment });
        if (!success || !success.ok) ok = false;
      }

      if (ok) {
        for (const [res, a] of typedEntries(nodeAvailable)) {
          const availableAmount = a ?? 0;
          const neededAmount = needed[res] ?? 0;

          // estimated amount of contract per turn
          const estAmount = Math.max(0, Math.min(availableAmount, neededAmount));

          // update available and needed
          nodeAvailable[res] = availableAmount - estAmount;
          needed[res] = neededAmount - estAmount;
        }
      }
    }
  }

  return buildRoadIntents;
}
