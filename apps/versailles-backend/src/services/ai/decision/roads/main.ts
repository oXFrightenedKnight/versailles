import { WorldAnalysis } from "#services/ai/types/analyze.js";
import { BuildRoad } from "#services/ai/types/intent.js";
import { GameCtx } from "#trpc/index.js";
import {
  BUILDINGS,
  calculateRoadCost,
  estimateConsumption,
  findBuildingNameByCategory,
  getHexByAxial,
  Hex,
  Nation,
  RESOURCES,
  Road,
  SupplyContract,
  typeNationResource,
} from "@repo/shared";
import { getHexesBuildings } from "../helpers";
import { calculateResourceOutput, getNationBuildings } from "#services/buildings.js";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { AIPlanningState } from "../planning/types";
import { bfs, reconstructPath } from "#services/ai/algos/bfs.js";
import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import { BuildingProductionNode } from "./types";
import {
  getNationRoads,
  getSharedRoadEdges,
  getTrimmedRoadSegments,
  Point,
} from "#services/road.js";
import { subtractBudget } from "../budget/main";

// Make sure to add guardrails so ai doesn't build a road if it already exists
export function generateBuildRoadCandidates(
  ctx: GameCtx,
  planning: AIPlanningState,
  budget: Map<typeNationResource, number>,
  nation: Nation
): BuildRoad[] {
  const buildRoadIntents: BuildRoad[] = [];

  const buildingShortage = getBuildingsShortage(ctx, nation);

  // UPDATE TO INCLUDE OCCUPIED RESOURCES BY PLANNING
  const producingBuildings = getProducingBuildings(ctx, nation);

  const hexIdMap = getHexIdMap(ctx);
  const axialMap = getHexAxialMap(ctx);
  const allowedHexIds = ctx.mapHexes.filter((h) => h.owner === nation.id).map((h) => h.id);

  const nationRoads = getNationRoads(ctx, nation.id);

  // make sure this is called as a function so contract creation can access it
  // run bfs from shortaged building hex

  for (const build of buildingShortage) {
    const cameFrom = bfs({ ctx, startHexId: build.hexId, hexIdMap, axialMap, allowedHexIds });

    // reconstruct path to all producing buildings for each shortage resource
    const produceNodeMap = new Map<number, { build: BuildingProductionNode; path: number[] }>();

    for (const producing of producingBuildings) {
      // skip if this building does not produce any low-supply resource
      if (
        !typedEntries(producing.available).some(
          ([res, _]) => build.shortage[res] && build.shortage[res] > 0
        )
      )
        continue;

      const path = reconstructPath(cameFrom, producing.hexId);
      produceNodeMap.set(producing.hexId, { build: producing, path });
    }

    // sort by closest
    const sortedNodes = [...produceNodeMap].sort((a, b) => a[1].path.length - b[1].path.length);

    // get optimistic roads including submited ones
    const roadPoints = getRoadsPoints(nationRoads, planning);

    // trim duplicate segments and submit as individual nodes
    for (const node of sortedNodes) {
      const newSegments = uniqueRoadSegments(node[1].path, roadPoints, hexIdMap);

      for (const segment of newSegments) {
        // apply budget and submit (+planning)
        const cost = calculateRoadCost(segment.length);

        const success = subtractBudget(budget, { gold: cost });

        if (success.ok) {
          buildRoadIntents.push();
        }
      }
    }
  }

  return buildRoadIntents;
}

// return all buildings of nation with resource shortage object
export function getBuildingsShortage(ctx: GameCtx, nation: Nation) {
  const buildShortage: {
    hexId: number;
    buildingId: string;
    shortage: Partial<Record<RESOURCES, number>>;
  }[] = [];

  const hexBuildingMap = new Map(
    ctx.mapHexes.flatMap((h) => (h.buildingId !== null ? [[h.buildingId, h] as const] : []))
  );
  const contractMap = new Map<string, SupplyContract[]>();

  const nationBuildings = getNationBuildings(ctx, nation);

  for (const building of nationBuildings) {
    if (!building.contracts) continue;

    for (const contract of building.contracts) {
      const existing = contractMap.get(contract.buildingId) ?? [];

      contractMap.set(contract.buildingId, [...existing, contract]);
    }
  }

  for (const building of nationBuildings) {
    const hex = hexBuildingMap.get(building.id);
    if (!hex) continue;

    const required = estimateConsumption({ building, mapHexes: ctx.mapHexes });
    if (!required) continue;

    const contracts = contractMap.get(building.id) ?? [];

    // incoming per turn
    const incoming: Partial<Record<RESOURCES, number>> = {};
    for (const c of contracts) {
      const existing = incoming[c.resource] ?? 0;
      const perTurn = c.amount > 0 ? c.amount / (c.hexIds.length - 1) : 0;

      incoming[c.resource] = existing + perTurn;
    }

    const shortage: Partial<Record<RESOURCES, number>> = {};
    for (const [resource, amount] of typedEntries(required)) {
      const incomingResource = incoming[resource] ?? 0;
      const requiredResource = amount ?? 0;
      shortage[resource] = Math.max(0, requiredResource - incomingResource);
    }

    buildShortage.push({ hexId: hex.id, buildingId: building.id, shortage });
  }

  return buildShortage;
}

// returns available resource in producing buildings
export function getProducingBuildings(ctx: GameCtx, nation: Nation) {
  const buildShortage: {
    hexId: number;
    buildingId: string;
    available: Partial<Record<RESOURCES, number>>;
  }[] = [];

  const hexBuildingMap = new Map(
    ctx.mapHexes.flatMap((h) => (h.buildingId !== null ? [[h.buildingId, h] as const] : []))
  );

  const nationBuildings = getNationBuildings(ctx, nation);

  for (const building of nationBuildings) {
    const hex = hexBuildingMap.get(building.id);
    if (!hex) continue;

    const name = findBuildingNameByCategory({
      buildingCategory: building.category,
      level: building.level,
    });

    const producing: Partial<Record<RESOURCES, number>> = {};

    for (const resource of BUILDINGS[name].producing ?? []) {
      producing[resource] = calculateResourceOutput(hex, resource);
    }

    // exporting
    const exporting: Partial<Record<RESOURCES, number>> = {};
    for (const c of building.contracts ?? []) {
      const existing = exporting[c.resource] ?? 0;
      const perTurn = c.amount > 0 ? c.amount / (c.hexIds.length - 1) : 0;

      exporting[c.resource] = existing + perTurn;
    }

    const available: Partial<Record<RESOURCES, number>> = {};
    for (const [resource, amount] of typedEntries(producing)) {
      const sent = exporting[resource] ?? 0;
      const produced = amount ?? 0;
      available[resource] = Math.max(0, produced - sent);
    }

    buildShortage.push({ hexId: hex.id, buildingId: building.id, available });
  }

  return buildShortage;
}

export function getRoadsPoints(roads: Road[], planning: AIPlanningState): Point[][] {
  const roadPoints = roads.map((r) => r.points.flatMap((p) => ({ q: p.q, r: p.r })));

  return [...roadPoints, ...planning.buildRoads];
}

// returns non-overlapping road segments
function uniqueRoadSegments(path: number[], roadsPoints: Point[][], hexIdMap: Map<number, Hex>) {
  const pointPath: Point[] = path.flatMap((p) => {
    const hex = hexIdMap.get(p);
    return hex ? [{ q: hex.q, r: hex.r }] : [];
  });

  // get all shared edges of this road with other
  const shared = new Set<string>();

  for (const points of roadsPoints) {
    const edges = getSharedRoadEdges(pointPath, points);
    edges.forEach((e) => shared.add(e));
  }

  return getTrimmedRoadSegments(pointPath, shared);
}
