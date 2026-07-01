import {
  BUILDINGS,
  calculateExportAmount,
  findBuildingNameByCategory,
  getBuilding,
  getHexByAxial,
  Nation,
  resources,
  RESOURCES,
  ServerContractUpdate,
  startDijkstrasAlgo,
  SupplyContract,
} from "@repo/shared";
import { GameCtx } from "../trpc/index.js";
import { getBuildingsByIdMap } from "./ai/decision/helpers.js";
import { buildRoadGraph, buildRoadPath } from "./ai/algos/bfs.js";
import { getNationRoads, pointKey, pointsToHexIds } from "./road.js";
import { getHexAxialMap } from "./map.js";

export type newContract = {
  startBuildingId: string;
  endBuildingId: string;
  amount: number;
  resource: RESOURCES;
  autoAdjust: boolean;
};

export function createContracts({
  contracts,
  gameCtx,
  nation,
}: {
  contracts: newContract[];
  gameCtx: GameCtx;
  nation: Nation;
}) {
  const { mapHexes, buildings, roads } = gameCtx;

  const axialMap = getHexAxialMap(gameCtx);

  // check whether starting building is allowed to have contracts
  for (const contract of contracts) {
    if (!resources.includes(contract.resource)) continue;

    const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
    const startingHex = mapHexes.find((h) => h.buildingId === contract.startBuildingId);
    const endHex = mapHexes.find((h) => h.buildingId === contract.endBuildingId);
    const endBuilding = getBuilding({ buildings, id: contract.endBuildingId });
    if (!startBuilding || !endHex?.buildingId || !startingHex || !endHex || !endBuilding) continue;
    if (startingHex.owner !== nation.id || endHex.owner !== nation.id) continue;

    // -- VALIDATION --
    // check if building produces anything to export
    const startName = findBuildingNameByCategory({
      buildingCategory: startBuilding?.category,
      level: startBuilding.level,
    });
    if (!startName) continue;
    if (!BUILDINGS[startName].producing || BUILDINGS[startName].producing.length === 0) continue;

    // check if destination is allowed to store that resource
    const endName = findBuildingNameByCategory({
      buildingCategory: endBuilding.category,
      level: endBuilding.level,
    });
    if (!endName) continue;

    const canStore = BUILDINGS[endName].storageCap?.[contract.resource];

    if (!canStore || canStore <= 0) continue;

    // check if these two buildings already have a contract with the same resource
    const buildingContracts = startBuilding.contracts ?? [];

    const sameContract = buildingContracts.find(
      (c) => c.buildingId === endBuilding.id && c.resource === contract.resource
    );
    if (sameContract) continue;

    // --- CREATE ---
    const prevContracts = startBuilding.contracts ?? [];
    const points = startDijkstrasAlgo({ startingHex: startingHex, endHex, mapHexes, roads });
    if (!points) continue;

    if (pointKey(points[0]) !== pointKey({ q: startingHex.q, r: startingHex.r })) continue;
    const last = points.at(-1);
    if (last && pointKey(last) !== pointKey({ q: endHex.q, r: endHex.r })) continue;

    if (!resources.includes(contract.resource)) continue;

    startBuilding.contracts = [
      ...prevContracts,
      {
        id: crypto.randomUUID(),
        buildingId: endHex.buildingId,
        amount: contract.amount,
        resource: contract.resource,
        progress: 0,
        autoAdjust: contract.autoAdjust,
        metadata: {
          lastAmountSent: 0,
        },
        usedPath: pointsToHexIds(points, axialMap),
      },
    ];
  }
}

// double check
export function executeContracts(ctx: GameCtx) {
  // find all buildings with contracts
  const contractBuildings = ctx.buildings.filter((b) => b.contracts);

  const buildingHexMap = new Map(ctx.mapHexes.map((h) => [h.buildingId, h]));
  const axialMap = getHexAxialMap(ctx);

  for (const startBuilding of contractBuildings) {
    const hex = buildingHexMap.get(startBuilding.id);
    if (!hex || !hex.owner) continue;

    const nationRoads = getNationRoads(ctx, hex.owner);
    const graph = buildRoadGraph(nationRoads);

    // add progress to existing contracts
    if (!startBuilding.contracts) continue;
    for (const contract of startBuilding.contracts) {
      const endHex = buildingHexMap.get(contract.buildingId);
      if (!endHex) continue;

      const path = buildRoadPath(ctx.mapHexes, graph, hex, endHex);
      if (!path || path.length <= 0) continue;

      const dist = path.length - 1;
      contract.progress += 1 / dist;

      if (contract.progress >= 1) {
        const endBuilding = getBuilding({ buildings: ctx.buildings, id: contract.buildingId });
        if (!endBuilding) continue;

        const startResourceStore = startBuilding.storage?.find((s) => s.type === contract.resource);
        const endResourceStore = endBuilding.storage?.find((s) => s.type === contract.resource);
        if (!endResourceStore || !startResourceStore) continue;

        const destName = findBuildingNameByCategory({
          buildingCategory: endBuilding.category,
          level: endBuilding.level,
        });
        if (!destName) continue;

        const amount = Math.min(startResourceStore.amount, contract.amount);

        const endResourceMax = BUILDINGS[destName].storageCap[contract.resource] ?? 0;

        // amount of resource that will be actually sent
        const outForDelivery = Math.min(amount, endResourceMax - endResourceStore.amount);

        startResourceStore.amount -= outForDelivery;
        endResourceStore.amount += outForDelivery;

        contract.progress = 0;

        contract.metadata.lastAmountSent = outForDelivery;

        // update last used path
        contract.usedPath = pointsToHexIds(path, axialMap);
      }
    }
  }
}

export function recalculateContractsAmounts(ctx: GameCtx) {
  const buildingHexMap = new Map(ctx.mapHexes.map((h) => [h.buildingId, h]));

  const contractBuildinds = ctx.buildings.filter((b) => b.contracts !== undefined);
  for (const building of contractBuildinds) {
    const startHex = buildingHexMap.get(building.id);
    if (!startHex || !startHex.owner) continue;

    const roadSegments = getNationRoads(ctx, startHex.owner);
    const graph = buildRoadGraph(roadSegments);

    for (const contract of building.contracts!) {
      if (!contract.autoAdjust) continue; // only recalculate with auto-adjust
      const endHex = buildingHexMap.get(contract.buildingId);
      const endBuilding = getBuilding({ buildings: ctx.buildings, id: contract.buildingId });
      if (!endHex || !endBuilding) continue;

      // RE-CALCULATE amount AND path every time executing contract
      const startPoint = { q: startHex.q, r: startHex.r };
      const endPoint = { q: endHex.q, r: endHex.r };

      const path = buildRoadPath(ctx.mapHexes, graph, startPoint, endPoint);
      if (!path || path.length <= 0) continue;

      const amount = calculateExportAmount({
        startBuilding: building,
        endBuilding,
        length: path.length - 1,
        resource: contract.resource,
        mapHexes: ctx.mapHexes,
        buildings: ctx.buildings,
      });

      if (!amount) continue;

      contract.amount = amount;
    }
  }
}

export function updateContracts(
  ctx: GameCtx,
  updateIntent: ServerContractUpdate[],
  nation: Nation
) {
  const buildings = ctx.buildings.filter((b) => b.contracts);
  const hexBuildingMap = new Map(
    ctx.mapHexes.filter((h) => h.buildingId).map((h) => [h.buildingId!, h])
  );
  const contractMap = new Map(
    buildings.flatMap((b) => b.contracts!.map((c) => [c.id, { building: b, contract: c }]))
  ); // contractId: { building, contract }

  for (const contractUpdate of updateIntent) {
    if (contractUpdate.changes.resource && !resources.includes(contractUpdate.changes.resource))
      continue;
    const contractObj = contractMap.get(contractUpdate.contractId);

    if (!contractObj) continue;
    const hex = hexBuildingMap.get(contractObj.building.id);
    if (!hex || hex.owner !== nation.id) continue;

    // update contract
    Object.assign(contractObj.contract, contractUpdate.changes, {
      progress: 0,
    });
  }
}

// cancel army training by the object id
export function deleteContracts(ctx: GameCtx, deleteIds: string[], nation: Nation) {
  const buildings = ctx.buildings.filter((b) => b.contracts);
  const hexBuildingMap = new Map(
    ctx.mapHexes.filter((h) => h.buildingId).map((h) => [h.buildingId!, h])
  );
  const contractMap = new Map(
    buildings.flatMap((b) => b.contracts!.map((c) => [c.id, { building: b, contract: c }]))
  ); // contractId: { building, contract }

  for (const id of deleteIds) {
    const contractObj = contractMap.get(id);
    if (!contractObj) continue;

    const { building, contract } = contractObj;
    const hex = hexBuildingMap.get(building.id);
    if (!hex || hex.owner !== nation.id) continue;

    // delete contract
    const contracts = building.contracts;
    if (!contracts) continue;

    const idx = contracts.indexOf(contract);

    if (idx !== -1) {
      contracts.splice(idx, 1);
    }
  }
}

export function hasContract(
  ctx: GameCtx,
  fromBuildingId: string,
  toBuildingId: string,
  resource: RESOURCES
) {
  const buildingIdMap = getBuildingsByIdMap(ctx);

  const fromBuilding = buildingIdMap.get(fromBuildingId);
  const toBuilding = buildingIdMap.get(toBuildingId);

  if (!fromBuilding || !toBuilding) return false;

  if (
    fromBuilding.contracts &&
    fromBuilding.contracts.find((c) => c.buildingId === toBuildingId && c.resource === resource)
  )
    return true;

  return false;
}

export function getContractPerTurn(contract: SupplyContract) {
  const distance = contract.usedPath.length - 1;
  if (contract.amount <= 0 || distance <= 0) return 0;

  return contract.amount / distance;
}
