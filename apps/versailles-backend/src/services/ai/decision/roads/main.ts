import { bfs, buildRoadGraph, hasRoadPath, reconstructPath } from "#services/ai/algos/bfs.js";
import { BuildRoad } from "#services/ai/types/intent.js";
import { calculateResourceOutput, getNationBuildings } from "#services/buildings.js";
import { getHexAxialMap, getHexIdMap } from "#services/map.js";
import {
  getNationRoads,
  getSharedRoadEdges,
  getSlicedRoadSegments,
  Point,
} from "#services/road.js";
import { GameCtx } from "#trpc/index.js";
import {
  BUILDINGS,
  calculateRoadCost,
  estimateConsumption,
  findBuildingNameByCategory,
  Hex,
  Nation,
  RESOURCES,
  SupplyContract,
  typeNationResource,
} from "@repo/shared";
import { typedEntries } from "@repo/shared/helpers/tsHelpers";
import { subtractBudget } from "../budget/main";
import { AIPlanningState, ResourceRecord } from "../planning/types";
import { BuildingConsumptionNode, BuildingProductionNode } from "./types";
import { getContractPerTurn } from "#services/contracts.js";

// Make sure to add guardrails so ai doesn't build a road if it already exists
export function generateBuildRoadCandidates(
  ctx: GameCtx,
  planning: AIPlanningState,
  budget: Map<typeNationResource, number>,
  nation: Nation
): BuildRoad[] {
  const buildRoadIntents: BuildRoad[] = [];
  const submitIntent = (intent: { path: Point[] }) => {
    // subtract budget
    const cost = calculateRoadCost(intent.path.length);

    const success = subtractBudget(budget, { gold: cost });

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

  const availableInBuildings = availableResourceBuildings(ctx, planning, nation);

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
      const perTurn = getContractPerTurn(c);

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
      const perTurn = getContractPerTurn(c);

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

  return getSlicedRoadSegments(pointPath, shared);
}

// returns all resources available by producing buildings including planning
export function availableResourceBuildings(
  ctx: GameCtx,
  planning: AIPlanningState,
  nation: Nation
) {
  const producing = getProducingBuildings(ctx, nation);

  const updated: BuildingProductionNode[] = [];
  for (const building of producing) {
    const occupied = planning.occupiedResources.get(building.buildingId);

    if (!occupied) {
      updated.push(building);
      continue;
    }

    const resources: ResourceRecord = {};

    typedEntries(building.available).forEach(([res, available]) => {
      if (!available) return;

      const occupiedRes = occupied[res] ?? 0;
      const freeRes = Math.max(available - occupiedRes, 0);
      resources[res] = freeRes;
    });

    updated.push({ ...building, available: resources });
  }

  return updated;
}

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
  shortage: Partial<Record<RESOURCES, number>>,
  available: Partial<Record<RESOURCES, number>>
) {
  if (
    typedEntries(available).some(([res, amount]) => (shortage[res] ?? 0) > 0 && (amount ?? 0) > 0)
  )
    return true;

  return false;
}
