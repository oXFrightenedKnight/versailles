import { getBuildingsShortage } from "../../analysis/resources.js";
import { trySpendBudget } from "../../budget/ledger.js";
import { BuildRoad } from "../../intents/types.js";
import { createPlanningRoadIntent } from "../../planning/mutations/roads.js";
import { availableResourcesInBuildings } from "../../planning/queries/resources.js";
import { AIPlanningState } from "../../planning/types.js";
import { uniqueRoadSegments } from "../../world/roads.js";
import { buildRoadGraph, hasRoadPath } from "../../../algorithms/bfs.js";
import { producingBuildsPath, hasShortageResource } from "#simulation/ai/actions/road/supplyRoute";
import { getNationRoads } from "#simulation/roads/queries";
import { GameCtx } from "#trpc";
import { Nation } from "@repo/shared";
import { getHexIdMap, getHexAxialMap } from "@repo/shared/map";
import { NATION_RESOURCE } from "@repo/shared/resources";
import { Point, calculateRoadCost } from "@repo/shared/roads";
import { typedEntries } from "@repo/shared/utils";

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
      createPlanningRoadIntent(planning, intent.path);
      return { ok: true };
    } else return { ok: false };
  };

  const buildingShortage = getBuildingsShortage(ctx, nation);

  const availableInBuildings = availableResourcesInBuildings(ctx, planning, nation);
  console.log(`available in buildings:`, availableInBuildings);

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
    console.log(`${nation.id} needed for ${build.hexId}:`, needed);

    // sort by closest
    const sortedNodes = [...producingNodes].sort((a, b) => a[1].path.length - b[1].path.length);

    for (const [_, node] of sortedNodes) {
      const startHex = hexIdMap.get(build.hexId);
      const endHex = hexIdMap.get(node.build.hexId);
      if (!startHex || !endHex) continue;

      if (hasRoadPath(roadGraph, startHex, endHex)) continue;

      const nodeAvailable = available.get(node.build.buildingId);
      if (!nodeAvailable) continue;

      console.log(`node available at ${node.build.hexId}`, nodeAvailable.wheat, nodeAvailable.wood);
      // check if at least one produced resource is needed
      if (!hasShortageResource(needed, nodeAvailable)) continue;

      console.log("passed has shortage resource check");

      const newSegments = uniqueRoadSegments(node.path, roadPoints, hexIdMap);
      console.log(`${nation.id} new segments:`, newSegments);

      let ok = true;
      for (const segment of newSegments) {
        const success = submitIntent({ path: segment });
        console.log(`${nation.id} road segment submission successful:`, segment, success.ok);
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
